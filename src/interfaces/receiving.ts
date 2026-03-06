export type ReceivingStatus =
  | "SUBMITTED"
  | "APPROVED"
  | "POSTED";

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
  totalOkQty: number;
  totalDamagedQty: number;

  items: ReceivingItem[];
}

export interface ReceivingListQuery {
  status?: ReceivingStatus;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}