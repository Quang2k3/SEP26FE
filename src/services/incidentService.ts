"use client";

import api from "@/config/axios";
import {
  Incident,
  IncidentListQuery,
  CreateIncidentPayload,
  IncidentPagePayload,
} from "@/interfaces/incident";
import type { ApiResponse } from "@/interfaces/common";

export async function fetchIncidents(
  params?: IncidentListQuery & { page?: number; size?: number },
): Promise<IncidentPagePayload> {
  const { data } = await api.get<ApiResponse<IncidentPagePayload>>(
    "/incidents",
    { params },
  );

  return data.data;
}

export const getIncidentDetail = async (id: number): Promise<Incident> => {
  const res = await api.get<ApiResponse<Incident>>(`/incidents/${id}`);

  return res.data.data;
};

export const createIncident = async (
  payload: CreateIncidentPayload,
): Promise<Incident> => {
  const res = await api.post<ApiResponse<Incident>>("/incidents", payload);

  return res.data.data;
};

export const rejectIncident = async (
  id: number,
  reason: string,
): Promise<Incident> => {
  const res = await api.post<ApiResponse<Incident>>(`/incidents/${id}/reject`, {
    reason,
  });

  return res.data.data;
};

export const approveIncident = async (id: number): Promise<Incident> => {
  const res = await api.post<ApiResponse<Incident>>(`/incidents/${id}/approve`);

  return res.data.data;
};

export const resolveDiscrepancy = async (
  id: number,
  items: { incidentItemId: number; action: string }[],
  note?: string,
): Promise<Incident> => {
  const res = await api.post<ApiResponse<Incident>>(
    `/incidents/${id}/resolve-discrepancy`,
    { items, note },
  );

  return res.data.data;
};
