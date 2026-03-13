import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { ReceivingOrderPagePayload } from '@/interfaces/receiving';

export interface NotificationItem {
  receivingId: number;
  receivingCode: string;
  supplierName: string | null;
  warehouseName: string | null;
  createdAt: string;
  status: string;
}

export interface NotificationGroup {
  role: 'KEEPER' | 'QC' | 'MANAGER';
  label: string;
  status: string;         // status filter để fetch
  navigateTo: string;     // trang navigate khi click
  items: NotificationItem[];
  count: number;
}

// Fetch số lượng + danh sách phiếu theo status
export async function fetchNotificationsByStatus(
  status: string,
  size = 5,
): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<ReceivingOrderPagePayload>>(
      '/receiving-orders',
      { params: { status, page: 0, size } },
    );
    return (data.data?.content ?? []).map((r) => ({
      receivingId: r.receivingId,
      receivingCode: r.receivingCode,
      supplierName: r.supplierName,
      warehouseName: r.warehouseName,
      createdAt: r.createdAt,
      status: r.status,
    }));
  } catch {
    return [];
  }
}