// src/api.js — Single source of truth for backend URL and authentication
const BASE_URL = 'http://localhost:8000';

let authToken = sessionStorage.getItem('queuecare_staff_token') || null;
let authStaff = null;
try {
  authStaff = JSON.parse(sessionStorage.getItem('queuecare_staff_user') || 'null');
} catch {
  authStaff = null;
}

let onAuthErrorCallback = null;

export function setAuthToken(token, staff) {
  authToken = token;
  authStaff = staff;
  if (token) {
    sessionStorage.setItem('queuecare_staff_token', token);
    sessionStorage.setItem('queuecare_staff_user', JSON.stringify(staff));
  } else {
    sessionStorage.removeItem('queuecare_staff_token');
    sessionStorage.removeItem('queuecare_staff_user');
  }
}

export function getAuthToken() {
  return authToken;
}

export function getAuthStaff() {
  return authStaff;
}

export function setOnAuthError(callback) {
  onAuthErrorCallback = callback;
}

/** Generic fetch with automatic auth header and 401 interception */
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };

  // Attach token if present and not explicitly omitted
  if (authToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    // If authenticated request failed with 401, trigger logout
    if (authToken && onAuthErrorCallback) {
      setAuthToken(null, null);
      onAuthErrorCallback();
    }
    const err = await res.json().catch(() => ({ detail: 'Authentication token required or expired' }));
    throw new Error(err.detail || 'Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export const apiGet = (path) => apiFetch(path);

export const apiPost = (path, body) => apiFetch(path, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const apiPatch = (path, body) => apiFetch(path, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export { BASE_URL };
