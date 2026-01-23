/**
 * token.ts
 * --------
 * Quản lý access token trong localStorage
 * (đủ dùng cho đồ án)
 */

const TOKEN_KEY = 'wms_access_token';

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}
