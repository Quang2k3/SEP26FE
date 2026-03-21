export type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "RESOLVED";

export interface IncidentItem {
  incidentItemId: number;
  skuId: number;
  skuCode: string;
  skuName: string;
  expectedQty: number;
  actualQty: number;
  damagedQty: number;
  reasonCode: string; // SHORTAGE | OVERAGE | UNEXPECTED_ITEM
  note: string;
}

export interface Incident {
  incidentId: number;
  warehouseId: number;
  incidentCode: string;
  incidentType: string;
  category?: string;
  severity: string;
  occurredAt: string;
  description: string;
  reportedBy: number;
  reportedByName: string;
  attachmentId: number;
  status: IncidentStatus;
  receivingId: number;
  receivingCode: string;
  createdAt: string;
  soId?: number | null;    // [V20] outbound incidents
  items?: IncidentItem[];
}

export interface IncidentPagePayload {
  content: Incident[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}

export interface IncidentListQuery {
  status?: IncidentStatus | 'ALL';
  category?: 'GATE' | 'QUALITY';
  page?: number;
  size?: number;
}

export interface CreateIncidentPayload {
  warehouseId: number;
  category: 'GATE' | 'QUALITY';
  incidentType: string;
  description: string;
  receivingId?: number;
  attachmentId?: number;
}