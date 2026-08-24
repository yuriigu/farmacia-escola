import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Attach JWT token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    let token = Cookies.get('auth_token');
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token') || undefined;
    }

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Format errors and handle 401
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError<{ error?: string; message?: string }>) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Clear auth on invalid/expired token if not on login/register page
        if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
          Cookies.remove('auth_token', { path: '/' });
          Cookies.remove('user_role', { path: '/' });
          Cookies.remove('user_info', { path: '/' });
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
    }

    const errorMessage =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Erro ao processar requisição';

    return Promise.reject(new Error(errorMessage));
  }
);

export default apiClient;
