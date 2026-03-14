import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export type PutawayStatus = 'OPEN' | 'IN_PROGRESS' | 'DONE';

export interface PutawayTaskItem {
  putawayItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  qty: number;
  putawayQty: number | null;
  locationId: number | null;
  locationCode: string | null;
  suggestedLocationCode: string | null;
  status: string;
}

export interface PutawayTask {
  id: number;
  taskCode: string;
  receivingId: number;
  warehouseId: number;
  status: PutawayStatus;
  assignedTo: number | null;
  assignedToName: string | null;
  createdAt: string;
  updatedAt: string | null;
  items: PutawayTaskItem[];
}

export interface PutawayTaskPage {
  content: PutawayTask[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

export interface PutawayConfirmItem {
  skuId: number;
  putawayQty: number;
  locationId: number;
}

// GET /v1/putaway-tasks
export async function fetchPutawayTasks(params: {
  assignedTo?: number;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PutawayTaskPage> {
  const { data } = await api.get<ApiResponse<PutawayTaskPage>>('/putaway-tasks', { params });
  return data.data;
}

// GET /v1/putaway-tasks/{id}
export async function fetchPutawayTask(id: number): Promise<PutawayTask> {
  const { data } = await api.get<ApiResponse<PutawayTask>>(`/putaway-tasks/${id}`);
  return data.data;
}

// GET /v1/putaway-tasks/receiving/{receivingId}
export async function fetchPutawayTaskByReceivingId(receivingId: number): Promise<PutawayTask> {
  const { data } = await api.get<ApiResponse<PutawayTask>>(`/putaway-tasks/receiving/${receivingId}`);
  return data.data;
}

// POST /v1/putaway-tasks/{id}/confirm
export async function confirmPutaway(
  id: number,
  items: PutawayConfirmItem[],
): Promise<PutawayTask> {
  const { data } = await api.post<ApiResponse<PutawayTask>>(`/putaway-tasks/${id}/confirm`, { items });
  return data.data;
}