import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const CSRF_COOKIE = 'buzzforge_csrf';
const CSRF_HEADER = 'x-csrf-token';

const getCsrfToken = () => {
  const match = document.cookie.split('; ').find((row) => row.startsWith(`${CSRF_COOKIE}=`));
  return match ? match.split('=')[1] : null;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Attach CSRF token to all state-changing requests
api.interceptors.request.use((config) => {
  const method = (config.method || '').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers[CSRF_HEADER] = token;
    }
  }
  return config;
});

// Automatically attempt one token refresh on 401 responses, then retry
let isRefreshing = false;
let pendingRequests = [];

const processQueue = (error) => {
  pendingRequests.forEach((cb) => cb(error));
  pendingRequests = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loops: don't retry refresh/logout/login calls
    const isAuthEndpoint = originalRequest.url && (
      originalRequest.url.includes('/refresh') ||
      originalRequest.url.includes('/logout') ||
      originalRequest.url.includes('/login') ||
      originalRequest.url.includes('/register')
    );

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingRequests.push((err) => {
            if (err) {
              reject(err);
            } else {
              resolve(api(originalRequest));
            }
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await api.post('/users/refresh');
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
