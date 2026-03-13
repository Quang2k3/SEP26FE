import api from '@/config/axios';

// GET /v1/scan/url — BE trả plain text URL
// Cần Accept: text/plain vì BE produces = TEXT_PLAIN_VALUE
export async function getScanUrl(
  token: string,
  receivingId?: number | null,
): Promise<string> {
  const params: Record<string, unknown> = { token };
  if (receivingId != null) {
    params.receivingId = receivingId;
  }

  const { data } = await api.get<string>('/scan/url', {
    params,
    headers: { Accept: 'text/plain' },
    responseType: 'text',
  });

  return data;
}