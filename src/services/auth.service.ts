/**
 * auth.service.ts
 * ----------------
 * - Chứa các hàm liên quan đến authentication
 * - KHÔNG chứa UI
 * - KHÔNG lưu token
 * - KHÔNG xử lý role
 */

/**
 * Kiểu dữ liệu gửi lên API login
 * identifier: username hoặc email
 * password  : mật khẩu
 */
export interface LoginPayload {
  identifier: string;
  password: string;
}

/**
 * Kiểu dữ liệu response trả về từ API login
 * (hiện tại để generic, sẽ refine sau)
 */
export interface LoginResponse {
  success: boolean;
  message?: string;
  data?: any;
}

/**
 * Hàm gọi API login
 * POST /auth/login
 */
export async function login(
  payload: LoginPayload
): Promise<LoginResponse> {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    // Parse JSON response
    const data = await response.json();

    // Nếu HTTP status không OK
    if (!response.ok) {
      return {
        success: false,
        message: data?.message || 'Login failed',
      };
    }

    // Thành công
    return {
      success: true,
      data,
    };
  } catch (error) {
    // Lỗi network hoặc lỗi không xác định
    return {
      success: false,
      message: 'Network error',
    };
  }
}
