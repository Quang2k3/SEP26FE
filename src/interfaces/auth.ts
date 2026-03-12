import type { ApiResponse } from './common';

export type RoleCode = 'ADMIN' | 'MANAGER' | 'STAFF' | (string & {});

export interface AuthUser {
  userId: number;
  email: string;
  fullName: string;
  roleCodes: RoleCode[];
  avatarUrl?: string | null;
  warehouseIds?: number[] | null;
}

export interface LoginPayload {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface LoginResponseData {
  token?: string;
  tokenType?: string;
  expiresIn?: number;
  requiresVerification: boolean;
  pendingToken?: string;
  user: AuthUser;
}

export interface AuthSession {
  token: string;
  tokenType: string;
  expiresAt: number;
  user: AuthUser;
}

export interface LoginResult {
  session: AuthSession | null;
  raw: ApiResponse<LoginResponseData>;
}


