import axios from 'axios';
import { API_BASE_URL } from '../config';

// The API is on its own domain (api.rksone.qenbel.site); in `vite dev` this is '/api' (proxied)
const baseURL = API_BASE_URL;

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('rks_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  const shop = localStorage.getItem('rks_activeShop');
  if (shop) {
    if (config.method?.toUpperCase() === 'GET') {
      config.params = { shop, ...config.params };
    } else if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.data = { shop, ...config.data };
    }
  }

  return config;
});

// Handle 401 globally — redirect to login, EXCEPT when we are actually trying to log in
let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      // If we are on login or refresh failed, just reject
      if (originalRequest.url === '/auth/login' || originalRequest.url === '/auth/refresh') {
        return Promise.reject(err);
      }

      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('rks_refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        if (window.location.pathname !== '/login') {
          localStorage.removeItem('rks_token');
          localStorage.removeItem('rks_user');
          window.location.href = '/login';
        }
        return Promise.reject(err);
      }

      try {
        const { data } = await axios.post(baseURL + '/auth/refresh', { token: refreshToken });
        const newToken = data.data.token;
        const newRefreshToken = data.data.refreshToken;
        
        localStorage.setItem('rks_token', newToken);
        localStorage.setItem('rks_refreshToken', newRefreshToken);
        
        api.defaults.headers.common['Authorization'] = 'Bearer ' + newToken;
        originalRequest.headers['Authorization'] = 'Bearer ' + newToken;
        
        processQueue(null, newToken);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        if (window.location.pathname !== '/login') {
          localStorage.removeItem('rks_token');
          localStorage.removeItem('rks_refreshToken');
          localStorage.removeItem('rks_user');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(err);
  }
);
export default api;

