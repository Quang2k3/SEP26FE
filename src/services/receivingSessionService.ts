import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface ReceivingSession {
  sessionId: string;
  warehouseId: number;
  scanToken: string | null;
  scanUrl: string | null;
  lines: unknown[];
}

export interface ScanTokenResponse {
  scanToken: string;
  sessionId: string;
  scanUrl: string;
}

export async function createReceivingSession(): Promise<ReceivingSession> {
  const { data } = await api.post<ApiResponse<ReceivingSession>>(
    '/receiving-sessions',
  );

  return data.data;
}

export async function generateScanToken(
  sessionId: string,
): Promise<ScanTokenResponse> {
  const { data } = await api.post<ApiResponse<ScanTokenResponse>>(
    `/receiving-sessions/${sessionId}/scan-token`,
  );

  return data.data;
}


