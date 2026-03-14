// BE ReceivingOrderStatus enum — đúng với BE
export type ReceivingStatus =
  | "DRAFT"
  | "PENDING_COUNT"     // sau khi submit (DRAFT → PENDING_COUNT)
  | "SUBMITTED"         // sau khi finalize-count (PENDING_COUNT → SUBMITTED)
  | "PENDING_INCIDENT"
  | "QC_APPROVED"
  | "GRN_CREATED"
  | "POSTED";

export interface ReceivingItem {
  receivingItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  unit: string;
  receivedQty: number;
  expectedQty: number;
  lotNumber: string | null;
  expiryDate: string | null;
  manufactureDate: string | null;
  note: string | null;
  condition: string | null;
  reasonCode: string | null;
}

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
  totalQty: number;
  totalExpectedQty: number;

  items: ReceivingItem[];
}

export interface ReceivingOrderPagePayload {
  content: ReceivingOrder[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
  last: boolean;
}

export interface ReceivingListQuery {
  status?: ReceivingStatus;
  page?: number;
  size?: number;
}

export interface CreateGrnPayload {
  sourceType: string;
  supplierCode?: string | null;
  sourceReferenceCode?: string | null;
  lotNumber?: string | null;
  expiryDate?: string | null;
  manufactureDate?: string | null;
  note?: string | null;
}