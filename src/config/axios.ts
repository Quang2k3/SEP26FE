'use client';

import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';
import { clearAuthToken, getAuthorizationHeaderValue } from '@/services/authService';
import { extractErrorMessage } from '@/utils/errorHandler';
import toast from 'react-hot-toast';

// Base URL nên cấu hình qua biến môi trường cho linh hoạt
// Nếu chưa set, axios sẽ dùng relative URL (cùng domain)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Gắn token cho mọi request nếu có
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
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

// Xử lý response errors: hiển thị toast và xử lý 401
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (typeof window === 'undefined') {
      return Promise.reject(error);
    }

    const status = error.response?.status;
    const message = extractErrorMessage(error);
    const serverMessage =
      (error.response?.data as { message?: string } | undefined)?.message;

    // Xử lý 401: clear token và redirect về login
    if (status === 401) {
      clearAuthToken();
      // Sửa lỗi: kiểu dữ liệu có thể không có property 'message'
      const errorMessage =
        (error.response?.data as { message?: string } | undefined)?.message ||
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
      toast.error(errorMessage);

      // Tránh loop nếu đang ở trang login
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      return Promise.reject(error);
    }

    // Xử lý các lỗi khác: hiển thị toast
    // Chỉ hiển thị toast nếu không phải lỗi network (status = undefined)
    if (status !== undefined) {
      // 403: Forbidden
      if (status === 403) {
        toast.error('Bạn không có quyền thực hiện thao tác này.');
      }
      // 404: Not Found
      else if (status === 404) {
        toast.error('Không tìm thấy tài nguyên yêu cầu.');
      }
      // 500+: Internal Server Error
      else if (status >= 500) {
        // Nếu server KHÔNG gửi kèm message thì hiển thị lỗi hệ thống
        if (!serverMessage) {
          toast.error('Lỗi hệ thống. Vui lòng liên hệ quản trị hoặc thử lại sau.');
        } else {
          toast.error(message);
        }
      }
      // Các lỗi khác: hiển thị message từ server
      else if (message) {
        toast.error(message);
      }
    } else {
      // Network error hoặc lỗi không có response
      toast.error('Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.');
    }

    return Promise.reject(error);
  },
);

export default api;



