import axios from 'axios';

// Create axios instance with base URL from env
export const api = axios.create({
  baseURL: process.env.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to inject auth token if available
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      // Clear local storage and redirect to login page
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API function types
export interface ApiError {
  status: number;
  message: string;
  details?: any;
}

// Transactions API
export const transactionsApi = {
  getTransactions: (page = 1, limit = 10, filters?: any) => 
    api.get('/transactions', { params: { page, limit, ...filters } }),
  
  getTransaction: (id: string) => 
    api.get(`/transactions/${id}`),
};

// Rules API
export const rulesApi = {
  getRules: () => 
    api.get('/rules'),
  
  createRule: (rule: any) => 
    api.post('/rules', rule),
  
  updateRule: (id: string, rule: any) => 
    api.put(`/rules/${id}`, rule),
  
  deleteRule: (id: string) => 
    api.delete(`/rules/${id}`),
};

// Dashboard API
export const dashboardApi = {
  getMetrics: () => 
    api.get('/metrics/dashboard'),
};

// Settings API
export const settingsApi = {
  getSettings: () => 
    api.get('/settings'),
  
  updateSettings: (settings: any) => 
    api.put('/settings', settings),
}; 