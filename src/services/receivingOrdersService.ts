"use client";

import api from "@/config/axios";
import {
  ReceivingOrder,
  ReceivingListQuery,
  ApiResponse,
} from "@/interface/receiving";

export async function fetchReceivingOrders(
  params?: ReceivingListQuery
): Promise<ReceivingOrder[]> {
  const { data } = await api.get<ApiResponse<ReceivingOrder[]>>(
    "/receiving-orders",
    { params }
  );

  return data.data;
}