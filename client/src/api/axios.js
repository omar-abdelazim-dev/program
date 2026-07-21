import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Echoes the non-httpOnly csrfToken cookie (set on login/register) back as a
// header on every request, so the backend's double-submit CSRF check passes.
api.interceptors.request.use((config) => {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  if (match) {
    config.headers['X-CSRF-Token'] = decodeURIComponent(match[1]);
  }
  return config;
});

// A 401 mid-session (expired/invalidated cookie) previously surfaced as a
// generic inline error wherever the request happened to be made. Any
// /auth/* endpoint is excluded — a login failure or the initial "am I
// logged in" check on app load are expected 401s, not session expiry, and
// already have their own handling.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isAuthEndpoint = (error.config?.url || '').includes('/auth/');
    if (status === 401 && !isAuthEndpoint && !window.location.pathname.startsWith('/auth')) {
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export default api;
