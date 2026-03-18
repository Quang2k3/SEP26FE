'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import Portal from '@/components/ui/Portal';
import type { Column } from '@/components/ui/Table';
import type { OutboundListItem, OutboundType, QcSummaryResponse } from '@/interfaces/outbound';
import { OUTBOUND_STATUS_BADGE, type OutboundStatus } from '@/interfaces/outbound';
import {
  fetchPickListByDocument,
  startQcSession,
  fetchQcSummary,
  approveSalesOrder,
  rejectSalesOrder,
} from '@/services/outboundService';
import {
  createReceivingSession,
  generateScanToken,
  deleteSession,
} from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';

// ─── Shared UI ────────────────────────────────────────────────────────────────

export function StatusBadge({ status }: { status: string }) {
  const cfg = OUTBOUND_STATUS_BADGE[status as OutboundStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: OutboundType }) {
  return type === 'SALES_ORDER' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700">
      <span className="material-symbols-outlined text-[13px]">store</span>
      Sales Order
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
      <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
      Transfer
    </span>
  );
}

function Spin() {
  return <span className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin inline-block" />;
}

// ─── QC Quick Scan popup ──────────────────────────────────────────────────────

interface QcQuickScanProps {
  order: OutboundListItem;
  onClose: () => void;
  onDone: () => void;
}

export function QcQuickScan({ order, onClose, onDone }: QcQuickScanProps) {
  const [qrValue,     setQrValue]     = useState<string | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [summary,     setSummary]     = useState<QcSummaryResponse | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [copied,      setCopied]      = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const mountedRef   = useRef(true);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      const sid = sessionIdRef.current;
      if (sid) deleteSession(sid).catch(() => {});
    };
  }, [stopPolling]);

  const pollSummary = useCallback(async (tid: number) => {
    try {
      const s = await fetchQcSummary(tid);
      if (!mountedRef.current) return;
      setSummary(s);
      if (s.allScanned) { setIsFinalized(true); stopPolling(); }
    } catch {}
  }, [stopPolling]);

  const startPolling = useCallback((tid: number) => {
    stopPolling();
    pollRef.current = setInterval(() => { if (mountedRef.current) pollSummary(tid); }, 4000);
  }, [pollSummary, stopPolling]);

  const generateQR = useCallback(async () => {
    setLoading(true); setError(null); setQrValue(null);
    try {
      const pl  = await fetchPickListByDocument(order.documentId);
      if (!mountedRef.current) return;
      const tid = pl.taskId;

      // startQcSession chỉ hợp lệ khi task ở PICKED.
      // Nếu task đã là QC_IN_PROGRESS (QC mở lại popup) → BE trả 400, bỏ qua.
      try { await startQcSession(tid); } catch { /* đã QC_IN_PROGRESS — bỏ qua */ }
      if (!mountedRef.current) return;

      const session   = await createReceivingSession();
      if (!mountedRef.current) return;
      sessionIdRef.current = session.sessionId;
      const tokenData = await generateScanToken(session.sessionId);
      const rawUrl    = await getScanUrl(tokenData.scanToken, null);
      const url       = rawUrl + `&taskId=${tid}&mode=outbound_qc`;
      if (!mountedRef.current) return;
      setQrValue(url);
      startPolling(tid);
      const s = await fetchQcSummary(tid);
      if (mountedRef.current) setSummary(s);
      toast.success('QR sẵn sàng!', { id: 'qc-qr' });
    } catch (err: any) {
      if (mountedRef.current) setError(err?.message ?? 'Không tạo được QR');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [order.documentId, startPolling]);

  // Auto-generate on mount
  useEffect(() => { generateQR(); }, []); // eslint-disable-line

  const handleCopy = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const scanned = summary ? (summary.passCount + summary.failCount + summary.holdCount) : 0;
  const total   = summary?.totalItems ?? 0;
  const pct     = total > 0 ? Math.round((scanned / total) * 100) : 0;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900 font-mono">{order.documentCode}</p>
              <p className="text-xs text-gray-400 mt-0.5">{order.destination ?? order.customerName ?? '—'} · {order.totalItems} SKU</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Progress */}
          {summary && (
            <div className="px-5 pt-4 pb-0">
              <div className="flex justify-between text-xs text-gray-500 mb-1.5">
                <span>Tiến độ QC</span>
                <span className="font-semibold">{scanned}/{total} · {pct}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  { label: 'PASS', val: summary.passCount,    cls: 'text-emerald-700 bg-emerald-50' },
                  { label: 'FAIL', val: summary.failCount,    cls: 'text-red-700 bg-red-50' },
                  { label: 'HOLD', val: summary.holdCount,    cls: 'text-amber-700 bg-amber-50' },
                  { label: 'Chờ',  val: summary.pendingCount, cls: 'text-gray-500 bg-gray-50' },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl p-2 text-center ${s.cls}`}>
                    <p className="text-base font-bold">{s.val}</p>
                    <p className="text-[10px] font-semibold">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* QR / State */}
          <div className="p-5">
            {isFinalized ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="material-symbols-outlined text-emerald-600 text-[28px]">check_circle</span>
                </div>
                <p className="text-sm font-bold text-emerald-800">QC hoàn tất!</p>
                <p className="text-xs text-emerald-600 text-center">Tất cả mặt hàng đã kiểm tra xong.</p>
                <button onClick={onDone}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
                  Xong
                </button>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <span className="w-8 h-8 border-[3px] border-purple-200 border-t-purple-500 rounded-full animate-spin" />
                <p className="text-sm text-gray-400">Đang tạo QR Code...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <p className="text-sm text-red-500 text-center">{error}</p>
                <button onClick={generateQR}
                  className="px-4 py-2 text-sm font-semibold text-purple-700 bg-purple-50 rounded-xl hover:bg-purple-100 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">refresh</span>Thử lại
                </button>
              </div>
            ) : qrValue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="relative p-3 bg-white border-2 border-purple-200 rounded-xl">
                  <QRCode value={qrValue} size={160} level="H" />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-purple-600 font-bold">LIVE</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full">
                  <button onClick={handleCopy}
                    className="flex-1 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                    {copied ? '✓ Đã copy' : 'Copy link'}
                  </button>
                  <a href={qrValue} target="_blank" rel="noreferrer"
                    className="flex-1 py-2 text-xs font-semibold text-center text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                    Mở trang scan
                  </a>
                </div>
                <p className="text-[11px] text-purple-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Đang chờ scan trên điện thoại...
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Reject modal (Manager) ───────────────────────────────────────────────────

interface RejectModalProps {
  code: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  loading: boolean;
}

export function RejectModal({ code, onConfirm, onCancel, loading }: RejectModalProps) {
  const [reason, setReason] = useState('');
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[20px]">block</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Từ chối lệnh xuất</h3>
              <p className="text-xs text-gray-400">{code}</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Lý do <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(tối thiểu 20 ký tự)</span>
            </label>
            <textarea rows={3} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <p className={`text-xs mt-1 ${reason.length < 20 ? 'text-red-400' : 'text-green-600'}`}>
              {reason.length} / 20 ký tự tối thiểu
            </p>
          </div>
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={onCancel}
              className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Huỷ
            </button>
            <button disabled={reason.trim().length < 20 || loading} onClick={() => onConfirm(reason.trim())}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Spin />}
              {loading ? 'Đang xử lý...' : 'Từ chối'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Column factory ───────────────────────────────────────────────────────────

export interface OutboundColumnCallbacks {
  role: 'MANAGER' | 'QC' | 'KEEPER';
  onView: (row: OutboundListItem) => void;
  // QC
  // Keeper
  onPickScan?: (row: OutboundListItem) => void;
  // Manager
  onApprove?: (row: OutboundListItem) => void;
  onReject?: (row: OutboundListItem) => void;
  approvingId?: number | null;
}

export function getOutboundColumns(cb: OutboundColumnCallbacks): Column<OutboundListItem>[] {
  const { role, onView, onPickScan, onApprove, onReject, approvingId } = cb;

  const actionCol: Column<OutboundListItem> = {
    key: 'action',
    title: '',
    align: 'right',
    render: (row) => {
      // ── Keeper: action theo từng trạng thái ──
      if (role === 'KEEPER') {
        const cfg: Record<string, { label: string; cls: string }> = {
          DRAFT:     { label: 'Submit',       cls: 'text-gray-700 bg-white border-gray-200 hover:bg-gray-50' },
          APPROVED:  { label: 'Phân bổ kho',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
          ALLOCATED: { label: 'Tạo pick list',cls: 'text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100' },
          PICKING:   { label: 'Quét pick',    cls: 'text-blue-700 bg-blue-50 border-blue-200 hover:bg-blue-100' },
        };
        const c = cfg[row.status];
        if (!c) return null;
        const isPickAction = row.status === 'PICKING';
        return (
          <button
            onClick={e => { e.stopPropagation(); isPickAction ? onPickScan?.(row) : onView(row); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold rounded-xl border transition-colors whitespace-nowrap ${c.cls}`}
          >
            {isPickAction && <span className="material-symbols-outlined text-[13px]">qr_code_scanner</span>}
            {c.label}
          </button>
        );
      }

      // ── Manager: nút "Chờ duyệt" mở modal detail (có Duyệt/Từ chối bên trong) ──
      if (role === 'MANAGER') {
        if (row.status !== 'PENDING_APPROVAL' || row.orderType !== 'SALES_ORDER') return null;
        return (
          <button
            onClick={e => { e.stopPropagation(); onView?.(row); }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            Chờ duyệt
          </button>
        );
      }

      return null;
    },
  };

  return [
    {
      key: 'documentCode',
      title: 'Mã lệnh xuất',
      render: (row) => (
        <button onClick={() => onView(row)} className="font-mono text-sm font-bold text-indigo-600 hover:underline">
          {row.documentCode}
        </button>
      ),
    },
    {
      key: 'orderType',
      title: 'Loại',
      render: (row) => <TypeBadge type={row.orderType} />,
    },
    {
      key: 'destination',
      title: 'Khách hàng / Kho đích',
      render: (row) => (
        <span className="text-sm text-gray-700">
          {row.destination ?? row.customerName ?? row.destinationWarehouseName ?? '—'}
        </span>
      ),
    },
    {
      key: 'shipmentDate',
      title: 'Ngày giao',
      render: (row) => {
        const date = row.shipmentDate ?? row.deliveryDate;
        return (
          <span className="text-sm text-gray-500">
            {date ? new Date(date).toLocaleDateString('vi-VN') : '—'}
          </span>
        );
      },
    },
    {
      key: 'totalItems',
      title: 'Số SKU',
      align: 'center',
      render: (row) => <span className="text-sm font-medium text-gray-700">{row.totalItems}</span>,
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    actionCol,
  ];
}
