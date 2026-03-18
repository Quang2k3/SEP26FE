import api from '@/config/axios';

/**
 * Build scan URL pointing to the Next.js /scan page.
 * Uses NEXT_PUBLIC_FE_BASE_URL env var.
 * Falls back to window.location.origin on client (always has domain).
 */
export function getScanUrl(
  token: string,
  receivingId?: number | null,
): Promise<string> {
  // NEXT_PUBLIC vars are inlined at build time — always available
  const base = process.env.NEXT_PUBLIC_FE_BASE_URL ?? '';
  let url = `${base}/scan?token=${encodeURIComponent(token)}`;
  if (receivingId != null) url += `&receivingId=${receivingId}`;
  return Promise.resolve(url);
}

/** @deprecated Still available for legacy use */
export async function getScanUrlFromBE(
  token: string,
  receivingId?: number | null,
): Promise<string> {
  const params: Record<string, unknown> = { token };
  if (receivingId != null) params.receivingId = receivingId;
  const { data } = await api.get<string>('/scan/url', {
    params,
    headers: { Accept: 'text/plain' },
    responseType: 'text',
  });
  return data;
}