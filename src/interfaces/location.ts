export type LocationType = "AISLE" | "RACK" | "BIN" | "STAGING";

export interface Location {
  locationId: number;
  warehouseId: number;
  zoneId: number;
  zoneCode: string;
  locationCode: string;
  locationType: LocationType;
  parentLocationId: number | null;
  parentLocationCode: string | null;
  maxWeightKg: number;
  maxVolumeM3: number;
  isPickingFace: boolean;
  isStaging: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LocationPage {
  content: Location[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
}

export interface LocationQueryParams {
  zoneId?: number;
  locationType?: LocationType;
  active?: boolean;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface CreateLocationRequest {
  zoneId: number;
  locationCode: string;
  locationType: LocationType;

  parentLocationId?: number;

  maxWeightKg?: number;
  maxVolumeM3?: number;

  isPickingFace?: boolean;
  isStaging?: boolean;
}

export interface UpdateLocationRequest {
  maxWeightKg: number;
  maxVolumeM3: number;
  isPickingFace: boolean;
  isStaging: boolean;
}
