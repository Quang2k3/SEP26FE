"use client";

import api from "@/config/axios";
import {
  Incident,
  IncidentListQuery,
  ApiResponse,
} from "@/interface/incident";

export async function fetchIncidents(
  params?: IncidentListQuery,
): Promise<Incident[]> {
  const { data } = await api.get<ApiResponse<Incident[]>>(
    "/v1/incidents",
    { params },
  );

  return data.data;
}