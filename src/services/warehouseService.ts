import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface Warehouse {
  warehouseId: number;
  warehouseCode: string;
  warehouseName: string;
  address: string | null;
  active: boolean;
}

// GET /v1/warehouses
export async function fetchWarehouses(): Promise<Warehouse[]> {
  const { data } = await api.get<ApiResponse<Warehouse[]>>('/warehouses');
  return data.data;
}