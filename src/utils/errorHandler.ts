import { AxiosError } from 'axios';

/**
 * Trích xuất thông báo lỗi từ AxiosError hoặc Error thông thường
 */
export function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    // Ưu tiên lấy message từ response.data.message
    const message =
      (error.response?.data as { message?: string })?.message ||
      error.message ||
      'Đã xảy ra lỗi. Vui lòng thử lại.';

    return message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Đã xảy ra lỗi. Vui lòng thử lại.';
}

/**
 * Trích xuất status code từ AxiosError
 */
export function extractErrorStatus(error: unknown): number | null {
  if (error instanceof AxiosError) {
    return error.response?.status ?? null;
  }
  return null;
}



