import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://ethiopos-backend.onrender.com/api';

const API = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

console.log('API Base URL:', API_URL);

// Request interceptor - only add token if it exists
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
API.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    if (error.response?.status === 401) {
      // Only redirect to login for protected routes, not for QR orders
      const isPublicRoute = error.config.url.includes('/qr-order') || 
                           error.config.url.includes('/track') ||
                           error.config.url.includes('/products');
      if (!isPublicRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;