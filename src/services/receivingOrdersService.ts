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

// POST /v1/receiving-orders/{id}/submit — DRAFT → SUBMITTED
export async function submitReceivingOrder(id: number): Promise<ReceivingOrder> {
  const { data } = await api.post<ApiResponse<ReceivingOrder>>(
    `/receiving-orders/${id}/submit`,
  );
  return data.data;
}

// POST /v1/receiving-orders/{id}/generate-grn — QC_APPROVED → GRN_CREATED
export async function generateGrn(id: number): Promise<void> {
  await api.post(`/receiving-orders/${id}/generate-grn`);
}