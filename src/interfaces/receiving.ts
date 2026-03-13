export type ReceivingStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "POSTED";

export interface ReceivingItem {
  receivingItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  unit: string;
  receivedQty: number;
  lotNumber: string;
  expiryDate: string;
  manufactureDate: string;
  note: string;
  condition: string;
  reasonCode: string;
  // Một số API có thể trả thêm expectedQty
  expectedQty?: number;
}

export interface ReceivingOrderPagePayload {
  content: ReceivingOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface ReceivingOrder {
  receivingId: number;
  receivingCode: string;
  status: ReceivingStatus;

  warehouseId: number;
  warehouseName: string;

  supplierId: number;
  supplierName: string;

  sourceType: string;
  sourceReferenceCode: string;

  note: string;

  createdBy: number;
  createdByName: string;
  createdAt: string;

  totalLines: number;
  totalQty: number;
  // Một số API có thể trả thêm các trường chi tiết hoặc expected
  totalExpectedQty?: number;
  totalOkQty?: number;
  totalDamagedQty?: number;

  items: ReceivingItem[];
}

export interface ReceivingListQuery {
  status?: ReceivingStatus;
  page: number;
  size: number;
}

// Request types for creating receiving orders
export interface ReceivingOrderItemRequest {
  skuCode: string;
  expectedQty: number;
  lotNumber?: string;
  manufactureDate?: string;
  expiryDate?: string;
}

export interface ReceivingOrderRequest {
  sourceType: string; // e.g. SUPPLIER, TRANSFER, RETURN
  sourceReferenceCode: string;
  supplierCode: string;
  sourceWarehouseId: number;
  note?: string;
  // Cho phép tạo RO chỉ với thông tin header, items có thể được bổ sung sau
  items?: ReceivingOrderItemRequest[];
}