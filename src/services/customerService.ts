import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface Customer {
  customerId: number;
  customerCode: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  active: boolean;
}

export interface CreateCustomerPayload {
  customerName: string;
  email?: string;
  phone?: string;
}

// GET /v1/customers
export async function fetchCustomers(): Promise<Customer[]> {
  const { data } = await api.get<ApiResponse<Customer[]>>('/customers');
  return data.data ?? [];
}

// POST /v1/customers — tạo mới, BE tự gen customerCode
export async function createCustomer(payload: CreateCustomerPayload): Promise<Customer> {
  const { data } = await api.post<ApiResponse<Customer>>('/customers', payload);
  return data.data;
}
