 'use client';

 import api from '@/config/axios';
import { ApiResponse } from '@/interfaces/common';
import { LocationPage, LocationQueryParams } from '@/interfaces/location';

 

 export async function fetchLocations(
   params: LocationQueryParams,
 ): Promise<LocationPage> {
   const { data } = await api.get<ApiResponse<LocationPage>>('/locations', {
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

