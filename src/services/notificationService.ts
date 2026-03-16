import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { ReceivingOrderPagePayload } from '@/interfaces/receiving';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NotificationItem {
  id: string;               // unique key
  code: string;             // mã phiếu hiển thị
  subtitle: string;         // supplier / customer / mô tả
  createdAt: string;
  status: string;
  type: NotificationType;
  navigateTo: string;
}

export type NotificationType =
  | 'receiving_pending_qc'       // QC: phiếu chờ kiểm định
  | 'grn_pending_approval'       // Manager: GRN chờ duyệt
  | 'outbound_pending_approval'  // Manager: lệnh xuất chờ duyệt
  | 'incident_open'              // Manager + Keeper: sự cố mở
  | 'putaway_pending'            // Keeper: task putaway chờ xử lý

export interface NotificationChannel {
  type: NotificationType;
  label: string;
  icon: string;
  color: string;
  dot: string;              // tailwind bg color cho dot
}

export const NOTIFICATION_CHANNELS: Record<NotificationType, NotificationChannel> = {
  receiving_pending_qc:      { type: 'receiving_pending_qc',      label: 'Chờ QC kiểm định',      icon: 'verified',         color: 'text-amber-600',  dot: 'bg-amber-400'  },
  grn_pending_approval:      { type: 'grn_pending_approval',      label: 'GRN chờ duyệt',          icon: 'pending_actions',  color: 'text-violet-600', dot: 'bg-violet-400' },
  outbound_pending_approval: { type: 'outbound_pending_approval', label: 'Lệnh xuất chờ duyệt',   icon: 'output_circle',    color: 'text-blue-600',   dot: 'bg-blue-400'   },
  incident_open:             { type: 'incident_open',             label: 'Sự cố chưa xử lý',       icon: 'warning',          color: 'text-red-600',    dot: 'bg-red-400'    },
  putaway_pending:           { type: 'putaway_pending',           label: 'Putaway cần thực hiện',   icon: 'shelves',          color: 'text-indigo-600', dot: 'bg-indigo-400' },
};

// Kênh thông báo theo role
export const ROLE_CHANNELS: Record<string, NotificationType[]> = {
  MANAGER: ['grn_pending_approval', 'outbound_pending_approval', 'incident_open'],
  QC:      ['receiving_pending_qc'],
  KEEPER:  ['putaway_pending', 'incident_open'],
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchReceivingByStatus(status: string, size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<ReceivingOrderPagePayload>>(
      '/receiving-orders', { params: { status, page: 0, size } }
    );
    return (data.data?.content ?? []).map(r => ({
      id: `rcv-${r.receivingId}`,
      code: r.receivingCode,
      subtitle: r.supplierName ?? r.warehouseName ?? '—',
      createdAt: r.createdAt,
      status: r.status,
      type: 'receiving_pending_qc' as NotificationType,
      navigateTo: '/inbound/gate-check',
    }));
  } catch { return []; }
}

async function fetchGrnPendingApproval(size = 8): Promise<NotificationItem[]> {
  try {
    // Dùng receiving-orders với status PENDING_APPROVAL (đã được test hoạt động)
    const { data } = await api.get<ApiResponse<any>>('/receiving-orders', {
      params: { status: 'PENDING_APPROVAL', page: 0, size }
    });
    const content: any[] = data.data?.content ?? [];
    return content.map((r: any) => ({
      id: `grn-${r.receivingId}`,
      code: r.receivingCode,
      subtitle: r.supplierName ?? `Phiếu #${r.receivingId}`,
      createdAt: r.createdAt,
      status: r.status,
      type: 'grn_pending_approval' as NotificationType,
      navigateTo: '/manager-dashboard/grn',
    }));
  } catch { return []; }
}

async function fetchOutboundPendingApproval(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/outbound', { params: { status: 'PENDING_APPROVAL', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((o: any) => ({
      id: `out-${o.documentId}`,
      code: o.documentCode ?? `#${o.documentId}`,
      subtitle: o.customerName ?? o.warehouseName ?? '—',
      createdAt: o.createdAt,
      status: o.status,
      type: 'outbound_pending_approval' as NotificationType,
      navigateTo: '/outbound',
    }));
  } catch {
    return []; // silent — outbound API có thể chưa có filter status
  }
}

async function fetchOpenIncidents(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/incidents', { params: { status: 'OPEN', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((i: any) => ({
      id: `inc-${i.incidentId}`,
      code: i.incidentCode ?? `Sự cố #${i.incidentId}`,
      subtitle: i.description ?? i.receivingCode ?? '—',
      createdAt: i.createdAt,
      status: i.status,
      type: 'incident_open' as NotificationType,
      navigateTo: '/manager-dashboard/incident',
    }));
  } catch { return []; }
}

async function fetchPutawayPending(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/putaway-tasks', { params: { page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content
      .filter((t: any) => t.status === 'PENDING' || t.status === 'OPEN')
      .map((t: any) => ({
        id: `put-${t.putawayTaskId}`,
        code: `Task #${t.putawayTaskId}`,
        subtitle: `GRN #${t.grnId} · Kho #${t.warehouseId}`,
        createdAt: t.createdAt,
        status: t.status,
        type: 'putaway_pending' as NotificationType,
        navigateTo: '/tasks',
      }));
  } catch { return []; }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchNotificationsForRole(
  role: string
): Promise<Map<NotificationType, NotificationItem[]>> {
  const channels = ROLE_CHANNELS[role] ?? [];
  const result = new Map<NotificationType, NotificationItem[]>();

  await Promise.all(channels.map(async (type) => {
    let items: NotificationItem[] = [];
    // FIX: QC cần thấy cả PENDING_COUNT (Keeper nộp xong = chờ QC kiểm)
    // và SUBMITTED (Keeper finalizeCount). Merge 2 list, dedup theo receivingId.
    if (type === 'receiving_pending_qc') {
      const [pendingCount, submitted] = await Promise.all([
        fetchReceivingByStatus('PENDING_COUNT'),
        fetchReceivingByStatus('SUBMITTED'),
      ]);
      const seen = new Set<string>();
      items = [...pendingCount, ...submitted].filter(i => {
        if (seen.has(i.id)) return false;
        seen.add(i.id);
        return true;
      });
    }
    if (type === 'grn_pending_approval')       items = await fetchGrnPendingApproval();
    if (type === 'outbound_pending_approval')  items = await fetchOutboundPendingApproval();
    if (type === 'incident_open')              items = await fetchOpenIncidents();
    if (type === 'putaway_pending')            items = await fetchPutawayPending();
    result.set(type, items);
  }));

  return result;
}

// Legacy compat
export async function fetchNotificationsByStatus(status: string, size = 5): Promise<NotificationItem[]> {
  return fetchReceivingByStatus(status, size);
}
