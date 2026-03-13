import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { CreateGrnPayload } from '@/interfaces/receiving';

// Khớp với BE ScanSessionResponse
export interface ReceivingSession {
  sessionId: string;
  warehouseId: number;
  scanToken: string | null;
  scanUrl: string | null;
  lines: unknown[];
}

// BE generateScanToken trả Map<String,String> với keys: scanToken, scanUrl
export interface ScanTokenResponse {
  scanToken: string;
  scanUrl: string;
  // sessionId KHÔNG có trong response BE — lấy từ path param đã biết
}

// POST /v1/receiving-sessions — tạo session mới
export async function createReceivingSession(): Promise<ReceivingSession> {
  const { data } = await api.post<ApiResponse<ReceivingSession>>(
    '/receiving-sessions',
  );
  return data.data;
}

// POST /v1/receiving-sessions/{sessionId}/scan-token
export async function generateScanToken(
  sessionId: string,
): Promise<ScanTokenResponse> {
  const { data } = await api.post<ApiResponse<ScanTokenResponse>>(
    `/receiving-sessions/${sessionId}/scan-token`,
  );
  return data.data;
}

// GET /v1/receiving-sessions/{sessionId}
export async function getSession(sessionId: string): Promise<ReceivingSession> {
  const { data } = await api.get<ApiResponse<ReceivingSession>>(
    `/receiving-sessions/${sessionId}`,
  );
  return data.data;
}

// DELETE /v1/receiving-sessions/{sessionId}
export async function deleteSession(sessionId: string): Promise<void> {
  await api.delete(`/receiving-sessions/${sessionId}`);
}

// POST /v1/receiving-sessions/{sessionId}/create-grn
export async function createGrnFromSession(
  sessionId: string,
  payload: CreateGrnPayload,
): Promise<{ receivingId: number; receivingCode: string }> {
  const { data } = await api.post<ApiResponse<{ receivingId: number; receivingCode: string }>>(
    `/receiving-sessions/${sessionId}/create-grn`,
    payload,
  );
  return data.data;
}