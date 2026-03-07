import api from "@/config/axios";
import { Zone } from "@/interfaces/zone";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}

export async function fetchZones(activeOnly?: boolean): Promise<Zone[]> {
  const { data } = await api.get<ApiResponse<Zone[]>>("/zones", {
    params: { activeOnly },
  });

  if (!data.success || !data.data) {
    return [];
  }

  return data.data;
}