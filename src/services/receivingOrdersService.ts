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