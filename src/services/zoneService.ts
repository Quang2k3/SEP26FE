import api from "@/config/axios";
import { Zone, ZoneQueryParams } from "@/interfaces/zone";
import type { ApiResponse } from "@/interfaces/common";

export async function fetchZones(params: ZoneQueryParams): Promise<Zone[]> {
  const { data } = await api.get<ApiResponse<Zone[]>>("/zones", {
    params: params,
  });

  if (!data.success || !data.data) {
    return [];
  }

  return data.data;
}