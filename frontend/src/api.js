export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const FETCH_TIMEOUT_MS = 30000;

async function _fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function _parseError(response) {
  const ct = response.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try {
      const body = await response.json();
      return body.detail || body.message || `HTTP ${response.status}`;
    } catch {
      // fall through
    }
  }
  return `HTTP ${response.status} ${response.statusText}`;
}

export const fetchData = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await _fetchWithTimeout(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    throw new Error(await _parseError(response));
  }

  return response.json();
};

export const fetchBlob = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await _fetchWithTimeout(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (!response.ok) {
    throw new Error(await _parseError(response));
  }

  return response.blob();
};

export default API_BASE_URL;
