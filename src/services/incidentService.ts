"use client";

import api from "@/config/axios";
import { Incident, IncidentListQuery, CreateIncidentPayload } from "@/interfaces/incident";
import type { ApiResponse } from "@/interfaces/common";

export async function fetchIncidents(
  params?: IncidentListQuery,
): Promise<Incident[]> {
  const { data } = await api.get<ApiResponse<Incident[]>>("/incidents", {
    params,
  });

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
