import axios from 'axios';

const api = axios.create({
  // Use the local proxy in development, but use the Render backend URL in production
  baseURL: import.meta.env.PROD ? 'https://financial-hce1.onrender.com/api' : '/api',
  timeout: 30000,
});

// Request interceptor – attach token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – handle 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
