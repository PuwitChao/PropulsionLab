// VITE_API_URL can be set at build time (e.g. VITE_API_URL=https://api.example.com npm run build).
// Falls back to localhost for local dev.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
import { ApiError, DEFAULT_REQUEST_TIMEOUT_MS, requestBlob, requestData } from './apiCore'

    /* non-JSON error body — keep the status-based message */




export { ApiError, DEFAULT_REQUEST_TIMEOUT_MS }
export const fetchData = (endpoint, options = {}) =>
  requestData(`${API_BASE_URL}${endpoint}`, options)
export const fetchBlob = (endpoint, options = {}) =>
  requestBlob(`${API_BASE_URL}${endpoint}`, options)
export default API_BASE_URL;
