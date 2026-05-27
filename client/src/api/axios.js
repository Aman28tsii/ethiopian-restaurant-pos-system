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

// RETRY LOGIC - MAX 3 retries on network errors
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Response interceptor with retry logic
API.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response, code } = error;
    
    // Don't retry if config doesn't exist or retry already attempted
    if (!config || config._retryCount === undefined) {
      if (config) config._retryCount = 0;
    }

    // Retry conditions: network errors (ECONNABORTED, ERR_NETWORK) or server errors (500+)
    const shouldRetry = (
      (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || !response) ||
      (response && response.status >= 500)
    ) && config._retryCount < MAX_RETRIES;

    if (shouldRetry) {
      config._retryCount += 1;
      console.log(`Retrying request (${config._retryCount}/${MAX_RETRIES})...`);
      
      // Exponential backoff
      const delay = RETRY_DELAY * Math.pow(2, config._retryCount - 1);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      return API(config);
    }
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      const isPublicRoute = error.config?.url?.includes('/qr-order') || 
                           error.config?.url?.includes('/track') ||
                           error.config?.url?.includes('/products');
      if (!isPublicRoute) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export default API;