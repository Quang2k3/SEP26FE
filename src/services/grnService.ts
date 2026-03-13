import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export type GrnStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED';

export interface GrnItem {
  grnItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  quantity: number;
  lotNumber: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
}

export interface Grn {
  grnId: number;
  grnCode: string;
  receivingId: number;
  warehouseId: number;
  sourceType: string;
  supplierId: number | null;
  sourceReferenceCode: string | null;
  status: GrnStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  note: string | null;
  items: GrnItem[];
}

export interface GrnPage {
  content: Grn[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

// GET /v1/grns
export async function fetchGrns(params: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<GrnPage> {
  const { data } = await api.get<ApiResponse<GrnPage>>('/grns', { params });
  return data.data;
}

// GET /v1/grns/{id}
export async function fetchGrn(id: number): Promise<Grn> {
  const { data } = await api.get<ApiResponse<Grn>>(`/grns/${id}`);
  return data.data;
}

// POST /v1/grns/{id}/approve
export async function approveGrn(id: number): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${id}/approve`);
  return data.data;
}

// POST /v1/grns/{id}/reject — reason tối thiểu 20 ký tự
export async function rejectGrn(id: number, reason: string): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${id}/reject`, { reason });
  return data.data;
}