import { ApiResponse } from './common';

export interface QCInspection {
  inspectionId: number;
  warehouseId: number;
  lotId: number;
  inspectionCode: string;
  status: string;
  lotNumber: string;
  skuId: number;
  skuCode: string;
  skuName: string;
  inspectedBy: number;
  inspectedByName: string;
  inspectedAt: string;
  remarks: string;
  attachmentId: number;
  decision: string;
  createdAt: string;
}

export interface QCInspectionListResponse {
  success: boolean;
  message: string;
  data: QCInspection[];
  timestamp: number;
}

export type QCInspectionStatus = 'PENDING' | 'INSPECTED' | 'DECIDED' | 'ALL';



export interface QCInspectionPagePayload  {
  content: QCInspection[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};