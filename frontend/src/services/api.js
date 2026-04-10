/**
 * API service using Axios for HTTP requests.
 * Handles authentication token injection and error handling.
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getStreetViewUrl = (propertyId) =>
  `${API_BASE_URL}/properties/${propertyId}/streetview.jpg`;

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getCurrentUser: () => api.get('/auth/me'),
  googleAuth: (code) => api.post('/auth/google', { code }),
};

export const propertiesAPI = {
  search: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  getAnalysis: (id, params) => api.get(`/properties/${id}/analysis`, { params }),
  getExplanation: (id, params) => api.get(`/properties/${id}/explain`, { params }),
};

export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
};

export const favoritesAPI = {
  getAll: () => api.get('/favorites'),
  add: (propertyId) => api.post('/favorites', { property_id: propertyId }),
  remove: (favoriteId) => api.delete(`/favorites/${favoriteId}`),
};

export const chatAPI = {
  send: (message, history = [], propertyId = null) =>
    api.post('/chat', { message, history, property_id: propertyId }),
};

export default api;
