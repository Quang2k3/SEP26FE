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
  // ── QC ──────────────────────────────────────────────────────────────────────
  | 'receiving_pending_qc'       // QC: phiếu nhận hàng chờ kiểm định (PENDING_COUNT / SUBMITTED)
  | 'qc_outbound_pending'        // QC: outbound đã pick xong, chờ QC quét trước dispatch (QC_SCAN)

  // ── MANAGER ─────────────────────────────────────────────────────────────────
  | 'grn_pending_approval'       // Manager: GRN chờ duyệt (PENDING_APPROVAL)
  | 'outbound_pending_approval'  // Manager: lệnh xuất chờ duyệt (PENDING_APPROVAL)
  | 'incident_open'              // Manager + Keeper: sự cố chưa xử lý (OPEN)

  // ── KEEPER ──────────────────────────────────────────────────────────────────
  | 'putaway_pending'            // Keeper: putaway task chờ thực hiện (PENDING / OPEN)
  | 'grn_approved'               // Keeper: GRN đã được Manager duyệt → cần post nhập kho (APPROVED)
  | 'grn_rejected'               // Keeper: GRN bị Manager từ chối → cần xử lý lại (REJECTED)
  | 'outbound_pick_pending'      // Keeper: outbound được duyệt → có pick task cần thực hiện (PICKING)

export interface NotificationChannel {
  type: NotificationType;
  label: string;
  icon: string;             // material symbols icon name
  color: string;            // tailwind text color
  dot: string;              // tailwind bg color cho badge dot
}

// ─── Channel config ───────────────────────────────────────────────────────────

export const NOTIFICATION_CHANNELS: Record<NotificationType, NotificationChannel> = {
  // QC
  receiving_pending_qc:      { type: 'receiving_pending_qc',      label: 'Chờ QC kiểm định',           icon: 'verified',          color: 'text-amber-600',   dot: 'bg-amber-400'   },
  qc_outbound_pending:       { type: 'qc_outbound_pending',       label: 'Outbound chờ QC quét',        icon: 'qr_code_scanner',   color: 'text-orange-600',  dot: 'bg-orange-400'  },

  // Manager
  grn_pending_approval:      { type: 'grn_pending_approval',      label: 'GRN chờ duyệt',               icon: 'pending_actions',   color: 'text-violet-600',  dot: 'bg-violet-400'  },
  outbound_pending_approval: { type: 'outbound_pending_approval', label: 'Lệnh xuất chờ duyệt',         icon: 'output_circle',     color: 'text-blue-600',    dot: 'bg-blue-400'    },
  incident_open:             { type: 'incident_open',             label: 'Sự cố chưa xử lý',            icon: 'warning',           color: 'text-red-600',     dot: 'bg-red-400'     },

  // Keeper
  putaway_pending:           { type: 'putaway_pending',           label: 'Putaway cần thực hiện',       icon: 'shelves',           color: 'text-indigo-600',  dot: 'bg-indigo-400'  },
  grn_approved:              { type: 'grn_approved',              label: 'GRN đã duyệt — cần nhập kho', icon: 'check_circle',      color: 'text-green-600',   dot: 'bg-green-400'   },
  grn_rejected:              { type: 'grn_rejected',              label: 'GRN bị từ chối',               icon: 'cancel',            color: 'text-rose-600',    dot: 'bg-rose-400'    },
  outbound_pick_pending:     { type: 'outbound_pick_pending',     label: 'Có task pick cần thực hiện',  icon: 'inventory',         color: 'text-cyan-600',    dot: 'bg-cyan-400'    },
};

// ─── Kênh thông báo theo role ─────────────────────────────────────────────────

export const ROLE_CHANNELS: Record<string, NotificationType[]> = {
  MANAGER: [
    'grn_pending_approval',
    'outbound_pending_approval',
    'incident_open',
  ],
  QC: [
    'receiving_pending_qc',
    'qc_outbound_pending',
  ],
  KEEPER: [
    'putaway_pending',
    'grn_approved',
    'grn_rejected',
    'outbound_pick_pending',
    'incident_open',
  ],
};

// ─── Navigate map ─────────────────────────────────────────────────────────────
// Dùng trong NotificationBell footer "Xem tất cả"

export const NOTIFICATION_NAV: Record<NotificationType, string> = {
  receiving_pending_qc:      '/inbound/gate-check',
  qc_outbound_pending:       '/outbound-qc',
  grn_pending_approval:      '/manager-dashboard/grn',
  outbound_pending_approval: '/outbound',
  incident_open:             '/manager-dashboard/incident',
  putaway_pending:           '/tasks',
  grn_approved:              '/manager-dashboard/grn',
  grn_rejected:              '/manager-dashboard/grn',
  outbound_pick_pending:     '/outbound',
};

// ─── Fetch helpers ────────────────────────────────────────────────────────────

/**
 * QC — phiếu nhận hàng chờ kiểm định.
 * Gộp PENDING_COUNT (Keeper đã finalizeCount) + SUBMITTED (Keeper nộp scan session),
 * dedup theo receivingId.
 */
async function fetchReceivingPendingQc(size = 8): Promise<NotificationItem[]> {
  try {
    const [pendingCount, submitted] = await Promise.all([
      fetchReceivingByStatus('PENDING_COUNT', size),
      fetchReceivingByStatus('SUBMITTED', size),
    ]);
    const seen = new Set<string>();
    return [...pendingCount, ...submitted].filter(i => {
      if (seen.has(i.id)) return false;
      seen.add(i.id);
      return true;
    });
  } catch { return []; }
}

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

/**
 * QC — outbound đã pick xong (status QC_SCAN), chờ QC quét trước dispatch.
 */
async function fetchQcOutboundPending(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/outbound', { params: { status: 'QC_SCAN', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((o: any) => ({
      id: `qc-out-${o.documentId}`,
      code: o.documentCode ?? `#${o.documentId}`,
      subtitle: o.customerName ?? o.warehouseName ?? '—',
      createdAt: o.createdAt,
      status: o.status,
      type: 'qc_outbound_pending' as NotificationType,
      navigateTo: '/outbound-qc',
    }));
  } catch { return []; }
}

/**
 * Manager — GRN chờ duyệt (PENDING_APPROVAL).
 * NOTE: dùng /receiving-orders vì đây là receiving order ở status PENDING_APPROVAL
 * (GRN đã được Keeper submit lên Manager).
 */
async function fetchGrnPendingApproval(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>('/receiving-orders', {
      params: { status: 'PENDING_APPROVAL', page: 0, size }
    });
    const content: any[] = data.data?.content ?? [];
    return content.map((r: any) => ({
      id: `grn-appr-${r.receivingId}`,
      code: r.receivingCode,
      subtitle: r.supplierName ?? `Phiếu #${r.receivingId}`,
      createdAt: r.createdAt,
      status: r.status,
      type: 'grn_pending_approval' as NotificationType,
      navigateTo: '/manager-dashboard/grn',
    }));
  } catch { return []; }
}

/**
 * Manager — lệnh xuất hàng chờ duyệt (PENDING_APPROVAL).
 */
async function fetchOutboundPendingApproval(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/outbound', { params: { status: 'PENDING_APPROVAL', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((o: any) => ({
      id: `out-appr-${o.documentId}`,
      code: o.documentCode ?? `#${o.documentId}`,
      subtitle: o.customerName ?? o.warehouseName ?? '—',
      createdAt: o.createdAt,
      status: o.status,
      type: 'outbound_pending_approval' as NotificationType,
      navigateTo: '/outbound',
    }));
  } catch { return []; }
}

/**
 * Manager + Keeper — sự cố chưa xử lý (OPEN).
 * - Manager điều hướng về /manager-dashboard/incident
 * - Keeper điều hướng về /incidents
 * Hàm nhận navigateTo để tái sử dụng cho cả 2 role.
 */
async function fetchOpenIncidents(
  navigateTo: string,
  size = 8
): Promise<NotificationItem[]> {
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
      navigateTo,
    }));
  } catch { return []; }
}

/**
 * Keeper — putaway task chờ thực hiện (PENDING hoặc OPEN).
 */
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

/**
 * Keeper — GRN đã được Manager duyệt (APPROVED), chờ Keeper post nhập kho.
 */
async function fetchGrnApproved(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/grns', { params: { status: 'APPROVED', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((g: any) => ({
      id: `grn-ok-${g.grnId}`,
      code: g.grnCode ?? `GRN #${g.grnId}`,
      subtitle: g.supplierName ?? g.receivingCode ?? '—',
      createdAt: g.createdAt,
      status: g.status,
      type: 'grn_approved' as NotificationType,
      navigateTo: '/manager-dashboard/grn',
    }));
  } catch { return []; }
}

/**
 * Keeper — GRN bị Manager từ chối (REJECTED), cần xem lại và xử lý.
 */
async function fetchGrnRejected(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/grns', { params: { status: 'REJECTED', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((g: any) => ({
      id: `grn-rej-${g.grnId}`,
      code: g.grnCode ?? `GRN #${g.grnId}`,
      subtitle: g.supplierName ?? g.receivingCode ?? '—',
      createdAt: g.createdAt,
      status: g.status,
      type: 'grn_rejected' as NotificationType,
      navigateTo: '/manager-dashboard/grn',
    }));
  } catch { return []; }
}

/**
 * Keeper — outbound đã được Manager duyệt và đang trong quá trình picking
 * (SO status = PICKING). Có pick task OPEN cần Keeper thực hiện.
 */
async function fetchOutboundPickPending(size = 8): Promise<NotificationItem[]> {
  try {
    const { data } = await api.get<ApiResponse<any>>(
      '/outbound', { params: { status: 'PICKING', page: 0, size } }
    );
    const content: any[] = data.data?.content ?? [];
    return content.map((o: any) => ({
      id: `pick-${o.documentId}`,
      code: o.documentCode ?? `#${o.documentId}`,
      subtitle: o.customerName ?? o.warehouseName ?? '—',
      createdAt: o.createdAt,
      status: o.status,
      type: 'outbound_pick_pending' as NotificationType,
      navigateTo: '/outbound',
    }));
  } catch { return []; }
}

// ─── Main fetch function ──────────────────────────────────────────────────────

export async function fetchNotificationsForRole(
  role: string
): Promise<Map<NotificationType, NotificationItem[]>> {
  const channels = ROLE_CHANNELS[role] ?? [];
  const result = new Map<NotificationType, NotificationItem[]>();

  await Promise.all(
    channels.map(async (type) => {
      let items: NotificationItem[] = [];

      switch (type) {
        // ── QC ────────────────────────────────────────────────────────────────
        case 'receiving_pending_qc':
          items = await fetchReceivingPendingQc();
          break;

        case 'qc_outbound_pending':
          items = await fetchQcOutboundPending();
          break;

        // ── Manager ───────────────────────────────────────────────────────────
        case 'grn_pending_approval':
          items = await fetchGrnPendingApproval();
          break;

        case 'outbound_pending_approval':
          items = await fetchOutboundPendingApproval();
          break;

        case 'incident_open':
          // Manager → /manager-dashboard/incident | Keeper → /incidents
          items = await fetchOpenIncidents(
            role === 'MANAGER' ? '/manager-dashboard/incident' : '/incidents'
          );
          break;

        // ── Keeper ────────────────────────────────────────────────────────────
        case 'putaway_pending':
          items = await fetchPutawayPending();
          break;

        case 'grn_approved':
          items = await fetchGrnApproved();
          break;

        case 'grn_rejected':
          items = await fetchGrnRejected();
          break;

        case 'outbound_pick_pending':
          items = await fetchOutboundPickPending();
          break;
      }

      result.set(type, items);
    })
  );

  return result;
}

// ─── Legacy compat ────────────────────────────────────────────────────────────

/** @deprecated Dùng fetchNotificationsForRole thay thế */
export async function fetchNotificationsByStatus(
  status: string,
  size = 5
): Promise<NotificationItem[]> {
  return fetchReceivingByStatus(status, size);
}