"use client";

import api from "@/config/axios";
import {
  ReceivingOrder,
  ReceivingListQuery,
  ReceivingOrderPagePayload,
} from "@/interfaces/receiving";
import type { ApiResponse } from "@/interfaces/common";

export async function fetchReceivingOrders(
  params?: ReceivingListQuery,
): Promise<ReceivingOrderPagePayload> {
  const { data } = await api.get<ApiResponse<ReceivingOrderPagePayload>>(
    "/receiving-orders",
    { params },
  );
  return data.data;
}

export async function fetchReceivingOrder(id: number): Promise<ReceivingOrder> {
  const { data } = await api.get<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}`,
  );
  return data.data;
}

export interface CreateReceivingOrderPayload {
  warehouseId: number;
  sourceType: string;
  supplierCode?: string | null;
  sourceReferenceCode?: string | null;
  note?: string | null;
  items: {
    skuCode: string;
    expectedQty?: number | null;
    lotNumber?: string | null;
    manufactureDate?: string | null;
    expiryDate?: string | null;
  }[];
}

export type UpdateReceivingOrderPayload = CreateReceivingOrderPayload;

// POST /v1/receiving-orders — tạo DRAFT
export async function createDraftReceivingOrder(
  payload: CreateReceivingOrderPayload,
): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    "/receiving-orders",
    payload,
  );
  return data.data;
}

// PUT /v1/receiving-orders/{id} — cập nhật DRAFT
export async function updateDraftReceivingOrder(
  id: number,
  payload: UpdateReceivingOrderPayload,
): Promise<ReceivingOrder> {
  const { data } = await api.put<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}`,
    payload,
  );
  return data.data;
}

// POST /v1/receiving-orders/{id}/submit — DRAFT → PENDING_COUNT
export async function submitReceivingOrder(id: number): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/submit`,
  );
  return data.data;
}

// POST /v1/receiving-orders/{id}/finalize-count — PENDING_COUNT → SUBMITTED
export async function finalizeCount(id: number): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/finalize-count`,
  );
  return data.data;
}

// POST /v1/receiving-orders/{id}/qc-approve — SUBMITTED → QC_APPROVED
export async function qcApproveReceivingOrder(id: number): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/qc-approve`,
  );
  return data.data;
}

// POST /v1/receiving-orders/{id}/generate-grn — QC_APPROVED → GRN_CREATED
export async function generateGrn(id: number): Promise<void> {
  await api.post(`/receiving-orders/${id}/generate-grn`);
}
// DELETE /v1/receiving-orders/{id} — Keeper xóa DRAFT
export async function deleteReceivingOrder(id: number): Promise<void> {
  await api.delete(`/receiving-orders/${id}`);
}

// ─── QC Reconciliation APIs ─────────────────────────────────────────────────

export interface QcCountItem {
  skuId: number;
  qcCountedQty: number;
  condition: "PASS" | "FAIL";
  failQty?: number;
  note?: string;
}

export interface QcSubmitCountPayload {
  items: QcCountItem[];
}

export interface QcMismatch {
  skuId: number;
  skuCode: string;
  keeperQty: number;
  qcQty: number;
  diff: number;
}

export interface QcSubmitCountResponse {
  receivingId: number;
  status: string;
  matched: boolean;
  mismatches?: QcMismatch[];
  incidentCode?: string;
  incidentItemCount?: number;
}

// POST /v1/receiving-orders/{id}/qc-submit-count
export async function qcSubmitCount(
  id: number,
  payload: QcSubmitCountPayload,
): Promise<QcSubmitCountResponse> {
  const { data } = await api.post<ApiResponse<QcSubmitCountResponse>>(
    `/receiving-orders/${id}/qc-submit-count`,
    payload,
  );
  return data.data;
}

export interface QcAmendmentItem {
  skuId: number;
  proposedQty: number;
  reason?: string;
}

export interface QcReconcilePayload {
  action: "REJECT" | "AMEND";
  note: string;
  amendments?: QcAmendmentItem[];
}

// POST /v1/receiving-orders/{id}/qc-reconcile
export async function qcReconcile(
  id: number,
  payload: QcReconcilePayload,
): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/qc-reconcile`,
    payload,
  );
  return data.data;
}

export interface KeeperRecountItem {
  skuId: number;
  newCountQty: number;
  note?: string;
}

export interface KeeperRecountPayload {
  action: "ACCEPT_QC" | "RECOUNT";
  note?: string;
  items?: KeeperRecountItem[];
}

// POST /v1/receiving-orders/{id}/keeper-recount
export async function keeperRecount(
  id: number,
  payload: KeeperRecountPayload,
): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/keeper-recount`,
    payload,
  );
  return data.data;
}
