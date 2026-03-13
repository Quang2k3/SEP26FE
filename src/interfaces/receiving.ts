// BE ReceivingOrderStatus enum
export type ReceivingStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "PENDING_INCIDENT"
  | "QC_APPROVED"
  | "GRN_CREATED"
  | "POSTED";

// Khớp với BE ReceivingItemResponse
export interface ReceivingItem {
  receivingItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  unit: string;
  receivedQty: number;       // BE BigDecimal
  expectedQty: number;       // BE BigDecimal
  lotNumber: string | null;
  expiryDate: string | null;      // BE LocalDate → "yyyy-MM-dd"
  manufactureDate: string | null; // BE LocalDate → "yyyy-MM-dd"
  note: string | null;
  condition: string | null;       // "PASS" | "FAIL"
  reasonCode: string | null;
}

// Khớp với BE ReceivingOrderResponse
export interface ReceivingOrder {
  receivingId: number;
  receivingCode: string;
  status: ReceivingStatus;

  warehouseId: number;
  warehouseName: string;

  supplierId: number | null;
  supplierName: string | null;

  sourceType: string;
  sourceReferenceCode: string | null;
  note: string | null;

  createdBy: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;

  totalLines: number;
  totalQty: number;           // BE BigDecimal
  totalExpectedQty: number;   // BE BigDecimal — THÊM MỚI

  items: ReceivingItem[];
}

// Khớp với BE PageResponse<T>: content, page, size, totalElements, totalPages, last
export interface ReceivingOrderPagePayload {
  content: ReceivingOrder[];
  totalElements: number;
  totalPages: number;
  page: number;       // BE dùng "page" (0-indexed), không phải "currentPage"
  size: number;       // BE dùng "size", không phải "pageSize"
  last: boolean;
}

// Query params cho GET /v1/receiving-orders
export interface ReceivingListQuery {
  status?: ReceivingStatus;   // Không gửi nếu muốn ALL
  page?: number;
  size?: number;
}

// Payload tạo GRN từ session — khớp với BE CreateGrnRequest
export interface CreateGrnPayload {
  sourceType: string;          // "SUPPLIER" | "TRANSFER" | "RETURN"
  supplierCode?: string | null;
  sourceReferenceCode?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;  // "yyyy-MM-dd"
  manufactureDate?: string | null;
  note?: string | null;
}