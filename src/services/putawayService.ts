import api from '@/config/axios';
import type { ApiResponse, PageResponse } from '@/interfaces/common';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PutawayTaskItemDto {
  putawayTaskItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  lotId: number | null;
  quantity: number;
  putawayQty: number;
  allocatedQty: number;
  remainingQty: number;
  suggestedLocationId: number | null;
  actualLocationId: number | null;
}

export interface PutawayTaskResponse {
  putawayTaskId: number;
  warehouseId: number;
  grnId: number;
  status: 'PENDING' | 'OPEN' | 'IN_PROGRESS' | 'DONE';
  fromLocationId: number | null;
  assignedTo: number | null;
  createdAt: string;
  completedAt: string | null;
  note: string | null;
  items: PutawayTaskItemDto[];
}

export interface BinOccupancyResponse {
  locationId: number;
  locationCode: string;
  zoneId: number;
  zoneCode: string;
  parentLocationId: number | null;
  parentLocationCode: string | null;
  grandParentLocationId: number | null;
  grandParentLocationCode: string | null;
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  occupiedQty: number;
  reservedQty: number;
  availableQty: number | null;
  occupancyStatus: 'EMPTY' | 'PARTIAL' | 'FULL';
  isPickingFace: boolean;
  isStaging: boolean;
  active: boolean;
}

export interface PutawaySuggestion {
  skuId: number;
  skuCode: string;
  categoryCode: string;
  matchedZoneCode: string;
  matchedZoneId: number;
  matchedZoneName: string;
  suggestedLocationId: number;
  suggestedLocationCode: string;
  aisleName: string;
  rackName: string;
  currentQty: number;
  maxCapacity: number;
  availableCapacity: number;
  reason: string;
}

export interface PutawayAllocationResponse {
  allocationId: number;
  putawayTaskId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  lotId: number | null;
  locationId: number;
  locationCode: string;
  allocatedQty: number;
  status: 'RESERVED' | 'CONFIRMED' | 'CANCELLED';
  allocatedBy: number;
  allocatedAt: string;
}

export interface AllocateItem {
  skuId: number;
  locationId: number;
  qty: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

/** GET /v1/putaway-tasks */
export async function fetchPutawayTasks(params?: {
  assignedTo?: number;
  status?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<PutawayTaskResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<PutawayTaskResponse>>>(
    '/putaway-tasks', { params }
  );
  return data.data;
}

/** GET /v1/putaway-tasks/{id} */
export async function fetchPutawayTask(id: number): Promise<PutawayTaskResponse> {
  const { data } = await api.get<ApiResponse<PutawayTaskResponse>>(`/putaway-tasks/${id}`);
  return data.data;
}

/** GET /v1/putaway-tasks/grn/{grnId} */
export async function fetchPutawayTaskByGrnId(grnId: number): Promise<PutawayTaskResponse> {
  const { data } = await api.get<ApiResponse<PutawayTaskResponse>>(`/putaway-tasks/grn/${grnId}`);
  return data.data;
}

/** GET /v1/putaway-tasks/{id}/suggestions */
export async function fetchPutawaySuggestions(taskId: number): Promise<PutawaySuggestion[]> {
  const { data } = await api.get<ApiResponse<PutawaySuggestion[]>>(`/putaway-tasks/${taskId}/suggestions`);
  return data.data;
}

/** GET /v1/bins/occupancy?zoneId=X */
export async function fetchBinOccupancy(params: {
  zoneId?: number;
  occupancyStatus?: 'EMPTY' | 'PARTIAL' | 'FULL';
  page?: number;
  size?: number;
}): Promise<PageResponse<BinOccupancyResponse>> {
  const { data } = await api.get<ApiResponse<PageResponse<BinOccupancyResponse>>>(
    '/bins/occupancy', { params: { ...params, size: params.size ?? 100 } }
  );
  return data.data;
}

/** POST /v1/putaway-tasks/{id}/allocate */
export async function allocatePutaway(
  taskId: number,
  items: AllocateItem[]
): Promise<PutawayAllocationResponse[]> {
  const { data } = await api.post<ApiResponse<PutawayAllocationResponse[]>>(
    `/putaway-tasks/${taskId}/allocate`,
    { items }
  );
  return data.data;
}

/** GET /v1/putaway-tasks/{id}/allocations */
export async function fetchAllocations(taskId: number): Promise<PutawayAllocationResponse[]> {
  const { data } = await api.get<ApiResponse<PutawayAllocationResponse[]>>(
    `/putaway-tasks/${taskId}/allocations`
  );
  return data.data;
}

/** DELETE /v1/putaway-tasks/{id}/allocations/{allocationId} */
export async function cancelAllocation(taskId: number, allocationId: number): Promise<void> {
  await api.delete(`/putaway-tasks/${taskId}/allocations/${allocationId}`);
}

/** POST /v1/putaway-tasks/{id}/confirm */
export async function confirmPutawayTask(taskId: number): Promise<PutawayTaskResponse> {
  const { data } = await api.post<ApiResponse<PutawayTaskResponse>>(
    `/putaway-tasks/${taskId}/confirm`
  );
  return data.data;
}
