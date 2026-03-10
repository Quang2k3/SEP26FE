import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { AuthSession, AuthUser, LoginPayload, LoginResponseData, LoginResult } from '@/interfaces/auth';

const STORAGE_TOKEN = 'auth_token';
const STORAGE_TOKEN_TYPE = 'auth_token_type';
const STORAGE_EXPIRES_AT = 'auth_expires_at';
const STORAGE_USER = 'auth_user';

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(STORAGE_TOKEN);
  const tokenType = localStorage.getItem(STORAGE_TOKEN_TYPE) || 'Bearer';
  const expiresAtStr = localStorage.getItem(STORAGE_EXPIRES_AT);
  const userStr = localStorage.getItem(STORAGE_USER);

  if (!token || !expiresAtStr || !userStr) {
    return null;
  }

  const expiresAt = Number(expiresAtStr);
  if (!expiresAt || Number.isNaN(expiresAt)) {
    return null;
  }

  try {
    const user: AuthUser = JSON.parse(userStr);
    return { token, tokenType, expiresAt, user };
  } catch {
    return null;
  }
}

export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return true;

  const session = getStoredSession();
  if (!session) return true;

  return session.expiresAt <= Date.now();
}

export function getValidSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  const session = getStoredSession();
  if (!session) return null;

  if (session.expiresAt <= Date.now()) {
    clearAuthToken();
    return null;
  }

  return session;
}

export function isAuthenticated(): boolean {
  return !!getValidSession();
}

export function saveAuthSession(session: AuthSession) {
  if (typeof window === 'undefined') return;

  localStorage.setItem(STORAGE_TOKEN, session.token);
  localStorage.setItem(STORAGE_TOKEN_TYPE, session.tokenType);
  localStorage.setItem(STORAGE_EXPIRES_AT, String(session.expiresAt));
  localStorage.setItem(STORAGE_USER, JSON.stringify(session.user));

  const maxAgeSec = Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000));
  document.cookie = `auth_token=${session.token}; path=/; max-age=${maxAgeSec}`;
}

export function clearAuthToken() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(STORAGE_TOKEN);
  localStorage.removeItem(STORAGE_TOKEN_TYPE);
  localStorage.removeItem(STORAGE_EXPIRES_AT);
  localStorage.removeItem(STORAGE_USER);
  document.cookie = 'auth_token=; path=/; max-age=0';
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_TOKEN);
}

export function getTokenType(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(STORAGE_TOKEN_TYPE);
}

export function getAuthorizationHeaderValue(): string | null {
  const session = getValidSession();
  if (!session) return null;

  return `${session.tokenType} ${session.token}`;
}

export async function login(payload: LoginPayload): Promise<LoginResult> {
  const response = await api.post<ApiResponse<LoginResponseData>>('/auth/login', payload);
  const body = response.data;

  const token = body?.data?.token;
  const tokenType = body?.data?.tokenType || 'Bearer';
  const expiresIn = body?.data?.expiresIn ?? 0;
  const user = body?.data?.user;

  if (!token) throw new Error('Không nhận được token từ server');
  if (!user) throw new Error('Không nhận được user từ server');

  const expiresAt = Date.now() + Number(expiresIn);

  const session: AuthSession = {
    token,
    tokenType,
    expiresAt,
    user,
  };

  saveAuthSession(session);

  return {
    session,
    raw: body,
  };
}

export interface UpdateProfilePayload {
  fullName: string;
  phone: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  address?: string | null;
  avatar?: File | null;
}

export async function updateProfile(payload: UpdateProfilePayload): Promise<ApiResponse<unknown>> {
  const formData = new FormData();
  
  // Required fields
  formData.append('fullName', payload.fullName);
  formData.append('phone', payload.phone);
  
  // Optional fields - always send, use empty string if not provided
  // Format: yyyy-MM-dd for dateOfBirth
  formData.append('gender', payload.gender || '');
  formData.append('dateOfBirth', payload.dateOfBirth || '');
  formData.append('address', payload.address || '');
  
  // Avatar - only append if file is provided, otherwise send empty string
  if (payload.avatar) {
    formData.append('avatar', payload.avatar);
  } else {
    formData.append('avatar', '');
  }

  const response = await api.post<ApiResponse<unknown>>('/profile/update-profile', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data;
}
