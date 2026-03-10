"use client";

import api from "@/config/axios";
import {
  ReceivingOrder,
  ReceivingListQuery,
  ReceivingOrderPagePayload,
} from "@/interfaces/receiving";
import type { ApiResponse } from "@/interfaces/common";

// Backend now returns a paginated structure inside `data`
// {
//   success: true,
//   message: 'OK',
//   data: {
//     content: ReceivingOrder[],
//     page: number,
//     size: number,
//     totalElements: number,
//     totalPages: number,
//     last: boolean
//   },
//   timestamp: number
// }

export async function fetchReceivingOrders(
  params?: ReceivingListQuery,
): Promise<ReceivingOrderPagePayload> {
  const { data } = await api.get<ApiResponse<ReceivingOrderPagePayload>>(
    "/receiving-orders",
    { params },
  );

  return data.data;
}
