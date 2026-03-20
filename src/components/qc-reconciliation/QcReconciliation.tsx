'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchReceivingOrders,
} from '@/services/receivingOrdersService';
import type { ReceivingOrder } from '@/interfaces/receiving';
import toast from 'react-hot-toast';

// ─── Statuses QC quan tâm ───────────────────────────────────────────────────
const QC_STATUSES = ['PENDING_COUNT', 'QC_APPROVED', 'PENDING_INCIDENT'];

const STATUS_BADGE: Record<string, { label: string; className: string; icon: string }> = {
  PENDING_COUNT:    { label: 'Chờ QC kiểm',  className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   icon: 'hourglass_top' },
  QC_APPROVED:      { label: 'QC đã duyệt',  className: 'bg-green-50 text-green-700 ring-1 ring-green-200',   icon: 'check_circle' },
  PENDING_INCIDENT: { label: 'Chờ Manager',   className: 'bg-red-50 text-red-700 ring-1 ring-red-200',        icon: 'report' },
};

const FILTER_TABS = [
  { value: 'ALL',              label: 'Tất cả' },
  { value: 'PENDING_COUNT',    label: 'Chờ QC kiểm' },
  { value: 'QC_APPROVED',      label: 'QC đã duyệt' },
  { value: 'PENDING_INCIDENT', label: 'Chờ Manager' },
];

// ─── Helper: generate scanner URL ───────────────────────────────────────────
function openScanner(receivingId: number) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    toast.error('Không tìm thấy token đăng nhập');
    return;
  }
  const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/v1', '') ?? '';
  const scanUrl = `${base}/v1/scan?token=${encodeURIComponent(token)}&receivingId=${receivingId}&mode=inbound`;
  window.open(scanUrl, '_blank');
}

// ─── Main List ──────────────────────────────────────────────────────────────
export default function QcReconciliation() {
  const [allOrders, setAllOrders] = useState<ReceivingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING_COUNT');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        QC_STATUSES.map(s =>
          fetchReceivingOrders({ status: s as any, size: 100 })
            .then(r => r.content ?? [])
            .catch(() => [] as ReceivingOrder[])
        )
      );
      const all = results.flat().sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
      );
      setAllOrders(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const filtered = statusFilter === 'ALL'
    ? allOrders
    : allOrders.filter(r => r.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} phiếu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3">Mã phiếu</th>
                <th className="px-5 py-3">Nhà cung cấp</th>
                <th className="px-5 py-3 text-center">Số lượng</th>
                <th className="px-5 py-3 text-center">Trạng thái</th>
                <th className="px-5 py-3 text-center">Cập nhật</th>
                <th className="px-5 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-gray-200 text-[48px]">fact_check</span>
                      <p className="text-sm text-gray-400">Không có đơn nào</p>
                    </div>
                  </td>
                </tr>
              ) : paged.map(r => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, className: 'bg-gray-100 text-gray-600', icon: 'info' };
                const canScan = r.status === 'PENDING_COUNT';
                return (
                  <tr key={r.receivingId} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-gray-900 text-xs">{r.receivingCode}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{r.supplierName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-xs font-semibold text-gray-700">
                      {r.totalLines} SKU · {r.totalQty}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                        <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-400">
                      {new Date(r.updatedAt ?? r.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {canScan ? (
                        <button onClick={() => openScanner(r.receivingId)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100">
                          <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>
                          Kiểm đếm
                        </button>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-400">
                          <span className="material-symbols-outlined text-[13px]">visibility</span>
                          Xem
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-400">Trang {page + 1} / {totalPages} · {filtered.length} đơn</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100">← Trước</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100">Tiếp →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
