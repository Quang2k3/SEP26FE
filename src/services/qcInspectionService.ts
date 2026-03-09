'use client';

import api from '@/config/axios';
import { ApiResponse } from '@/interfaces/common';
import { QCInspection } from '@/interfaces/qcInspection';

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

type QCInspectionPagePayload = {
  content: QCInspection[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
};

export async function getQCInspections(
  params?: GetQCInspectionsParams,
): Promise<QCInspection[]> {
  const { data } = await api.get<ApiResponse<QCInspectionPagePayload>>(
    '/qc-inspections',
    {
      params,
    },
  );

  // For now, keep the function contract as `QCInspection[]`
  // so that existing components continue to work.
  return data.data.content ?? [];
}

