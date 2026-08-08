import test from 'node:test'
import assert from 'node:assert/strict'

import { ApiError, requestBlob, requestData } from './apiCore.js'

const jsonResponse = (payload, init = {}) => new Response(JSON.stringify(payload), {
  headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  ...init,
})

test('normalizes non-JSON HTTP failures', async () => {
  const fetchImpl = async () => new Response('<html>bad gateway</html>', {
    status: 502,
    statusText: 'Bad Gateway',
    headers: { 'X-Request-ID': 'gateway-42' },
  })

  await assert.rejects(
    () => requestData('https://example.test/failure', {}, fetchImpl),
    (error) => {
      assert.ok(error instanceof ApiError)
      assert.equal(error.code, 'http_error')
      assert.equal(error.status, 502)
      assert.equal(error.requestId, 'gateway-42')
      assert.match(error.message, /502 Bad Gateway/)
      return true
    },
  )
})

test('returns JSON and blob payloads unchanged', async () => {
  const payload = { status: 'ok', value: 42 }
  assert.deepEqual(
    await requestData('https://example.test/data', {}, async () => jsonResponse(payload)),
    payload,
  )

  const blob = await requestBlob(
    'https://example.test/blob',
    {},
    async () => new Response('mesh-data', { status: 200 }),
  )
  assert.equal(await blob.text(), 'mesh-data')
})

test('normalizes invalid JSON responses', async () => {
  await assert.rejects(
    () => requestData(
      'https://example.test/invalid',
      {},
      async () => new Response('not-json', { status: 200 }),
    ),
    (error) => {
      assert.equal(error.code, 'invalid_response')
      assert.match(error.message, /invalid response/i)
      return true
    },
  )
})

test('aborts requests that exceed the bounded timeout', async () => {
  const fetchImpl = (_url, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true })
  })

  await assert.rejects(
    () => requestData('https://example.test/slow', { timeoutMs: 10 }, fetchImpl),
    (error) => {
      assert.equal(error.code, 'request_timeout')
      assert.equal(error.retryable, true)
      return true
    },
  )
})

test('honors caller cancellation', async () => {
  const controller = new AbortController()
  controller.abort()

  await assert.rejects(
    () => requestData('https://example.test/cancelled', { signal: controller.signal }, async () => {
      throw new Error('fetch should not run')
    }),
    (error) => {
      assert.equal(error.code, 'request_aborted')
      return true
    },
  )
})
