import axios from 'axios';

export const getBaseApiUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined' && window.location?.hostname) {
    if (window.location.hostname.includes('vercel.app')) {
      return 'https://system-gaday.vercel.app/api';
    }
    return `http://${window.location.hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

export const getServerUrl = () => {
  return getBaseApiUrl().replace(/\/api\/?$/, '');
};

const API_URL = getBaseApiUrl();

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds timeout for AI Vision & OCR tasks
});

// Request Interceptor: attach token automatically to all outgoing requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: handle 401/403 session expirations centrally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      console.warn('[API Interceptor] Auth error detected (401/403). Clearing session...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login if not already on login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
