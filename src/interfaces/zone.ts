export interface Zone {
  zoneId: number;
  warehouseId: number;
  zoneCode: string;
  zoneName: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ZoneQueryParams {
  activeOnly?: boolean;
  warehouseId ?: number;
}