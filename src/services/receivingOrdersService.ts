"use client";

import api from "@/config/axios";
import { ReceivingOrder, ReceivingListQuery } from "@/interfaces/receiving";
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

type ReceivingOrderPagePayload = {
  content: ReceivingOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export async function fetchReceivingOrders(
  params?: ReceivingListQuery,
): Promise<ReceivingOrder[]> {
  const { data } = await api.get<ApiResponse<ReceivingOrderPagePayload>>(
    "/receiving-orders",
    { params },
  );

  // Keep returning an array for existing components.
  return data.data.content ?? [];
}
