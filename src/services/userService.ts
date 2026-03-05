 'use client';

 import api from '@/config/axios';

 export type UserStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

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

 interface ApiResponse<T> {
   success: boolean;
   message: string;
   data: T;
   timestamp: number;
 }

 export interface UserListQuery {
   page?: number;
   size?: number;
   keyword?: string;
   status?: UserStatus | 'ALL';
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

 export async function fetchUsers(
   params: UserListQuery,
 ): Promise<UserListPage> {
   const { data } = await api.get<ApiResponse<UserListPage>>(
     '/users/list-users',
     { params },
   );
   return data.data;
 }

 export async function createUser(payload: CreateUserPayload): Promise<void> {
   await api.post('/users/create-user', payload);
 }

 export async function changeUserStatus(
   userId: number,
   payload: ChangeStatusPayload,
 ): Promise<void> {
   await api.put(`/users/${userId}/change-status`, payload);
 }

 export async function assignUserRole(
   userId: number,
   role: string,
 ): Promise<AssignRoleResponseUser> {
   const { data } = await api.put<
     ApiResponse<AssignRoleResponseUser>
   >(`/users/${userId}/assign-role`, {
    role,
   });
   return data.data;
 }

