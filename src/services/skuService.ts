import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';

export interface SkuOption {
  skuId: number;
  skuCode: string;
  skuName: string;
  unit: string | null;
  barcode: string | null;
  /** Hạn sử dụng tính theo ngày — dùng để tự tính HSD = SX + shelfLifeDays trên FE */
  shelfLifeDays: number | null;
  /** Trọng lượng 1 thùng (kg) */
  weightPerCartonKg: number | null;
  /** Số đơn vị lẻ trong 1 thùng */
  unitsPerCarton: number | null;
}

export interface SkuDetail extends SkuOption {
  description: string | null;
  brand: string | null;
  packageType: string | null;
  volumeMl: number | null;
  weightG: number | null;
  originCountry: string | null;
  imageUrl: string | null;
  active: boolean;
}

export interface SkuThreshold {
  skuId: number;
  skuCode: string;
  skuName: string;
  minQty: number | null;
  maxQty: number | null;
  warehouseId: number;
}

export interface SkuPageResponse {
  content: SkuDetail[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// GET /v1/skus/search?keyword=...&page=0&size=20
export async function searchSkus(keyword?: string, page = 0, size = 20): Promise<SkuPageResponse> {
  const { data } = await api.get<ApiResponse<SkuPageResponse>>('/skus/search', {
    params: { keyword: keyword || undefined, page, size },
  });
  return data.data;
}

// Backward-compat alias (dùng trong CreateOutboundModal)
export async function searchSkusSimple(keyword?: string): Promise<SkuOption[]> {
  const res = await searchSkus(keyword, 0, 50);
  return res.content ?? [];
}

// GET /v1/skus/{skuId}
export async function getSkuDetail(skuId: number): Promise<SkuDetail> {
  const { data } = await api.get<ApiResponse<SkuDetail>>(`/skus/${skuId}`);
  return data.data;
}

// GET /v1/skus/{skuId}/threshold
export async function getSkuThreshold(skuId: number): Promise<SkuThreshold> {
  const { data } = await api.get<ApiResponse<SkuThreshold>>(`/skus/${skuId}/threshold`);
  return data.data;
}

// PUT /v1/skus/{skuId}/threshold — MANAGER only
export async function updateSkuThreshold(
  skuId: number,
  minQty: number,
  maxQty: number,
): Promise<SkuThreshold> {
  const { data } = await api.put<ApiResponse<SkuThreshold>>(`/skus/${skuId}/threshold`, {
    minQty,
    maxQty,
  });
  return data.data;
}