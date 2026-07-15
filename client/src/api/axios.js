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

export default api;
