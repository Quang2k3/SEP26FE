import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface SkuOption {
  skuId: number;
  skuCode: string;
  skuName: string;
  unit: string | null;
  barcode: string | null;
}

interface SkuPageResponse {
  content: SkuOption[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// GET /v1/skus/search?keyword=...&page=0&size=20
export async function searchSkus(keyword?: string): Promise<SkuOption[]> {
  const { data } = await api.get<ApiResponse<SkuPageResponse>>('/skus/search', {
    params: { keyword: keyword || undefined, page: 0, size: 50 },
  });
  return data.data?.content ?? [];
}