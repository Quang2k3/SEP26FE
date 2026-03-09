export type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED";

export interface Incident {
  incidentId: number;
  warehouseId: number;
  incidentCode: string;
  incidentType: string;
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
}

export interface IncidentListQuery {
  status?: IncidentStatus;
}

export interface CreateIncidentPayload {
  warehouseId: number;
  incidentType: string;
  description: string;
  receivingId: number;
  attachmentId?: number;
}