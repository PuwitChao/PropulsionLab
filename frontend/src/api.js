// VITE_API_URL can be set at build time (e.g. VITE_API_URL=https://api.example.com npm run build).
// Falls back to localhost for local dev.
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Extracts a human-readable error message without assuming the error body is JSON
// (an empty or HTML 500 response would otherwise throw a second, confusing error).
const raiseForStatus = async (response) => {
  let detail = `API request failed (${response.status} ${response.statusText})`;
  try {
    const error = await response.json();
    if (error?.detail) detail = error.detail;
  } catch {
    /* non-JSON error body — keep the status-based message */
  }
  throw new Error(detail);
};

export const fetchData = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) await raiseForStatus(response);

  return response.json();
};

export const fetchBlob = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) await raiseForStatus(response);

  return response.blob();
};

export default API_BASE_URL;
