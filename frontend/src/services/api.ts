import axios, { AxiosInstance, AxiosResponse } from 'axios';

// Use backend URL, not frontend
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Type definitions
type UserRole = 'user' | 'admin';

interface LoginResponse {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  location: string;
  location_code: string;
  role: UserRole;
}

interface UserResponse {
  id: number;
  email: string;
  name: string;
  phone_number: string;
  location: string;
  location_code: string;
  role: UserRole;
}

interface ProductionRecordPayload {
  user_id: number;
  publication_id: number | null;
  custom_publication_name?: string;
  po_number: number;
  color_pages: number;
  bw_pages: number;
  total_pages: number;
  machine_id: number;
  lprs_time: string;
  page_start_time: string;
  page_end_time: string;
  downtime_entries: Array<{
    downtime_reason_id: number;
    downtime_duration: string;
  }>;
  newsprint_id: number | null;
  plate_consumption: number;
  remarks: string;
  record_date: string;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
  error?: string;
}

interface Master {
  id: number;
  name: string;
  code: string;
}

interface Publication extends Master {}
interface Machine extends Master {}

interface DowntimeReason extends Master {
  reason: string;
}

interface NewsprintType extends Master {}

// Auth API
export const authAPI = {
  login: (email: string, password: string): Promise<AxiosResponse<LoginResponse>> =>
    api.post<LoginResponse>('/auth/login', { email, password }),
  logout: (): Promise<AxiosResponse<{ message: string }>> =>
    api.post('/auth/logout'),
  getUser: (id: number): Promise<AxiosResponse<UserResponse>> =>
    api.get<UserResponse>(`/auth/user/${id}`),
};

// Master Data API
export const masterAPI = {
  getPublications: (): Promise<AxiosResponse<ApiResponse<Publication[]>>> =>
    api.get<ApiResponse<Publication[]>>('/master/publications'),
  getMachines: (): Promise<AxiosResponse<ApiResponse<Machine[]>>> =>
    api.get<ApiResponse<Machine[]>>('/master/machines'),
  getDowntimeReasons: (): Promise<AxiosResponse<ApiResponse<DowntimeReason[]>>> =>
    api.get<ApiResponse<DowntimeReason[]>>('/master/downtime-reasons'),
  getNewsprintTypes: (): Promise<AxiosResponse<ApiResponse<NewsprintType[]>>> =>
    api.get<ApiResponse<NewsprintType[]>>('/master/newsprint-types'),
  getLocations: (): Promise<AxiosResponse<string[]>> =>
    api.get<string[]>('/master/locations'),
};

// Production API
export const productionAPI = {
  createRecord: async (payload: ProductionRecordPayload): Promise<ApiResponse<any>> => {
    const response = await api.post<ApiResponse<any>>('/production/records', payload);
    return response.data;
  },

  getRecords: (): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/records'),

  getFilteredRecords: (
    startDate: string,
    endDate: string,
    location?: string,
    publication_id?: number,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/records/filter', {
      params: {
        startDate,
        endDate,
        location,
        publication_id,
      },
    }),

  getPODistribution: (
    startDate: string,
    endDate: string,
    location?: string,
    publication_id?: number,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/analytics/po-distribution', {
      params: {
        startDate,
        endDate,
        location,
        publication_id,
      },
    }),

  getMachineUsage: (
    startDate: string,
    endDate: string,
    location?: string,
    publication_id?: number,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/analytics/machine-usage', {
      params: {
        startDate,
        endDate,
        location,
        publication_id,
      },
    }),

  getLPRSTrend: (
    startDate: string,
    endDate: string,
    location?: string,
    publication_id?: number,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/analytics/lprs-trend', {
      params: {
        startDate,
        endDate,
        location,
        publication_id,
      },
    }),

  getNewsprintConsumption: (
    startDate: string,
    endDate: string,
    location?: string,
    publication_id?: number,
  ): Promise<AxiosResponse<ApiResponse<unknown>>> =>
    api.get<ApiResponse<unknown>>('/production/analytics/newsprint-consumption', {
      params: {
        startDate,
        endDate,
        location,
        publication_id,
      },
    }),

  // New analytics methods for AdminDashboard
  getPoAnalytics: (
    publicationId: number,
    startDate: string,
    endDate: string,
    location?: string,
  ): Promise<AxiosResponse<any>> =>
    api.get('/production/analytics/po', {
      params: {
        publication_id: publicationId,
        start_date: startDate,
        end_date: endDate,
        location,
      },
    }),

  getMachineAnalytics: (
    publicationId: number,
    startDate: string,
    endDate: string,
    location?: string,
  ): Promise<AxiosResponse<any>> =>
    api.get('/production/analytics/machine', {
      params: {
        publication_id: publicationId,
        start_date: startDate,
        end_date: endDate,
        location,
      },
    }),

  getLprsAnalytics: (
    publicationId: number,
    startDate: string,
    endDate: string,
    location?: string,
  ): Promise<AxiosResponse<any>> =>
    api.get('/production/analytics/lprs', {
      params: {
        publication_id: publicationId,
        start_date: startDate,
        end_date: endDate,
        location,
      },
    }),

  getNewsprintAnalytics: (
    publicationId: number,
    startDate: string,
    endDate: string,
    location?: string,
  ): Promise<AxiosResponse<any>> =>
    api.get('/production/analytics/newsprint', {
      params: {
        publication_id: publicationId,
        start_date: startDate,
        end_date: endDate,
        location,
      },
    }),

  getNewsprintKgsAnalytics: (publicationId: number, startDate: string, endDate: string, location?: string) =>
    api.get('/production/analytics/newsprint-kgs', {
      params: { 
        publication_id: publicationId, 
        start_date: startDate, 
        end_date: endDate, 
        location 
      }
    }),

    getRecordsByUser: (userId: number) =>
    api.get(`/production/records/user/${userId}`),
    updateRecord: (recordId: number, payload: ProductionRecordPayload) =>
    api.put(`/production/records/${recordId}`, payload),

  deleteRecord: (recordId: number) =>
    api.delete(`/production/records/${recordId}`),

  getMachineDowntimeAnalytics: (publicationId: number, startDate: string, endDate: string, location?: string) =>
    api.get('/production/analytics/machine-downtime', {
      params: { 
        publication_id: publicationId, 
        start_date: startDate, 
        end_date: endDate, 
        location 
      }
    }),
};

export default api;