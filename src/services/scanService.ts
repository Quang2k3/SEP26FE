import api from '@/config/axios';

export async function getScanUrl(token: string): Promise<string> {
  const { data } = await api.get<string>('/scan/url', {
    params: { token },
  });

  return data;
}

