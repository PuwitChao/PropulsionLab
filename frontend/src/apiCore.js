export const DEFAULT_REQUEST_TIMEOUT_MS = 60000

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'request_failed', requestId = null, retryable = false, cause } = {}) {
    super(message, cause ? { cause } : undefined)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.requestId = requestId
    this.retryable = retryable
  }
}

const responseRequestId = (response) => response.headers?.get?.('X-Request-ID') || null

const errorFromResponse = async (response) => {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    // HTML/text error bodies are normalized to the status-based message below.
  }

  const statusText = response.statusText ? ` ${response.statusText}` : ''
  const message = typeof payload?.message === 'string'
    ? payload.message
    : typeof payload?.detail === 'string'
      ? payload.detail
      : `API request failed (${response.status}${statusText}).`

  return new ApiError(message, {
    status: response.status,
    code: payload?.error_code || 'http_error',
    requestId: payload?.request_id || responseRequestId(response),
    retryable: response.status === 408 || response.status === 429 || response.status >= 500,
  })
}

const request = async (url, options = {}, responseType = 'json', fetchImpl = globalThis.fetch) => {
  const {
    timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
    signal: callerSignal,
    ...fetchOptions
  } = options
  const timeout = Number.isFinite(timeoutMs) && timeoutMs > 0
    ? timeoutMs
    : DEFAULT_REQUEST_TIMEOUT_MS
  const controller = new AbortController()
  let timedOut = false
  const abortFromCaller = () => controller.abort()

  if (callerSignal) {
    if (callerSignal.aborted) {
      throw new ApiError('The request was cancelled.', { code: 'request_aborted', retryable: true })
    }
    callerSignal.addEventListener('abort', abortFromCaller, { once: true })
  }

  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeout)

  try {
    const response = await fetchImpl(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(fetchOptions.headers || {}),
      },
    })

    if (!response.ok) {
      throw await errorFromResponse(response)
    }

    if (responseType === 'blob') {
      return response.blob()
    }
    if (response.status === 204) {
      return null
    }

    try {
      return await response.json()
    } catch (error) {
      throw new ApiError('The service returned an invalid response.', {
        status: response.status,
        code: 'invalid_response',
        requestId: responseRequestId(response),
        cause: error,
      })
    }
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }
    if (timedOut) {
      throw new ApiError('The request timed out. Please retry.', {
        code: 'request_timeout',
        retryable: true,
        cause: error,
      })
    }
    if (error?.name === 'AbortError') {
      throw new ApiError('The request was cancelled.', {
        code: 'request_aborted',
        retryable: true,
        cause: error,
      })
    }
    throw new ApiError('Unable to reach the propulsion analysis service. Please retry.', {
      code: 'network_error',
      retryable: true,
      cause: error,
    })
  } finally {
    clearTimeout(timeoutId)
    callerSignal?.removeEventListener('abort', abortFromCaller)
  }
}

export const requestData = (url, options = {}, fetchImpl = globalThis.fetch) =>
  request(url, options, 'json', fetchImpl)

export const requestBlob = (url, options = {}, fetchImpl = globalThis.fetch) =>
  request(url, options, 'blob', fetchImpl)
