import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

// ─── Types ────────────────────────────────────────────────────────────────────

// BE-C1 FIX impact: GRN bắt đầu với status GRN_CREATED thay vì PENDING_APPROVAL
// Thêm GRN_CREATED vào union type để TypeScript không báo lỗi
export type GrnStatus = 'GRN_CREATED' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'POSTED';

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
  supplierName: string | null;
  sourceReferenceCode: string | null;
  status: GrnStatus;
  createdBy: number;
  createdAt: string;
  updatedAt: string | null;
  approvedBy: number | null;
  approvedAt: string | null;
  note: string | null;           // chứa reject reason: "Rejected by {id}: {reason}"
  rejectedBy: number | null;
  rejectedAt: string | null;
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

// ─── API calls ────────────────────────────────────────────────────────────────

/**
 * GET /v1/grns — Manager dùng để xem danh sách GRN
 * Không truyền status lên BE (tránh bug filter warehouseId+status)
 * Filter status client-side
 */
export async function fetchGrns(params?: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<GrnPage> {
  const { data } = await api.get<ApiResponse<GrnPage>>('/grns', {
    params: { page: params?.page ?? 0, size: params?.size ?? 200 },
  });
  const all = data.data ?? { content: [], totalElements: 0, totalPages: 0, page: 0, size: 0, last: true };

  // Filter client-side theo status nếu có
  if (params?.status && params.status !== 'ALL') {
    const filtered = all.content.filter(g => g.status === params.status);
    return {
      ...all,
      content: filtered,
      totalElements: filtered.length,
      totalPages: Math.max(1, Math.ceil(filtered.length / (params.size ?? 10))),
    };
  }
  return all;
}

/** GET /v1/grns/{id} */
export async function fetchGrn(id: number): Promise<Grn> {
  const { data } = await api.get<ApiResponse<Grn>>(`/grns/${id}`);
  return data.data;
}

/**
 * GET /v1/grns/by-receiving/{receivingId}
 * Keeper dùng để lấy GRN từ ReceivingOrder
 */
export async function fetchGrnByReceivingId(receivingId: number): Promise<Grn> {
  const { data } = await api.get<ApiResponse<Grn>>(`/grns/by-receiving/${receivingId}`);
  return data.data;
}

/**
 * POST /v1/grns/{id}/submit
 * Keeper gửi GRN cho Manager duyệt
 * ReceivingOrder.status → PENDING_APPROVAL
 */
export async function submitGrnToManager(grnId: number): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${grnId}/submit`);
  return data.data;
}

/**
 * POST /v1/grns/{id}/approve — Manager duyệt
 * GRN.status: PENDING_APPROVAL → APPROVED
 * ReceivingOrder.status → GRN_APPROVED
 */
export async function approveGrn(id: number): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${id}/approve`);
  return data.data;
}

/**
 * POST /v1/grns/{id}/reject — Manager từ chối
 * GRN.status: PENDING_APPROVAL → REJECTED
 * ReceivingOrder.status → GRN_CREATED (Keeper gửi lại được)
 */
export async function rejectGrn(id: number, reason: string): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${id}/reject`, { reason });
  return data.data;
}


/**
 * POST /v1/grns/{id}/post — Manager nhập kho
 * GRN.status: APPROVED → POSTED
 * ReceivingOrder.status → POSTED
 * Tạo Putaway Task tự động
 */
export async function postGrn(id: number): Promise<Grn> {
  const { data } = await api.post<ApiResponse<Grn>>(`/grns/${id}/post`);
  return data.data;
}
