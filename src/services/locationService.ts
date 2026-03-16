"use client";

import api from "@/config/axios";
import { ApiResponse } from "@/interfaces/common";
import {
  Location,
  LocationPage,
  LocationQueryParams,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "@/interfaces/location";

/**
 * GET locations (pagination + filters)
 */
export async function fetchLocations(
  params: LocationQueryParams,
): Promise<LocationPage> {
  const { data } = await api.get<ApiResponse<LocationPage>>("/locations", {
    params,
  });

  if (!data.success || !data.data) {
    return {
      content: [],
      page: params.page ?? 0,
      size: params.size ?? 20,
      totalElements: 0,
      totalPages: 0,
      last: true,
    };
  }

  return data.data;
}

/**
 * GET location detail
 */
export async function fetchLocationById(
  locationId: number,
): Promise<Location | null> {
  const { data } = await api.get<ApiResponse<Location>>(
    `/locations/${locationId}`,
  );

  if (!data.success || !data.data) {
    return null;
  }

  return data.data;
}

/**
 * CREATE location
 */
export async function createLocation(payload: CreateLocationRequest) {
  const { data } = await api.post("/locations", payload);

  return data.data;
}

/**
 * UPDATE location
 */
export async function updateLocation(
  locationId: number,
  payload: UpdateLocationRequest,
) {
  const { data } = await api.put(`/locations/${locationId}`, payload);

  return data.data;
}

/**
 * DEACTIVATE location
 */
export async function deactivateLocation(locationId: number) {
  await api.patch(`/locations/${locationId}/deactivate`);
}

/**
 * REACTIVATE location
 */
export async function reactivateLocation(locationId: number) {
  await api.patch(`/locations/${locationId}/reactivate`);
}