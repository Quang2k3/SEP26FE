 'use client';

 import api from '@/config/axios';

 type LocationType = 'AISLE' | 'RACK' | 'BIN' | 'STAGING';

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
   warehouseId: number;
   zoneId?: number;
   locationType?: LocationType;
   active?: boolean;
   keyword?: string;
   page?: number;
   size?: number;
 }

 export async function fetchLocations(
   params: LocationQueryParams,
 ): Promise<LocationPage> {
   const { data } = await api.get<ApiResponse<LocationPage>>('/v1/locations', {
     params,
   });

   // Phòng trường hợp API trả về khác kỳ vọng
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

