'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPage } from '@/components/layout/AdminPage';
import { DataTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  fetchOutboundOrders,
  fetchOutboundSummary,
  approveSalesOrder,
  rejectSalesOrder,
} from '@/services/outboundService';
import { getStoredSession } from '@/services/authService';
import type {
  OutboundListItem,
  OutboundSummary,
  OutboundStatus,
  OutboundType,
} from '@/interfaces/outbound';
import {
  getOutboundColumns,
  RejectModal,
} from './components/columns';
import OutboundFilter from './components/OutboundFilter';
import CreateOutboundModal from './components/CreateOutboundModal';
import OutboundDetailModal from './components/OutboundDetailModal';

// ─── Role helper ──────────────────────────────────────────────────────────────
function getUserRole(): 'MANAGER' | 'QC' | 'KEEPER' {
  if (typeof window === 'undefined') return 'KEEPER';
  try {
    const session = getStoredSession();
    const codes = session?.user?.roleCodes ?? [];
    if (codes.some((r: string) => r.includes('MANAGER'))) return 'MANAGER';
    if (codes.some((r: string) => r.includes('QC')))      return 'QC';
    return 'KEEPER';
  } catch { return 'KEEPER'; }
}

// ─── Summary cards ────────────────────────────────────────────────────────────
function SummaryCards({ summary }: { summary: OutboundSummary | null }) {
  if (!summary) return null;
  const cards = [
    { label: 'Nháp',      value: summary.draft           ?? 0, color: 'text-gray-600',    bg: 'bg-gray-50',    border: 'border-gray-200' },
    { label: 'Chờ duyệt', value: summary.pendingApproval ?? 0, color: 'text-orange-600',  bg: 'bg-orange-50',  border: 'border-orange-200' },
    { label: 'Đã duyệt',  value: summary.approved        ?? 0, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { label: 'Phân bổ',   value: summary.allocated       ?? 0, color: 'text-indigo-600',  bg: 'bg-indigo-50',  border: 'border-indigo-200' },
    { label: 'Lấy hàng',  value: summary.picking         ?? 0, color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-200' },
    { label: 'QC Scan',   value: summary.qcScan          ?? 0, color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-200' },
    { label: 'Xuất kho',  value: summary.dispatched      ?? 0, color: 'text-teal-600',    bg: 'bg-teal-50',    border: 'border-teal-200' },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
      {cards.map((c) => (
        <div key={c.label} className={`${c.bg} rounded-2xl px-3 py-3 border ${c.border}`}>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wider leading-tight">{c.label}</p>
          <p className={`text-xl font-bold mt-1 ${c.color}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutboundList() {
  const role       = getUserRole();
  const searchParams = useSearchParams();
  const urlStatus  = searchParams.get('status') as OutboundStatus | null;

  const [orders, setOrders]               = useState<OutboundListItem[]>([]);
  const [summary, setSummary]             = useState<OutboundSummary | null>(null);
  const [loading, setLoading]             = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage]                   = useState(0);
  const PAGE_SIZE = 10;

  const [filter, setFilter] = useState<{
    keyword: string;
    status: OutboundStatus | 'ALL';
    orderType: OutboundType | 'ALL';
  }>({ keyword: '', status: urlStatus ?? 'ALL', orderType: 'ALL' });

  // modal states
  const [showCreate,   setShowCreate]   = useState(false);
  const [detailItem,   setDetailItem]   = useState<OutboundListItem | null>(null);
  const [rejectTarget, setRejectTarget] = useState<OutboundListItem | null>(null);
  const [approvingId,  setApprovingId]  = useState<number | null>(null);
  const [rejecting,    setRejecting]    = useState(false);

  const load = useCallback(async (p = 0) => {
    setLoading(true); setLoadError(null);
    try {
      const listRes = await fetchOutboundOrders({
        keyword:   filter.keyword   || undefined,
        status:    filter.status    !== 'ALL' ? filter.status    : undefined,
        orderType: filter.orderType !== 'ALL' ? filter.orderType : undefined,
        page: p, size: PAGE_SIZE,
      });
      const raw = (listRes as any)?.content ?? (listRes as any)?.data?.content ?? [];
      setOrders(raw);
      setTotalPages((listRes as any)?.totalPages ?? 0);
      setTotalElements((listRes as any)?.totalElements ?? raw.length);
      setPage(p);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách lệnh xuất kho.';
      setLoadError(msg); toast.error(msg);
    } finally { setLoading(false); }
    fetchOutboundSummary().then(setSummary).catch(() => {});
  }, [filter]);

  useEffect(() => { load(0); }, [load]);

  // ── Manager: approve ──────────────────────────────────────────────────────
  const handleApprove = async (row: OutboundListItem) => {
    setApprovingId(row.documentId);
    try {
      await approveSalesOrder(row.documentId);
      toast.success(`Đã duyệt ${row.documentCode}`);
      load(page);
    } catch {} finally { setApprovingId(null); }
  };

  // ── Manager: reject ───────────────────────────────────────────────────────
  const handleReject = async (reason: string) => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      await rejectSalesOrder(rejectTarget.documentId, reason);
      toast.success(`Đã từ chối ${rejectTarget.documentCode}`);
      setRejectTarget(null);
      load(page);
    } catch {} finally { setRejecting(false); }
  };

  const columns = getOutboundColumns({
    role,
    onView:    (row) => setDetailItem(row),
    onPickScan:(row) => setDetailItem(row),   // mở modal detail ở bước PICKING
    onApprove: handleApprove,
    onReject:  (row) => setRejectTarget(row),
    approvingId,
  });

  return (
    <AdminPage
      title="Lệnh xuất kho"
      description="Quản lý toàn bộ quy trình xuất kho: từ tạo lệnh đến dispatch."
      actions={
        role === 'KEEPER' ? (
          <Button size="sm" onClick={() => setShowCreate(true)}
            leftIcon={<span className="material-symbols-outlined text-sm">add</span>}>
            Tạo lệnh xuất
          </Button>
        ) : undefined
      }
    >
      <SummaryCards summary={summary} />
      <OutboundFilter value={filter} onChange={(f) => { setFilter(f); load(0); }} />

      {loadError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
          <span>{loadError}</span>
          <button onClick={() => load(0)} className="ml-auto text-xs font-semibold underline hover:no-underline">Thử lại</button>
        </div>
      )}

      <DataTable
        columns={columns}
        data={orders}
        loading={loading}
        emptyText={loadError ? 'Có lỗi khi tải dữ liệu. Nhấn Thử lại.' : 'Không có lệnh xuất kho nào.'}
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPrev={() => load(page - 1)}
        onNext={() => load(page + 1)}
        onGoToPage={(p) => load(p)}
        onRowClick={(row) => setDetailItem(row)}
      />

      {/* Modals */}
      <CreateOutboundModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => {
          setShowCreate(false);
          setFilter({ keyword: '', status: 'ALL', orderType: 'ALL' });
          load(0);
        }}
      />

      <OutboundDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onRefresh={() => load(page)}
      />



      {rejectTarget && (
        <RejectModal
          code={rejectTarget.documentCode}
          loading={rejecting}
          onConfirm={handleReject}
          onCancel={() => setRejectTarget(null)}
        />
      )}
    </AdminPage>
  );
}
