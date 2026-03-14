'use client';

import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { clearAuthToken, getAuthorizationHeaderValue, getValidSession } from '@/services/authService';
import { extractErrorMessage } from '@/utils/errorHandler';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Các endpoint không cần token
const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/verify-otp',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/resend-otp',
];

function isPublicEndpoint(url?: string): boolean {
  if (!url) return false;
  return PUBLIC_ENDPOINTS.some((p) => url.includes(p));
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Gắn token cho mọi request
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      // Bỏ qua check session cho public endpoints
      if (isPublicEndpoint(config.url)) {
        return config;
      }

      const session = getValidSession();

      if (!session) {
        // Token hết hạn — redirect về login
        if (!window.location.pathname.startsWith('/login')) {
          clearAuthToken();
          window.location.href = '/login';
        }
        return Promise.reject(new Error('No valid session')) as any;
      }

      config.headers = config.headers ?? {};
      (config.headers as Record<string, string>).Authorization =
        `${session.tokenType} ${session.token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Xử lý response errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }

    // Bỏ qua lỗi do request interceptor cancel
    if (!error.response) {
      const msg = (error as any)?.message;
      if (msg === 'No valid session') {
        return Promise.reject(error);
      }
      toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = extractErrorMessage(error);
    const serverMessage =
      (error.response?.data as { message?: string } | undefined)?.message;

    if (status === 401) {
      clearAuthToken();
      toast.error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    if (status === 403) {
      const session = getValidSession();
      console.warn('[403] Forbidden. Roles:', session?.user?.roleCodes);
      console.warn('[403] URL:', (error.config as any)?.url);
      toast.error('Bạn không có quyền thực hiện thao tác này.');
    } else if (status === 404) {
      toast.error('Không tìm thấy tài nguyên yêu cầu.');
    } else if (status !== undefined && status >= 500) {
      toast.error(serverMessage || 'Lỗi hệ thống. Vui lòng thử lại sau.');
    } else if (message) {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

export default api;