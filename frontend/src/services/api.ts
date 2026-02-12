import axios, { AxiosInstance } from 'axios';

// ✅ HARDCODED for now - frontend running on 3000, backend on 5001
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

// Debug: Log the API base URL
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 process.env.REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to every request
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses without auto-logout on error
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (email: string, password: string) =>
    axiosInstance.post('/auth/login', { email, password }),
  logout: () => axiosInstance.post('/auth/logout'),
  getCurrentUser: () => axiosInstance.get('/auth/me'),
};

// Master Data API
export const masterAPI = {
  getPublications: (type?: string) =>
    axiosInstance.get('/master/publications', { params: { type } }),
  getMachines: () => axiosInstance.get('/master/machines'),
  getNewsprintTypes: () => axiosInstance.get('/master/newsprint-types'),
  getDowntimeReasons: () => axiosInstance.get('/master/downtime-reasons'),
  getLocations: () => axiosInstance.get('/master/locations'),
  
  // CRUD operations for publications
  createPublication: (data: any) =>
    axiosInstance.post('/master/publications', data),
  updatePublication: (id: number, data: any) =>
    axiosInstance.put(`/master/publications/${id}`, data),
  deletePublication: (id: number) =>
    axiosInstance.delete(`/master/publications/${id}`),
};

export const productionAPI = {
  // Create and read operations
  createRecord: (data: any) => axiosInstance.post('/production/records', data),
  getRecords: (filters?: any) => axiosInstance.get('/production/records', { params: filters }),
  getRecordsByUser: (userId: number) => 
    axiosInstance.get(`/production/records/user/${userId}`),
  
  // Update and delete operations
  updateRecord: (recordId: number, data: any) =>
    axiosInstance.put(`/production/records/${recordId}`, data),
  deleteRecord: (recordId: number) =>
    axiosInstance.delete(`/production/records/${recordId}`),
  
  // Analytics endpoints
  getAnalyticsPO: (params: any) => axiosInstance.get('/production/analytics/po', { params }),
  getAnalyticsPrintOrders: (params: any) => axiosInstance.get('/production/analytics/print-orders', { params }),
  getAnalyticsMachine: (params: any) =>
    axiosInstance.get('/production/analytics/machine', { params }),
  getAnalyticsMachineDetailed: (params: any) =>
    axiosInstance.get('/production/analytics/machine-detailed', { params }),
  getAnalyticsLPRS: (params: any) => axiosInstance.get('/production/analytics/lprs', { params }),
  getAnalyticsNewsprint: (params: any) =>
    axiosInstance.get('/production/analytics/newsprint', { params }),
  getAnalyticsNewsprintKgs: (params: any) =>
    axiosInstance.get('/production/analytics/newsprint-kgs', { params }),
  getAnalyticsPlateConsumption: (params: any) =>
    axiosInstance.get('/production/analytics/plate-consumption', { params }),
  getAnalyticsDowntime: (params: any) =>
    axiosInstance.get('/production/analytics/machine-downtime', { params }),
  getAnalyticsDowntimeByMachine: (params: any) =>
    axiosInstance.get('/production/analytics/downtime-by-machine', { params }),
  getAnalyticsPrintDuration: (params: any) =>
    axiosInstance.get('/production/analytics/print-duration', { params }),
  getAnalyticsWastes: (params: any) =>
    axiosInstance.get('/production/analytics/wastes', { params }),
  getDowntimeDetails: (reasonId: number, params: any) =>
    axiosInstance.get(`/production/analytics/downtime-details/${reasonId}`, { params }),
};

export default axiosInstance;
