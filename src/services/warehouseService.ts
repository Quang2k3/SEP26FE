import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { Warehouse } from '@/interfaces/warehouse';

export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<ApiResponse<Warehouse[]>>('/warehouses');
  return data.data;
}


