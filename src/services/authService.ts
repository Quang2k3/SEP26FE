import api from '@/config/axios';

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
};

export interface LoginPayload {
  username: string;
  password: string;
}

export type RoleCode = 'ADMIN' | 'MANAGER' | 'STAFF' | (string & {});

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  roleCodes: RoleCode[];
  avatarUrl?: string | null;
}

export interface LoginResponseData {
  token: string;
  tokenType: string;
  expiresIn: number;
  requiresVerification: boolean;
  user: AuthUser;
}

export interface AuthSession {
  token: string;
  tokenType: string;
  expiresAt: number;
  user: AuthUser;
}

export interface LoginResult {
  session: AuthSession;
  raw: ApiResponse<LoginResponseData>;
}

const STORAGE_TOKEN = 'auth_token';
const STORAGE_TOKEN_TYPE = 'auth_token_type';
const STORAGE_EXPIRES_AT = 'auth_expires_at';
const STORAGE_USER = 'auth_user';

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
  const token = getAuthToken();
  if (!token) return null;

  const tokenType = getTokenType() || 'Bearer';
  return `${tokenType} ${token}`;
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
