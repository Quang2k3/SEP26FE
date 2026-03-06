export type UserStatus = "ACTIVE" | "SUSPENDED" | "INACTIVE";

export interface UserSummary {
  userId: number;
  email: string;
  fullName: string;
  phone: string;
  roleCodes: string[];
  status: UserStatus;
  isPermanent: boolean;
  expireDate: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UserListPage {
  users: UserSummary[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface UserListQuery {
  page?: number;
  size?: number;
  keyword?: string;
  status?: UserStatus | "ALL";
}

export interface CreateUserPayload {
  email: string;
  roleCodes: string[];
  isPermanent: boolean;
  expireDate: string | null;
}

export interface ChangeStatusPayload {
  status: UserStatus;
  suspendUntil?: string | null;
  reason?: string | null;
}

export interface AssignRoleResponseUser {
  userId: number;
  email: string;
  fullName: string;
  phone: string;
  gender: string | null;
  dateOfBirth: string | null;
  address: string | null;
  avatarUrl: string | null;
  roleCodes: string[];
  status: UserStatus;
  isPermanent: boolean;
  expireDate: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}