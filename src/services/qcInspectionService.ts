'use client';

import api from '@/config/axios';
import { ApiResponse } from '@/interfaces/common';
import { QCInspection } from '@/interfaces/qcInspection';

export interface GetQCInspectionsParams {
  status?: string;
}

export async function getQCInspections(
  params?: GetQCInspectionsParams,
): Promise<QCInspection[]> {
  const { data } = await api.get<ApiResponse<QCInspection[]>>('/qc-inspections', {
    params,
  });
  return data.data;
}

