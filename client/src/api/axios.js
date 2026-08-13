import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Echoes the non-httpOnly csrfToken cookie (set on login/register) back as a
// header on every request, so the backend's double-submit CSRF check passes.
api.interceptors.request.use((config) => {
  const match = document.cookie.match(/(?:^|; )csrfToken=([^;]*)/);
  if (match) {
    config.headers["X-CSRF-Token"] = decodeURIComponent(match[1]);
  }
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    const isAuthEndpoint = (originalRequest.url || "").includes("/auth/");

    if (status === 401 && !isAuthEndpoint && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            return api(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          (import.meta.env.VITE_API_URL || "http://localhost:5050/api") +
            "/auth/refresh",
          {},
          { withCredentials: true },
        );
        isRefreshing = false;
        processQueue(null);
        return api(originalRequest);
      } catch (err) {
        isRefreshing = false;
        processQueue(err, null);
        if (!window.location.pathname.startsWith("/auth")) {
          window.location.href = "/auth";
        }
        return Promise.reject(err);
      }
    }

    if (
      status === 401 &&
      !isAuthEndpoint &&
      !window.location.pathname.startsWith("/auth")
    ) {
      window.location.href = "/auth";
    }

    return Promise.reject(error);
  },
);

export default api;
