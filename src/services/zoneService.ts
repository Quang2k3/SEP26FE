import api from "@/config/axios";
import { Zone, ZoneQueryParams } from "@/interfaces/zone";
import type { ApiResponse } from "@/interfaces/common";
import { getStoredSession } from "@/services/authService";

export async function fetchZones(params: ZoneQueryParams): Promise<Zone[]> {
  // warehouseId bắt buộc ở BE — tự lấy từ session nếu caller không truyền
  let warehouseId = params.warehouseId;
  if (!warehouseId) {
    const session = getStoredSession();
    warehouseId = session?.user?.warehouseIds?.[0] ?? undefined;
  }

  if (!warehouseId) return []; // không có warehouseId → không gọi BE

  const { data } = await api.get<ApiResponse<any>>("/zones", {
    params: {
      warehouseId,
      activeOnly: params.activeOnly ?? true,
      size: 200,
    },
  });

  if (!data?.success || !data?.data) return [];

  // BE trả về PageResponse { content: Zone[] }
  if (Array.isArray(data.data.content)) return data.data.content;

  // Fallback nếu BE trả về Zone[] trực tiếp
  if (Array.isArray(data.data)) return data.data;

  return [];
}