// ─── Outbound status lifecycle ────────────────────────────────────────────────
// DRAFT → PENDING_APPROVAL → APPROVED → ALLOCATED → PICKING → QC_SCAN → DISPATCHED
// Internal Transfer: DRAFT → APPROVED (auto) → ALLOCATED → PICKING → QC_SCAN → DISPATCHED
export type OutboundStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ALLOCATED'
  | 'PICKING'
  | 'QC_SCAN'
  | 'DISPATCHED'
  | 'CANCELLED';

export type OutboundType = 'SALES_ORDER' | 'INTERNAL_TRANSFER';

// ─── Response types (khớp BE OutboundResponse) ────────────────────────────────
export interface OutboundStockWarning {
  skuId: number;
  skuCode: string;
  requestedQty: number;
  availableQty: number;
  message: string | null;
}

export interface OutboundItemResponse {
  itemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  requestedQty: number;
  availableQty: number;
  insufficientStock: boolean;
  note?: string | null;
}

export interface OutboundOrder {
  documentId: number;
  documentCode: string;
  orderType: OutboundType;
  status: OutboundStatus;
  warehouseId: number;
  // Sales Order fields
  customerId?: number | null;
  customerName?: string | null;
  deliveryDate?: string | null;
  // Internal Transfer fields
  destinationWarehouseId?: number | null;
  destinationWarehouseName?: string | null;
  // Common
  items: OutboundItemResponse[];
  note?: string | null;
  createdBy: number;
  approvedBy?: number | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  stockWarnings?: OutboundStockWarning[] | null;
  dispatchPdfUrl?: string | null;
}

// ─── List response (GET /v1/outbound) — khớp BE OutboundListResponse ──────────
export interface OutboundListItem {
  documentId: number;
  documentCode: string;
  orderType: OutboundType;
  // BE trả "destination" — tên KH hoặc tên kho đích
  destination?: string | null;
  // FE alias (giữ để không break code cũ)
  customerName?: string | null;
  destinationWarehouseName?: string | null;
  // BE trả "shipmentDate" (LocalDate), FE cũng nhận "deliveryDate"
  shipmentDate?: string | null;
  deliveryDate?: string | null;
  status: string;          // BE trả string, không phải enum
  warehouseId?: number;
  totalItems: number;
  totalQty?: number | null;
  createdBy: number;
  createdByName?: string | null;
  createdAt: string;
  // action flags từ BE
  canEdit?: boolean;
  canDelete?: boolean;
  canSubmit?: boolean;
  canApprove?: boolean;
  canConfirm?: boolean;
}

export interface OutboundPagePayload {
  content: OutboundListItem[];
  totalElements: number;
  totalPages: number;
  page?: number;
  size?: number;
  // BE PageResponse có thể dùng field khác
  number?: number;        // Spring Page: page number
  numberOfElements?: number;
}

// ─── Summary (GET /v1/outbound/summary) ───────────────────────────────────────
export interface OutboundSummary {
  total?: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  allocated: number;
  picking: number;
  qcScan: number;
  dispatched: number;
  rejected: number;
}

// ─── Allocate Stock (POST /v1/outbound/allocate) ──────────────────────────────
export interface AllocationLine {
  skuId: number;
  skuCode: string;
  requestedQty: number;
  allocatedQty: number;
  locationCode: string;
  lotNumber?: string | null;
}

export interface ShortageItem {
  skuId: number;
  skuCode: string;
  requestedQty: number;
  availableQty: number;
  shortageQty: number;
}

export interface AllocateStockResponse {
  documentId: number;
  documentCode: string;
  // BE trả status: "ALLOCATED" | "PARTIALLY_ALLOCATED"
  status: string;
  totalSkus: number;
  allocatedSkus: number;
  allocations: AllocationLine[];
  shortages?: ShortageItem[] | null;
  // BE không trả fullyAllocated — derive từ status
  fullyAllocated?: boolean;
}

// ─── Pick List (POST /v1/outbound/pick-list) ──────────────────────────────────
export interface PickListItem {
  // BE trả pickingTaskItemId
  taskItemId: number;
  pickingTaskItemId?: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  barcode?: string | null;  // barcode vật lý trên hộp — dùng để match khi Keeper quét
  locationCode: string;
  zoneCode?: string | null;
  rackCode?: string | null;
  qtyToPick: number;
  requiredQty?: number;
  pickedQty?: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
  status?: string | null; // PENDING | PICKED
  qcResult?: string | null; // PASS | FAIL | HOLD | null
}

export interface PickListResponse {
  // BE trả pickingTaskId
  taskId: number;
  pickingTaskId?: number;
  pickingTaskCode?: string;
  documentId: number;
  documentCode: string;
  status: string; // OPEN | IN_PROGRESS | PICKED | QC_IN_PROGRESS | COMPLETED
  assignedTo?: number | null;
  items: PickListItem[];
  createdAt?: string;
  generatedAt?: string;
}

// ─── QC Scan ──────────────────────────────────────────────────────────────────
export type QcResult = 'PASS' | 'FAIL' | 'HOLD';

export interface QcScanRequest {
  taskId: number;
  taskItemId: number;
  result: QcResult;
  reason?: string | null;
}

export interface QcSummaryResponse {
  taskId: number;
  totalItems: number;
  passCount: number;
  failCount: number;
  holdCount: number;
  pendingCount: number;
  allScanned: boolean;
}

// ─── Dispatch Note (GET /v1/outbound/sales-orders/{soId}/dispatch-note) ───────
export interface DispatchNoteItem {
  skuCode: string;
  skuName: string;
  unit?: string | null;
  quantity: number;
  locationCode?: string | null;
  lotNumber?: string | null;
}

export interface DispatchNoteResponse {
  dispatchNoteCode?: string | null;
  warehouseName?: string | null;
  customerName?: string | null;
  dispatchDate?: string | null;
  items: DispatchNoteItem[];
  totalItems?: number;
  createdByName?: string | null;
}

// ─── Request payloads ─────────────────────────────────────────────────────────
export interface OutboundItemRequest {
  skuId: number;
  quantity: number;
  note?: string;
}

export interface CreateOutboundPayload {
  orderType: OutboundType;
  // SALES_ORDER
  customerCode?: string;
  deliveryDate?: string;
  // INTERNAL_TRANSFER
  destinationWarehouseCode?: string;
  items: OutboundItemRequest[];
  note?: string;
}

export interface UpdateOutboundPayload {
  customerCode?: string;
  deliveryDate?: string;
  destinationWarehouseCode?: string;
  transferDate?: string;
  items: OutboundItemRequest[];
  note?: string;
}

export interface OutboundListQuery {
  status?: string;
  orderType?: OutboundType;
  keyword?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
}

// ─── UI helpers ───────────────────────────────────────────────────────────────
export const OUTBOUND_STATUS_BADGE: Record<OutboundStatus, { label: string; className: string }> = {
  DRAFT:            { label: 'Nháp',        className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',   className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  APPROVED:         { label: 'Đã duyệt',    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  REJECTED:         { label: 'Từ chối',     className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  ALLOCATED:        { label: 'Đã phân bổ',  className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  PICKING:          { label: 'Đang lấy hàng', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  QC_SCAN:          { label: 'QC Scan',     className: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  DISPATCHED:       { label: 'Đã xuất kho', className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  CANCELLED:        { label: 'Đã huỷ',      className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
};