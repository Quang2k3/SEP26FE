'use client';

import api from '@/config/axios';
import {
  UserStatus,
  UserListPage,
  UserListQuery,
  CreateUserPayload,
  ChangeStatusPayload,
  AssignRoleResponseUser,
  ApiResponse,
} from '@/interface/user';

export async function fetchUsers(
  params: UserListQuery,
): Promise<UserListPage> {
  const { data } = await api.get<ApiResponse<UserListPage>>(
    '/users/list-users',
    { params },
  );
  return data.data;
}

export async function createUser(
  payload: CreateUserPayload,
): Promise<void> {
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
  const { data } = await api.put<ApiResponse<AssignRoleResponseUser>>(
    `/users/${userId}/assign-role`,
    { role },
  );

  return data.data;
}