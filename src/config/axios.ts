'use client';

import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { clearAuthToken, getAuthorizationHeaderValue } from '@/services/authService';
import { extractErrorMessage } from '@/utils/errorHandler';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

// Endpoints không cần token
const PUBLIC_ENDPOINTS = [
  '/auth/login', '/auth/verify-otp', '/auth/forgot-password',
  '/auth/reset-password', '/auth/resend-otp',
];

// Endpoints silent — KHÔNG hiện toast khi lỗi (polling background)
const SILENT_ENDPOINTS = [
  '/receiving-sessions/',  // polling getSession mỗi 3s
  '/locations',            // MANAGER only — KEEPER sẽ 403, không toast
  '/zones',                // MANAGER only — KEEPER sẽ 403, không toast
];

function isPublicEndpoint(url?: string) {
  return PUBLIC_ENDPOINTS.some(p => url?.includes(p));
}

function isSilentEndpoint(url?: string) {
  return SILENT_ENDPOINTS.some(p => url?.includes(p));
}

// Dedup toast — tránh hiện cùng message nhiều lần liên tiếp
const recentToasts = new Map<string, number>();
function dedupToast(type: 'error' | 'success', message: string) {
  const key = `${type}:${message}`;
  const last = recentToasts.get(key) ?? 0;
  if (Date.now() - last < 3000) return; // bỏ qua nếu đã hiện trong 3s
  recentToasts.set(key, Date.now());
  if (type === 'error') toast.error(message);
  else toast.success(message);
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Request interceptor — gắn token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined' && !isPublicEndpoint(config.url)) {
      const authHeader = getAuthorizationHeaderValue();
      if (authHeader) {
        config.headers = config.headers ?? {};
        (config.headers as Record<string, string>).Authorization = authHeader;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error),
);

// Response interceptor — xử lý lỗi
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (typeof window === 'undefined') return Promise.reject(error);

    const url = (error.config as any)?.url ?? '';
    const silent = isSilentEndpoint(url);
    const status = error.response?.status;
    const serverMessage = (error.response?.data as any)?.message as string | undefined;
    const message = serverMessage || extractErrorMessage(error);

    // 401 — chỉ redirect nếu KHÔNG phải background polling
    if (status === 401) {
      if (!silent) {
        clearAuthToken();
        dedupToast('error', 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
      return Promise.reject(error);
    }

    // Silent endpoints: không hiện toast
    if (silent) return Promise.reject(error);

    if (!error.response) {
      // Network error — không hiện nếu là SSE disconnect bình thường
      if (url.includes('/stream')) return Promise.reject(error);
      dedupToast('error', 'Không thể kết nối đến server. Vui lòng kiểm tra mạng.');
      return Promise.reject(error);
    }

    if (status === 403) {
      dedupToast('error', serverMessage || 'Bạn không có quyền thực hiện thao tác này.');
    } else if (status === 404) {
      // 404 cho session đã bị xóa — silent
      if (url.includes('/receiving-sessions/')) return Promise.reject(error);
      dedupToast('error', serverMessage || 'Không tìm thấy tài nguyên yêu cầu.');
    } else if (status === 500) {
      // 500 từ SSE disconnect khi đóng session — bỏ qua
      if (url.includes('/stream') || url.includes('/receiving-sessions/')) {
        return Promise.reject(error);
      }
      dedupToast('error', serverMessage || 'Lỗi hệ thống. Vui lòng thử lại sau.');
    } else if (status && status >= 400 && message) {
      dedupToast('error', message);
    }

    return Promise.reject(error);
  },
);

export default api;