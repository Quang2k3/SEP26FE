'use client';

import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type {
  OutboundOrder,
  OutboundListItem,
  OutboundPagePayload,
  OutboundSummary,
  AllocateStockResponse,
  PickListResponse,
  QcSummaryResponse,
  QcScanRequest,
  DispatchNoteResponse,
  CreateOutboundPayload,
  UpdateOutboundPayload,
  OutboundListQuery,
} from '@/interfaces/outbound';

// ─── List ─────────────────────────────────────────────────────────────────────
export async function fetchOutboundOrders(params?: OutboundListQuery): Promise<OutboundPagePayload> {
  const { data } = await api.get<ApiResponse<OutboundPagePayload>>('/outbound', { params });
  const payload = data.data;
  if (!payload.content) (payload as any).content = [];
  return payload;
}

export async function fetchOutboundSummary(): Promise<OutboundSummary> {
  const { data } = await api.get<ApiResponse<OutboundSummary>>('/outbound/summary');
  return data.data;
}

// ─── Build order object from list item (no extra API call needed) ─────────────
export function buildOrderFromListItem(item: OutboundListItem): OutboundOrder {
  return {
    documentId:               item.documentId,
    documentCode:             item.documentCode,
    orderType:                item.orderType,
    status:                   item.status as any,
    warehouseId:              item.warehouseId ?? 0,
    customerName:             item.destination ?? item.customerName,
    destinationWarehouseName: item.destination ?? item.destinationWarehouseName,
    deliveryDate:             item.shipmentDate ?? item.deliveryDate,
    items:                    [],
    createdBy:                item.createdBy,
    createdByName:            (item as any).createdByName,
    createdAt:                item.createdAt,
    stockWarnings:            null,
  };
}

// ─── Create / Update ──────────────────────────────────────────────────────────
export async function createOutbound(payload: CreateOutboundPayload): Promise<OutboundOrder> {
  const { data } = await api.post<ApiResponse<OutboundOrder>>('/outbound', payload);
  return data.data;
}
export async function updateSalesOrder(soId: number, payload: UpdateOutboundPayload): Promise<OutboundOrder> {
  const { data } = await api.put<ApiResponse<OutboundOrder>>(`/outbound/sales-orders/${soId}`, payload);
  return data.data;
}
export async function updateTransfer(transferId: number, payload: UpdateOutboundPayload): Promise<OutboundOrder> {
  const { data } = await api.put<ApiResponse<OutboundOrder>>(`/outbound/transfers/${transferId}`, payload);
  return data.data;
}

// ─── Submit ───────────────────────────────────────────────────────────────────
export async function submitSalesOrder(soId: number, note?: string): Promise<OutboundOrder> {
  const { data } = await api.patch<ApiResponse<OutboundOrder>>(`/outbound/sales-orders/${soId}/submit`, note ? { note } : {});
  return data.data;
}
export async function submitTransfer(transferId: number, note?: string): Promise<OutboundOrder> {
  const { data } = await api.patch<ApiResponse<OutboundOrder>>(`/outbound/transfers/${transferId}/submit`, note ? { note } : {});
  return data.data;
}

// ─── Approve / Reject ─────────────────────────────────────────────────────────
export async function approveSalesOrder(soId: number, note?: string): Promise<OutboundOrder> {
  const { data } = await api.patch<ApiResponse<OutboundOrder>>(`/outbound/sales-orders/${soId}/approve`, { approved: true, note });
  return data.data;
}
export async function rejectSalesOrder(soId: number, reason: string): Promise<OutboundOrder> {
  const { data } = await api.patch<ApiResponse<OutboundOrder>>(`/outbound/sales-orders/${soId}/reject`, { reason });
  return data.data;
}

// ─── Allocate ─────────────────────────────────────────────────────────────────
export async function allocateStock(
  documentId: number,
  orderType: 'SALES_ORDER' | 'INTERNAL_TRANSFER',
): Promise<AllocateStockResponse> {
  const { data } = await api.post<ApiResponse<AllocateStockResponse>>('/outbound/allocate', { documentId, orderType });
  return data.data;
}

// ─── Pick List ────────────────────────────────────────────────────────────────
export async function generatePickList(
  documentId: number,
  orderType: 'SALES_ORDER' | 'INTERNAL_TRANSFER',
  assignedTo?: number,
): Promise<PickListResponse> {
  const { data } = await api.post<ApiResponse<PickListResponse>>('/outbound/pick-list', { documentId, orderType, assignedTo });
  return normalizePickList(data.data);
}

/** Lấy pick list theo taskId */
export async function fetchPickList(taskId: number): Promise<PickListResponse> {
  const { data } = await api.get<ApiResponse<PickListResponse>>(`/outbound/pick-list/${taskId}`);
  return normalizePickList(data.data);
}

/**
 * Lấy pick list active theo documentId (soId) — dùng khi mở lại modal
 * mà không còn taskId trong state.
 * BE: GET /outbound/pick-list/by-document/{documentId}
 */
export async function fetchPickListByDocument(documentId: number): Promise<PickListResponse> {
  const { data } = await api.get<ApiResponse<PickListResponse>>(`/outbound/pick-list/by-document/${documentId}`);
  return normalizePickList(data.data);
}

/** Keeper xác nhận đã lấy đủ hàng → task OPEN/IN_PROGRESS → PICKED */
export async function confirmPickedTask(taskId: number): Promise<PickListResponse> {
  const { data } = await api.patch<ApiResponse<PickListResponse>>(`/outbound/pick-list/${taskId}/confirm-picked`);
  return normalizePickList(data.data);
}

function normalizePickList(res: any): PickListResponse {
  if (!res) return res;
  if (!res.taskId && res.pickingTaskId) res.taskId = res.pickingTaskId;
  if (res.items) {
    res.items = res.items.map((item: any) => ({
      ...item,
      taskItemId: item.taskItemId ?? item.pickingTaskItemId,
      qtyToPick:  item.qtyToPick  ?? item.requiredQty ?? 0,
    }));
  }
  return res;
}

// ─── QC ───────────────────────────────────────────────────────────────────────
export async function startQcSession(taskId: number): Promise<void> {
  await api.post(`/outbound/pick-list/${taskId}/start-qc`);
}
export async function qcScanItem(payload: QcScanRequest): Promise<void> {
  await api.post('/outbound/qc-scan', payload);
}
export async function fetchQcSummary(taskId: number): Promise<QcSummaryResponse> {
  const { data } = await api.get<ApiResponse<QcSummaryResponse>>(`/outbound/pick-list/${taskId}/qc-summary`);
  return data.data;
}

// ─── Dispatch ─────────────────────────────────────────────────────────────────
export async function fetchDispatchNote(soId: number): Promise<DispatchNoteResponse> {
  const { data } = await api.get<ApiResponse<DispatchNoteResponse>>(`/outbound/sales-orders/${soId}/dispatch-note`);
  return data.data;
}
export async function confirmDispatch(soId: number): Promise<void> {
  await api.post(`/outbound/sales-orders/${soId}/dispatch`);
}