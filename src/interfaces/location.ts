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
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  isPickingFace: boolean;
  isStaging: boolean;
  /** Khu hàng lỗi — FEFO allocation bỏ qua BIN này */
  isDefect: boolean;
  /** Tầng BIN: 1=dưới/512kg, 2=giữa/448kg, 3=trên/400kg. Null nếu AISLE/RACK. */
  binFloor: number | null;
  /** Cột BIN: 1=trái, 2=giữa, 3=phải. Kết hợp binFloor×binColumn = 1 ô duy nhất trong rack. */
  binColumn: number | null;
  /** Số thùng tối đa ước tính (max_weight_kg ÷ 16kg chuẩn). */
  maxBoxCount: number | null;
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

  /** Tầng BIN (1=dưới/512kg · 2=giữa/448kg · 3=trên/400kg). Bắt buộc khi locationType = BIN. */
  binFloor?: number;
  /** Cột BIN (1=trái · 2=giữa · 3=phải). Bắt buộc khi locationType = BIN. */
  binColumn?: number;
  isPickingFace?: boolean;
  isStaging?: boolean;
  isDefect?: boolean;
}

export interface UpdateLocationRequest {
  maxWeightKg: number;
  maxVolumeM3: number;
  isPickingFace: boolean;
  isStaging: boolean;
}