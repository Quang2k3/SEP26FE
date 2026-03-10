"use client";

import api from "@/config/axios";
import { ApiResponse } from "@/interfaces/common";
import { QCInspection, QCInspectionPagePayload } from "@/interfaces/qcInspection";

export interface GetQCInspectionsParams {
  status?: string;
}

// Backend now returns a paginated structure inside `data`
// {
//   success: true,
//   message: 'OK',
//   data: {
//     content: QCInspection[],
//     page: number,
//     size: number,
//     totalElements: number,
//     totalPages: number,
//     last: boolean
//   },
//   timestamp: number
// }

export async function getQCInspections(
  params?: GetQCInspectionsParams & { page?: number; size?: number },
): Promise<QCInspectionPagePayload> {
  const { data } = await api.get<ApiResponse<QCInspectionPagePayload>>(
    "/qc-inspections",
    {
      params,
    },
  );

  return data.data;
}
