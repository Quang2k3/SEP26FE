import api from "@/config/axios";
import { Zone } from "@/interfaces/zone";
import type { ApiResponse } from "@/interfaces/common";

export async function fetchZones(activeOnly?: boolean): Promise<Zone[]> {
  const { data } = await api.get<ApiResponse<Zone[]>>("/zones", {
    params: { activeOnly },
  });

  if (!data.success || !data.data) {
    return [];
  }

  return data.data;
}