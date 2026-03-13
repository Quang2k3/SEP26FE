import api from '@/config/axios';

// GET /v1/scan/url?token=...&receivingId=...
// BE trả về plain text URL
export async function getScanUrl(
  token: string,
  receivingId?: number | null,
): Promise<string> {
  const params: Record<string, unknown> = { token };
  if (receivingId != null) {
    params.receivingId = receivingId;
  }

  const { data } = await api.get<string>('/scan/url', { params });
  return data;
}