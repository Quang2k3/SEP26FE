import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface Supplier {
  supplierId: number;
  supplierCode: string;
  supplierName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

// GET /v1/suppliers
export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data } = await api.get<ApiResponse<Supplier[]>>('/suppliers');
  return data.data;
}