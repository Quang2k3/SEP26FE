'use client';

import { useEffect, useState, useCallback } from 'react';
import { approveGrn, postGrn, rejectGrn, fetchGrnByReceivingId, type Grn } from '@/services/grnService';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';
import type { ReceivingOrder } from '@/interfaces/receiving';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// Manager chỉ quan tâm các ReceivingOrder đã qua giai đoạn Keeper gửi
const MANAGER_STATUSES = ['PENDING_APPROVAL', 'GRN_APPROVED', 'GRN_REJECTED', 'POSTED'];

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING_APPROVAL: { label: 'Chờ duyệt',   className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  GRN_APPROVED:     { label: 'Đã duyệt',    className: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  GRN_REJECTED:     { label: 'Từ chối',     className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
  POSTED:           { label: 'Đã nhập kho', className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' },
};

const FILTER_TABS = [
  { value: 'ALL',              label: 'Tất cả' },
  { value: 'PENDING_APPROVAL', label: 'Chờ duyệt' },
  { value: 'GRN_APPROVED',     label: 'Đã duyệt' },
  { value: 'GRN_REJECTED',     label: 'Từ chối' },
  { value: 'POSTED',           label: 'Đã nhập kho' },
];

/**
 * Map GRN.status → ReceivingOrder.status tương đương
 * để đồng bộ localStatus theo trạng thái thực tế của GRN.
 */
function grnStatusToReceivingStatus(grnStatus: string): string {
  switch (grnStatus) {
    case 'PENDING_APPROVAL': return 'PENDING_APPROVAL';
    case 'APPROVED':         return 'GRN_APPROVED';
    case 'REJECTED':         return 'GRN_REJECTED';
    case 'POSTED':           return 'POSTED';
    default:                 return grnStatus;
  }
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ code, onConfirm, onCancel, loading }: {
  code: string; onConfirm: (r: string) => void; onCancel: () => void; loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Portal>
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-red-500 text-[20px]">block</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Không duyệt đơn</h3>
            <p className="text-xs text-gray-400 mt-0.5">{code}</p>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Lý do <span className="text-red-500">*</span>
            <span className="text-gray-400 font-normal ml-1">(tối thiểu 20 ký tự)</span>
          </label>
          <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
            placeholder="Nhập lý do cụ thể để Keeper biết cần điều chỉnh..."
            className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
          <p className={`text-xs mt-1.5 ${reason.length < 20 ? 'text-red-400' : 'text-green-600'}`}>
            {reason.length} / 20 ký tự tối thiểu
          </p>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Huỷ</button>
          <button disabled={reason.trim().length < 20 || loading} onClick={() => onConfirm(reason.trim())}
            className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              : <span className="material-symbols-outlined text-[16px]">block</span>}
            {loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}


// ─── Confirm Modal (dùng chung cho Duyệt + Nhập kho) ─────────────────────────
function ConfirmModal({ icon, iconBg, iconColor, title, description, confirmLabel, confirmClass, loading, onConfirm, onCancel }: {
  icon: string; iconBg: string; iconColor: string;
  title: string; description: string;
  confirmLabel: string; confirmClass: string;
  loading: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Portal>
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${iconBg}`}>
            <span className={`material-symbols-outlined text-3xl ${iconColor}`}>{icon}</span>
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500 mt-1.5 leading-relaxed">{description}</p>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
            Huỷ
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${confirmClass}`}>
            {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {loading ? 'Đang xử lý...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

// ─── Detail + Action Modal ────────────────────────────────────────────────────
function DetailModal({ receiving, onClose, onRefresh }: {
  receiving: ReceivingOrder; onClose: () => void; onRefresh: () => void;
}) {
  const [grn, setGrn] = useState<Grn | null>(null);
  const [loadingGrn, setLoadingGrn] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  // localStatus luôn được đồng bộ theo GRN.status thực tế sau khi fetch xong
  const [localStatus, setLocalStatus] = useState(receiving.status);

  useEffect(() => {
    setLoadingGrn(true);
    // Chỉ fetch GRN để lấy grnId dùng cho actions (approve/reject/post)
    // KHÔNG sync localStatus theo GRN.status — dùng receiving.status làm source of truth
    // Lý do: 1 receivingId có thể có nhiều GRN, GRN mới nhất có thể là POSTED
    // nhưng receiving vẫn đang PENDING_APPROVAL (GRN chờ duyệt khác)
    fetchGrnByReceivingId(receiving.receivingId)
      .then(g => { setGrn(g); })
      .catch(() => setGrn(null))
      .finally(() => setLoadingGrn(false));
  }, [receiving.receivingId]);

  const handleApprove = async () => {
    if (!grn) return;
    setActionLoading(true);
    try {
      await approveGrn(grn.grnId);
      setLocalStatus('GRN_APPROVED');
      setGrn(g => g ? { ...g, status: 'APPROVED' } : g);
      toast.success(`Đã duyệt ${receiving.receivingCode}`);
      onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi không xác định';
      toast.error(`Lỗi duyệt: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!grn) return;
    setActionLoading(true);
    try {
      await rejectGrn(grn.grnId, reason);
      setLocalStatus('GRN_REJECTED');
      setGrn(g => g ? { ...g, status: 'REJECTED' } : g);
      toast.success(`Đã từ chối ${receiving.receivingCode}`);
      setShowReject(false);
      onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi không xác định';
      toast.error(`Lỗi từ chối: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePost = async () => {
    if (!grn) return;
    setActionLoading(true);
    try {
      await postGrn(grn.grnId);
      setLocalStatus('POSTED');
      setGrn(g => g ? { ...g, status: 'POSTED' } : g);
      toast.success(`Đã nhập kho — Putaway Task đã được tạo`);
      onRefresh();
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? 'Lỗi không xác định';
      toast.error(`Lỗi nhập kho: ${msg}`);
    } finally {
      setActionLoading(false);
    }
  };

  const badge = STATUS_BADGE[localStatus] ?? { label: localStatus, className: 'bg-gray-100 text-gray-600' };

  return (
    <>
      <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[88vh]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">receipt_long</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{receiving.receivingCode}</h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {receiving.supplierName ?? '—'} · {receiving.sourceType}
                  {receiving.sourceReferenceCode && ` · ${receiving.sourceReferenceCode}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>{badge.label}</span>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
          </div>

          {/* Meta */}
          <div className="px-6 py-4 border-b border-gray-50 flex-shrink-0">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Ngày tạo</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{new Date(receiving.createdAt).toLocaleString('vi-VN')}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tổng dòng</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{receiving.totalLines} SKU</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide">Tổng số lượng</p>
                <p className="text-xs font-semibold text-gray-800 mt-1">{receiving.totalQty} thùng</p>
              </div>
            </div>
            {receiving.note && (
              <div className="mt-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-amber-700"><span className="font-semibold">Ghi chú:</span> {receiving.note}</p>
              </div>
            )}
          </div>

          {/* GRN info + items */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {loadingGrn ? (
              <div className="flex justify-center py-8">
                <span className="material-symbols-outlined animate-spin text-indigo-400 text-[28px]">progress_activity</span>
              </div>
            ) : !grn ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[40px]">receipt_long</span>
                <p className="text-sm text-gray-400">Chưa có GRN cho đơn này</p>
              </div>
            ) : (
              <>
                {/* GRN code badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã GRN</span>
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg">{grn.grnCode}</span>
                </div>

                {/* Items table */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">SKU</th>
                        <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Tên sản phẩm</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">SL</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Số lô</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">HSD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(grn.items ?? []).map(item => (
                        <tr key={item.grnItemId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{item.skuCode}</td>
                          <td className="px-4 py-2.5 text-gray-600">{item.skuName}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2.5 text-center text-gray-400">{item.lotNumber ?? '—'}</td>
                          <td className="px-4 py-2.5 text-center text-gray-400">{item.expiryDate ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0">
            {/* Đang load GRN — chưa hiện action */}
            {loadingGrn && (
              <div className="flex justify-center">
                <span className="text-xs text-gray-400">Đang tải thông tin GRN...</span>
              </div>
            )}

            {/* Chờ duyệt → Duyệt / Từ chối */}
            {!loadingGrn && localStatus === 'PENDING_APPROVAL' && grn && (
              <div className="flex gap-3">
                <button onClick={() => setShowReject(true)} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl disabled:opacity-50">
                  <span className="material-symbols-outlined text-[16px]">block</span>
                  Không duyệt
                </button>
                <button onClick={() => setShowApproveConfirm(true)} disabled={actionLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  Duyệt
                </button>
              </div>
            )}

            {/* Đã duyệt → Nhập kho */}
            {!loadingGrn && localStatus === 'GRN_APPROVED' && grn && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-xl px-4 py-2.5">
                  <span className="material-symbols-outlined text-[14px]">check_circle</span>
                  Đã duyệt — sẵn sàng nhập kho
                </div>
                <button onClick={() => setShowPostConfirm(true)} disabled={actionLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-50 active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
                  <span className="material-symbols-outlined text-[18px]">inventory</span>
                  Nhập kho (Post GRN)
                </button>
              </div>
            )}

            {/* Lý do từ chối */}
            {!loadingGrn && localStatus === 'GRN_REJECTED' && grn?.note && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-[11px] font-bold text-red-600 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">info</span>
                  Lý do từ chối
                </p>
                <p className="text-sm text-red-700">
                  {grn.note.includes(': ') ? grn.note.split(': ').slice(1).join(': ') : grn.note}
                </p>
              </div>
            )}

            {/* Từ chối / Đã nhập kho → chỉ đóng */}
            {!loadingGrn && (localStatus === 'GRN_REJECTED' || localStatus === 'POSTED') && (
              <button onClick={onClose}
                className="w-full px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl">
                Đóng
              </button>
            )}
          </div>
        </div>
      </div>
      </Portal>

      {showReject && (
        <RejectModal code={receiving.receivingCode} loading={actionLoading}
          onConfirm={handleReject} onCancel={() => setShowReject(false)} />
      )}

      {showApproveConfirm && (
        <ConfirmModal
          icon="check_circle" iconBg="bg-indigo-50" iconColor="text-indigo-500"
          title="Xác nhận duyệt GRN?"
          description={`Duyệt phiếu ${receiving.receivingCode}. Keeper sẽ tiến hành nhập kho sau khi duyệt.`}
          confirmLabel="Duyệt GRN" confirmClass="bg-indigo-600 hover:bg-indigo-700"
          loading={actionLoading}
          onConfirm={() => { setShowApproveConfirm(false); handleApprove(); }}
          onCancel={() => setShowApproveConfirm(false)}
        />
      )}

      {showPostConfirm && (
        <ConfirmModal
          icon="inventory" iconBg="bg-emerald-50" iconColor="text-emerald-500"
          title="Xác nhận nhập kho?"
          description={`Nhập kho GRN ${grn?.grnCode ?? ''}. Hệ thống sẽ tạo Putaway Task để Keeper phân bổ hàng vào kho.`}
          confirmLabel="Nhập kho" confirmClass="bg-emerald-600 hover:bg-emerald-700"
          loading={actionLoading}
          onConfirm={() => { setShowPostConfirm(false); handlePost(); }}
          onCancel={() => setShowPostConfirm(false)}
        />
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function GrnApprovalList() {
  const [allOrders, setAllOrders] = useState<ReceivingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING_APPROVAL');
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<ReceivingOrder | null>(null);
  const PAGE_SIZE = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        MANAGER_STATUSES.map(s =>
          fetchReceivingOrders({ status: s as any, size: 100 })
            .then(r => r.content ?? [])
            .catch(() => [] as ReceivingOrder[])
        )
      );
      const all = results.flat().sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
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
                ? 'bg-indigo-600 text-white shadow-sm'
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
                <th className="px-5 py-3 text-center">Ngày tạo</th>
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
                      <span className="material-symbols-outlined text-gray-200 text-[48px]">receipt_long</span>
                      <p className="text-sm text-gray-400">Không có đơn nào</p>
                    </div>
                  </td>
                </tr>
              ) : paged.map(r => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, className: 'bg-gray-100 text-gray-600' };
                return (
                  <tr key={r.receivingId} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-gray-900 text-xs">{r.receivingCode}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{r.supplierName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-xs font-semibold text-gray-700">
                      {r.totalLines} SKU · {r.totalQty} thùng
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-400">
                      {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => setSelected(r)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          r.status === 'PENDING_APPROVAL'
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                            : r.status === 'GRN_APPROVED'
                              ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                              : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {r.status === 'PENDING_APPROVAL' ? 'rate_review'
                            : r.status === 'GRN_APPROVED' ? 'inventory'
                            : 'visibility'}
                        </span>
                        {r.status === 'PENDING_APPROVAL' ? 'Duyệt'
                          : r.status === 'GRN_APPROVED' ? 'Nhập kho'
                          : 'Xem'}
                      </button>
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

      {selected && (
        <DetailModal
          receiving={selected}
          onClose={() => setSelected(null)}
          onRefresh={loadOrders}
        />
      )}
    </div>
  );
}
