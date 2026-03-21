// ─── Outbound status lifecycle ────────────────────────────────────────────────
// DRAFT → PENDING_APPROVAL → APPROVED → ALLOCATED → PICKING → QC_SCAN → DISPATCHED
// APPROVED → (PARTIALLY_ALLOCATED) → WAITING_STOCK (chờ hàng bù) → APPROVED → re-Allocate
// QC_SCAN → ON_HOLD (có FAIL QC) → PICKING (re-pick) | QC_SCAN (ACCEPT) → DISPATCHED
export type OutboundStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'ALLOCATED'
  | 'PICKING'
  | 'QC_SCAN'
  | 'ON_HOLD'           // [V20] QC có FAIL, chờ Manager xử lý Incident DAMAGE
  | 'WAITING_STOCK'     // [V20] Thiếu hàng, chờ nhập bù (Manager chọn WAIT_BACKORDER)
  | 'DISPATCHED'
  | 'CANCELLED';

export type OutboundType = 'SALES_ORDER' | 'INTERNAL_TRANSFER';

// ─── Response types ────────────────────────────────────────────────────────────
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
  customerId?: number | null;
  customerCode?: string | null;
  customerName?: string | null;
  deliveryDate?: string | null;
  destinationWarehouseId?: number | null;
  destinationWarehouseCode?: string | null;
  destinationWarehouseName?: string | null;
  items: OutboundItemResponse[];
  note?: string | null;
  createdBy: number;
  approvedBy?: number | null;
  approvedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  stockWarnings?: OutboundStockWarning[] | null;
  dispatchPdfUrl?: string | null;
  signedNoteUrl?: string | null;
  signedNoteUploadedAt?: string | null;
  pickSignedNoteUrl?: string | null;
  pickSignedNoteUploadedAt?: string | null;
}

export interface OutboundListItem {
  documentId: number;
  documentCode: string;
  orderType: OutboundType;
  destination?: string | null;
  customerName?: string | null;
  destinationWarehouseName?: string | null;
  shipmentDate?: string | null;
  deliveryDate?: string | null;
  status: string;
  warehouseId?: number;
  totalItems: number;
  totalQty?: number | null;
  createdBy: number;
  createdByName?: string | null;
  createdAt: string;
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
  number?: number;
  numberOfElements?: number;
}

export interface OutboundSummary {
  total?: number;
  draft: number;
  pendingApproval: number;
  approved: number;
  allocated: number;
  picking: number;
  qcScan: number;
  onHold: number;          // [V20]
  waitingStock: number;    // [V20]
  dispatched: number;
  rejected: number;
}

// ─── Allocate Stock ────────────────────────────────────────────────────────────
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
  status: string;
  totalSkus: number;
  allocatedSkus: number;
  allocations: AllocationLine[];
  shortages?: ShortageItem[] | null;
  fullyAllocated?: boolean;
}

// ─── Pick List ─────────────────────────────────────────────────────────────────
export interface PickListItem {
  taskItemId: number;
  pickingTaskItemId?: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  barcode?: string | null;
  locationCode: string;
  zoneCode?: string | null;
  rackCode?: string | null;
  qtyToPick: number;
  requiredQty?: number;
  pickedQty?: number;
  lotNumber?: string | null;
  expiryDate?: string | null;
  status?: string | null;
  qcResult?: string | null;
}

export interface PickListResponse {
  taskId: number;
  pickingTaskId?: number;
  pickingTaskCode?: string;
  documentId: number;
  documentCode: string;
  status: string;
  assignedTo?: number | null;
  items: PickListItem[];
  createdAt?: string;
  generatedAt?: string;
}

// ─── QC Scan ───────────────────────────────────────────────────────────────────
export type QcResult = 'PASS' | 'FAIL' | 'HOLD';

export interface QcScanRequest {
  pickingTaskId: number;
  pickingTaskItemId: number;
  result: QcResult;
  reason?: string | null;
  attachmentUrl?: string | null;  // [V20] URL ảnh hàng hỏng khi FAIL
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

// ─── Dispatch Note ─────────────────────────────────────────────────────────────
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

// ─── Request payloads ──────────────────────────────────────────────────────────
export interface OutboundItemRequest {
  skuId: number;
  quantity: number;
  note?: string;
}

export interface CreateOutboundPayload {
  orderType: OutboundType;
  customerCode?: string;
  deliveryDate?: string;
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

// ─── [V20] Resolve requests ────────────────────────────────────────────────────
export interface ResolveOutboundDamageRequest {
  action: 'RETURN_SCRAP' | 'ACCEPT';
  note?: string;
}

export interface ResolveOutboundShortageRequest {
  action: 'WAIT_BACKORDER' | 'CLOSE_SHORT';
  note?: string;
}

// ─── UI helpers ────────────────────────────────────────────────────────────────
export const OUTBOUND_STATUS_BADGE: Record<OutboundStatus, { label: string; className: string }> = {
  DRAFT:            { label: 'Nháp',           className: 'bg-gray-100 text-gray-600 ring-1 ring-gray-200' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',      className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  APPROVED:         { label: 'Đã duyệt',       className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' },
  REJECTED:         { label: 'Từ chối',        className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  ALLOCATED:        { label: 'Đã phân bổ',     className: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' },
  PICKING:          { label: 'Đang lấy hàng',  className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
  QC_SCAN:          { label: 'QC Scan',         className: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' },
  ON_HOLD:          { label: 'Tạm giữ (QC lỗi)', className: 'bg-red-50 text-red-700 ring-1 ring-red-300' },       // [V20]
  WAITING_STOCK:    { label: 'Chờ hàng bù',    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' }, // [V20]
  DISPATCHED:       { label: 'Đã xuất kho',    className: 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' },
  CANCELLED:        { label: 'Đã huỷ',         className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200' },
};