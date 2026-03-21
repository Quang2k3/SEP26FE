'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';
import { getExpiryInfo } from '@/utils/expiryUtils';

import QRCode from 'react-qr-code';
import CreateOutboundModal from './CreateOutboundModal';
import {
  createReceivingSession,
  generateScanToken,
  deleteSession,
} from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import {
  submitSalesOrder,
  submitTransfer,
  approveSalesOrder,
  rejectSalesOrder,
  allocateStock,
  reportShortage,
  deleteSalesOrder,
  deleteTransfer,
  generatePickList,
  fetchPickList,
  fetchPickListByDocument,
  confirmPickedTask,
  startQcSession,
  qcScanItem,
  finalizeQc,
  fetchQcSummary,
  fetchDispatchNote,
  confirmDispatch,
  uploadPickSignedNote,
  buildOrderFromListItem,
  fetchOutboundDetail,
  fetchIncidentsBySoId,  // [V20]
} from '@/services/outboundService';
import type {
  OutboundListItem,
  PickListItem,
  PickListResponse,
  QcSummaryResponse,
  DispatchNoteResponse,
  QcResult,
} from '@/interfaces/outbound';
import { OUTBOUND_STATUS_BADGE } from '@/interfaces/outbound';
import DispatchPdfButton from '@/components/outbound/DispatchPdfButton';
import PickListPdfButton from '@/components/outbound/PickListPdfButton';
// [V20] import IncidentDetailModal để mở từ banner ON_HOLD / WAITING_STOCK
import IncidentDetailModal from '@/components/manager-dashboard/incident/components/IncidentDetailModal';

function getUserRole(): string {
  if (typeof window === 'undefined') return 'KEEPER';
  try {
    const s = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
    const codes: string[] =
      s?.roleCodes ?? (s?.roles ?? []).map((r: any) => r?.roleCode ?? r?.authority ?? r).filter(Boolean);
    if (codes.some((r: string) => r.includes('MANAGER'))) return 'MANAGER';
    if (codes.some((r: string) => r.includes('QC'))) return 'QC';
    return 'KEEPER';
  } catch { return 'KEEPER'; }
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      <span className="text-sm text-gray-800 font-medium">{value ?? '—'}</span>
    </div>
  );
}

function Spin() {
  return <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />;
}

// ─── Universal Confirm Modal ────────────────────────────────────────────────────
interface ConfirmModalProps {
  open: boolean; icon?: string; iconColor?: string;
  title: string; description: string; confirmLabel: string;
  confirmColor?: string; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}
function ConfirmModal({
  open, icon = 'help', iconColor = 'text-indigo-500',
  title, description, confirmLabel, confirmColor = 'bg-indigo-600 hover:bg-indigo-700',
  loading, onConfirm, onCancel,
}: ConfirmModalProps) {
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          onClick={(e) => e.stopPropagation()}>
          <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center">
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
            <button onClick={(e) => { e.stopPropagation(); onConfirm(); }} disabled={loading}
              className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${confirmColor}`}>
              {loading && <Spin />}
              {loading ? 'Đang xử lý...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Reject Modal ──────────────────────────────────────────────────────────────
function RejectModal({ code, onConfirm, onCancel, loading }: {
  code: string; onConfirm: (r: string) => void; onCancel: () => void; loading: boolean;
}) {
  const [reason, setReason] = useState('');
  return (
    <Portal>
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-red-100 overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-red-500 text-[20px]">block</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Từ chối lệnh xuất</h3>
              <p className="text-xs text-gray-400 mt-0.5">{code}</p>
            </div>
          </div>
          <div className="px-6 py-5">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Lý do <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-1">(tối thiểu 20 ký tự)</span>
            </label>
            <textarea rows={4} value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Nhập lý do cụ thể..."
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400 resize-none" />
            <p className={`text-xs mt-1.5 ${reason.length < 20 ? 'text-red-400' : 'text-green-600'}`}>
              {reason.length} / 20 ký tự tối thiểu
            </p>
          </div>
          <div className="px-6 pb-5 flex gap-3">
            <button onClick={onCancel} className="flex-1 py-2.5 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Huỷ</button>
            <button disabled={reason.trim().length < 20 || loading} onClick={() => onConfirm(reason.trim())}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-500 rounded-xl hover:bg-red-600 flex items-center justify-center gap-2 disabled:opacity-50">
              {loading && <Spin />}
              {loading ? 'Đang xử lý...' : 'Xác nhận từ chối'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── [V20] OutboundStatusBanner — banner ON_HOLD / WAITING_STOCK ───────────────
function OutboundStatusBanner({
  status,
  soId,
  onIncidentClick,
}: {
  status: string;
  soId: number;
  onIncidentClick: (incident: any) => void;
}) {
  const [incidents, setIncidents] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (status !== 'ON_HOLD' && status !== 'WAITING_STOCK') return;
    fetchIncidentsBySoId(soId).then(setIncidents).catch(() => {});
  }, [soId, status]);

  if (status === 'ON_HOLD') {
    return (
      <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-[18px]">warning</span>
          <p className="text-sm font-bold text-red-700">Tạm giữ — QC phát hiện hàng hỏng</p>
        </div>
        <p className="text-xs text-red-600">Manager cần xử lý Incident DAMAGE để tiếp tục.</p>
        {/* [BUG-FIX] Chỉ hiển thị DAMAGE incidents trong banner ON_HOLD (QC lỗi).
             Trước đây filter chỉ theo status=OPEN → hiển thị cả SHORTAGE/DISCREPANCY
             không liên quan đến QC fail, gây confuse cho Keeper. */}
        {incidents.filter((i: any) => i.status === 'OPEN' && i.incidentType === 'DAMAGE').map((inc: any) => (
          <button key={inc.incidentId} onClick={() => onIncidentClick(inc)}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg flex items-center justify-between">
            <span>📋 {inc.incidentCode} — Hàng hỏng (DAMAGE)</span>
            <span className="text-red-200">Xử lý →</span>
          </button>
        ))}
      </div>
    );
  }

  if (status === 'WAITING_STOCK') {
    return (
      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-amber-500 text-[18px]">hourglass_empty</span>
          <p className="text-sm font-bold text-amber-700">Đang chờ hàng bù nhập kho</p>
        </div>
        <p className="text-xs text-amber-600">
          Khi hàng đã nhập đủ, Keeper quay lại đây bấm <strong>Phân bổ tồn kho</strong> để tiếp tục.
        </p>
        {/* [BUG-FIX] Chỉ hiển thị SHORTAGE incidents trong banner WAITING_STOCK. */}
        {incidents.filter((i: any) => i.status === 'OPEN' && i.incidentType === 'SHORTAGE').map((inc: any) => (
          <button key={inc.incidentId} onClick={() => onIncidentClick(inc)}
            className="w-full py-2 px-3 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg flex items-center justify-between">
            <span>📋 {inc.incidentCode} — Thiếu hàng</span>
            <span className="text-amber-200">Xử lý →</span>
          </button>
        ))}
      </div>
    );
  }

  return null;
}

// ─── Step 1: Allocate Panel ─────────────────────────────────────────────────────
function AllocatePanel({ item, onDone, onReportShortageSuccess }: { item: OutboundListItem; onDone: () => void; onReportShortageSuccess?: () => void }) {
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShortageConfirm, setShowShortageConfirm] = useState(false);

  const allocatingRef = React.useRef(false);
  const handle = async () => {
    // [BUG-FIX] Guard ref chặn concurrent calls (double-click, event bubble)
    if (allocatingRef.current) return;
    allocatingRef.current = true;
    setShowConfirm(false);
    setLoading(true);
    try {
      const res = await allocateStock(item.documentId, item.orderType);
      setResult(res);

      const allocations: any[] = res.allocations ?? [];
      const nearExpiryLots = allocations.filter(line => {
        if (!line.expiryDate) return false;
        const info = getExpiryInfo(line.expiryDate);
        return info?.level === 'expired';
      });

      if (nearExpiryLots.length > 0) {
        const details = nearExpiryLots.map((l: any) => {
          const info = getExpiryInfo(l.expiryDate);
          return `${l.skuCode} (${info?.label}, HSD: ${new Date(l.expiryDate).toLocaleDateString('vi-VN')})`;
        }).join(', ');
        toast.error(`Không thể xuất — ${nearExpiryLots.length} lot có HSD dưới 60 ngày: ${details}`, { duration: 8000 });
        setResult({ ...res, _blockedByExpiry: true, nearExpiryLots });
        return;
      }

      if ((res as any).fullyAllocated) {
        toast.success('Phân bổ thành công! Bạn có thể tạo Pick List.');
      } else {
        toast('⚠️ Phân bổ một phần — một số SKU thiếu hàng. Không thể tạo Pick List cho đến khi đủ tồn kho.', { icon: '⚠️', duration: 6000 });
        return;
      }
    } catch (err: unknown) {
      // [BUG-FIX] Interceptor trong axios.ts đã toast lỗi 4xx/5xx.
      // Chỉ toast ở đây nếu interceptor chưa toast (network error, unknown error).
      if (!(err as any)._toastedByInterceptor) {
        const msg = (err as any)?.response?.data?.message ?? (err as any)?.message ?? 'Phân bổ tồn kho thất bại.';
        toast.error(msg, { duration: 6000 });
      }
    } finally {
      setLoading(false);
      allocatingRef.current = false;
    }
  };

  const handleReportShortage = async () => {
    // [BUG-FIX] Đóng confirm modal TRƯỚC khi set reporting=true để tránh
    // double-render làm component unmount giữa chừng rồi stale closure catch
    // vẫn chạy → toast "thất bại" xuất hiện cùng lúc với toast "thành công".
    setShowShortageConfirm(false);
    setReporting(true);
    let succeeded = false;
    try {
      await reportShortage(item.documentId, item.orderType);
      succeeded = true;
    } catch (e: any) {
      // [BUG-FIX] Chỉ toast nếu interceptor chưa toast
      if (!e?._toastedByInterceptor) {
        const msg = e?.response?.data?.message;
        toast.error(msg || 'Gửi báo cáo thất bại');
      }
    } finally {
      setReporting(false);
    }
    // Chỉ cập nhật state nếu thành công — tách khỏi try/catch để tránh
    // onRefresh() trigger re-render làm catch của lần gọi khác fire nhầm.
    if (succeeded) {
      toast.success('✅ Đã gửi báo cáo thiếu hàng lên Manager!');
      // [BUG-FIX] setLocalStatus thuộc scope của OutboundDetailModal (component cha),
      // không tồn tại trong AllocatePanel → ReferenceError. Dùng callback prop thay thế.
      onReportShortageSuccess?.();
    }
  };

  if (!result) {
    return (
      <div className="space-y-3">
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-indigo-500 text-xl mt-0.5">inventory</span>
            <div>
              <p className="text-sm font-semibold text-indigo-800">Bước 1 — Phân bổ tồn kho (FEFO)</p>
              <p className="text-xs text-indigo-600 mt-1 leading-relaxed">
                Hệ thống tự động tìm hàng theo <span className="font-bold">FEFO</span> — ưu tiên lô có <span className="font-bold">hạn sử dụng gần nhất</span>. Hàng được khoá lại để không đơn khác lấy mất.
              </p>
            </div>
          </div>
          <div className="space-y-1.5">
            {[
              { icon: 'search', color: 'text-indigo-500', text: 'Tìm BIN có hàng, ưu tiên HSD gần nhất (FEFO)' },
              { icon: 'lock', color: 'text-orange-500', text: 'Khoá số lượng — giữ riêng cho đơn này' },
              { icon: 'route', color: 'text-blue-500', text: 'Xác định lộ trình: Zone → Kệ → BIN cụ thể' },
            ].map((s, i) => (
              <div key={i} className="flex items-center gap-2.5 px-3 py-2 bg-white rounded-lg border border-indigo-100">
                <span className={`material-symbols-outlined text-[15px] flex-shrink-0 ${s.color}`}>{s.icon}</span>
                <p className="text-xs text-gray-600">{s.text}</p>
              </div>
            ))}
          </div>
          <button onClick={() => setShowConfirm(true)} disabled={loading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Spin />}
            {loading ? 'Đang tìm hàng và khoá tồn...' : '🔍 Phân bổ tồn kho'}
          </button>
        </div>
        <ConfirmModal open={showConfirm} icon="inventory" iconColor="text-indigo-500"
          title="Xác nhận phân bổ tồn kho?" confirmLabel="Phân bổ" confirmColor="bg-indigo-600 hover:bg-indigo-700"
          description="Hệ thống sẽ tìm hàng theo FEFO và khoá số lượng cho đơn này. Hàng đã khoá không thể dùng cho đơn khác."
          loading={loading} onConfirm={handle} onCancel={() => setShowConfirm(false)} />
      </div>
    );
  }

  const fullyAllocated = result.fullyAllocated;
  const allocations: any[] = result.allocations ?? [];
  const shortages: any[] = result.shortages ?? [];
  const blockedByExpiry: boolean = !!(result as any)._blockedByExpiry;
  const nearExpiryLots: any[] = (result as any).nearExpiryLots ?? [];

  return (
    <div className="space-y-3">
      {blockedByExpiry && (
        <div className="rounded-xl border border-red-300 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border-b border-red-200">
            <span className="material-symbols-outlined text-red-500 text-xl">dangerous</span>
            <div>
              <p className="text-sm font-bold text-red-800">Không thể xuất — Lot có HSD dưới 60 ngày</p>
              <p className="text-xs text-red-500 mt-0.5">Hệ thống đã huỷ phân bổ. Liên hệ Manager để xử lý.</p>
            </div>
          </div>
          <div className="divide-y divide-red-100 bg-white">
            {nearExpiryLots.map((l: any, i: number) => {
              const info = getExpiryInfo(l.expiryDate);
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5">
                  <div>
                    <p className="text-xs font-bold text-gray-800">{l.skuCode}</p>
                    <p className="text-[10px] text-gray-400">{l.locationCode}{l.lotNumber ? ` · LOT ${l.lotNumber}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-red-600">{new Date(l.expiryDate).toLocaleDateString('vi-VN')}</p>
                    <p className="text-[10px] text-red-500">{info?.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="px-4 py-3 bg-red-50 border-t border-red-100">
            <p className="text-xs text-red-700">
              Cần xuất hàng này trước ngày{' '}
              <strong>{new Date(Date.now() + 60 * 86400000).toLocaleDateString('vi-VN')}</strong>{' '}
              hoặc điều chỉnh đơn hàng sang lot khác.
            </p>
          </div>
        </div>
      )}

      {!blockedByExpiry && (<>
        <div className={`p-4 rounded-xl border ${fullyAllocated ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-xl ${fullyAllocated ? 'text-emerald-500' : 'text-red-500'}`}>
            {fullyAllocated ? 'check_circle' : 'error'}
          </span>
          <p className={`text-sm font-bold ${fullyAllocated ? 'text-emerald-800' : 'text-red-800'}`}>
            {fullyAllocated
              ? `Phân bổ thành công — ${result.allocatedSkus}/${result.totalSkus} SKU`
              : `Không đủ tồn kho — ${result.allocatedSkus}/${result.totalSkus} SKU có hàng`}
          </p>
        </div>
      </div>

      {allocations.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">📍 Vị trí lấy hàng (đã khoá tồn)</span>
            <span className="text-[10px] text-gray-400">{allocations.length} dòng</span>
          </div>
          <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
            {allocations.map((line: any, idx: number) => (
              <div key={idx} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {line.zoneCode && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{line.zoneCode}</span>}
                    <span className="text-xs font-bold text-gray-800">{line.locationCode}</span>
                    {line.lotNumber && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">LOT {line.lotNumber}</span>}
                    {line.expiryDate && <span className="text-[10px] text-gray-400">HSD: {new Date(line.expiryDate).toLocaleDateString('vi-VN')}</span>}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5">{line.skuCode} · {line.skuName}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-indigo-600">×{line.allocatedQty}</p>
                  {parseFloat(line.allocatedQty) < parseFloat(line.requestedQty) && (
                    <p className="text-[10px] text-amber-500">/ {line.requestedQty} yêu cầu</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shortages.length > 0 && (
        <div className="border border-red-200 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-red-50 border-b">
            <span className="text-xs font-bold text-red-700">⚠️ SKU thiếu tồn kho — không thể xuất</span>
          </div>
          <div className="divide-y divide-red-50">
            {shortages.map((s: any, idx: number) => (
              <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">{s.skuCode}</p>
                  <p className="text-[10px] text-gray-400">Có sẵn: {s.availableQty} · Yêu cầu: {s.requestedQty}</p>
                </div>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">Thiếu {s.shortageQty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {fullyAllocated ? (
        <button onClick={onDone} className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2">
          Xác nhận — Tạo Pick List
        </button>
      ) : (
        <div className="space-y-2">
          <div className="p-3 bg-red-50 rounded-xl border border-red-200">
            <p className="text-xs text-red-700 font-semibold mb-1">⛔ Không thể tạo Pick List khi thiếu hàng</p>
            <p className="text-xs text-red-600">Cần báo Manager để bổ sung tồn kho hoặc điều chỉnh đơn hàng.</p>
          </div>
          <button onClick={() => setShowShortageConfirm(true)} disabled={reporting}
            className="w-full py-2.5 text-sm font-semibold text-white bg-red-600 rounded-xl hover:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {reporting && <Spin />}
            {reporting ? 'Đang gửi báo cáo...' : 'Báo thiếu hàng lên Manager'}
          </button>
          {/* [BUG-FIX] Note: nút này sẽ bị ẩn khi SO chuyển sang ON_HOLD sau khi báo thiếu thành công.
              Guard BE cũng chặn duplicate nếu FE vẫn hiển thị nút (ví dụ tab cũ chưa reload). */}
          <ConfirmModal open={showShortageConfirm} icon="report" iconColor="text-red-500"
            title="Xác nhận báo thiếu hàng?" confirmLabel="Báo thiếu hàng" confirmColor="bg-red-600 hover:bg-red-700"
            description="Hệ thống sẽ tạo Incident báo cáo danh sách SKU thiếu. Manager sẽ nhận thông báo và xử lý."
            loading={reporting} onConfirm={handleReportShortage} onCancel={() => setShowShortageConfirm(false)} />
        </div>
      )}
      </>)}
    </div>
  );
}

// ─── Step 2: Generate Pick List ─────────────────────────────────────────────────
function PickListGeneratePanel({ item, onDone, onCreated }: {
  item: OutboundListItem; onDone: () => void; onCreated: (taskId: number, items: PickListItem[]) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handle = async () => {
    setShowConfirm(false);
    try {
      setLoading(true);
      const res = await generatePickList(item.documentId, item.orderType);
      setPickList(res);
      onCreated(res.taskId, res.items ?? []);
      toast.success('Tạo Pick List thành công!');
      onDone();
    } catch (err: unknown) {
      if (!(err as any)._toastedByInterceptor) {
        const msg = (err as any)?.response?.data?.message ?? (err as any)?.message ?? 'Tạo Pick List thất bại.';
        toast.error(msg, { duration: 8000 });
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-3 mb-3">
          <span className="material-symbols-outlined text-blue-500 text-xl mt-0.5">route</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Bước 2 — Tạo Pick List</p>
            <p className="text-xs text-blue-600 mt-0.5">Hệ thống tạo lộ trình lấy hàng theo FEFO: Zone → Dãy → Kệ → BIN.</p>
          </div>
        </div>
        <button onClick={() => setShowConfirm(true)} disabled={loading}
          className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <Spin />}
          {loading ? 'Đang tạo...' : 'Lấy Pick List'}
        </button>
      </div>
      {pickList && <PickListTable pickList={pickList} />}
      <ConfirmModal open={showConfirm} icon="route" iconColor="text-blue-500"
        title="Xác nhận tạo Pick List?" confirmLabel="Tạo Pick List" confirmColor="bg-blue-600 hover:bg-blue-700"
        description="Hệ thống sẽ tạo lộ trình lấy hàng tối ưu từ tồn kho đã phân bổ."
        loading={loading} onConfirm={handle} onCancel={() => setShowConfirm(false)} />
    </div>
  );
}

// ─── Pick List Table ────────────────────────────────────────────────────────────
function PickListTable({ pickList }: { pickList: PickListResponse }) {
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-700">Pick List</span>
          <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">#{pickList.taskId}</span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            pickList.status === 'PICKED' ? 'bg-emerald-50 text-emerald-600' :
            pickList.status === 'QC_IN_PROGRESS' ? 'bg-purple-50 text-purple-600' :
            'bg-blue-50 text-blue-600'
          }`}>{pickList.status}</span>
        </div>
        <span className="text-xs text-gray-400">{pickList.items?.length ?? 0} dòng</span>
      </div>
      <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
        {(pickList.items ?? []).map((pi, idx) => (
          <div key={pi.taskItemId ?? idx} className="px-4 py-2.5 flex items-center gap-3">
            <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {(pi as any).sequence ?? idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                {pi.zoneCode && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{pi.zoneCode}</span>}
                {(pi as any).rackCode && <span className="text-[10px] text-gray-500">/ {(pi as any).rackCode}</span>}
                <span className="text-xs font-bold text-gray-800">{pi.locationCode}</span>
                {pi.lotNumber && <span className="text-[10px] text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">LOT {pi.lotNumber}</span>}
                {pi.expiryDate && <span className="text-[10px] text-gray-400">HSD: {new Date(pi.expiryDate).toLocaleDateString('vi-VN')}</span>}
              </div>
              <p className="text-[11px] text-gray-600 mt-0.5">{pi.skuCode} · {pi.skuName}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-bold text-blue-600">×{pi.qtyToPick ?? pi.requiredQty}</p>
              {pi.status === 'PICKED' && <span className="text-[10px] text-emerald-600">✓ Đã lấy</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pick Note Upload Block ────────────────────────────────────────────────────
function PickNoteUploadBlock({ soId }: { soId: number }) {
  const feBase = process.env.NEXT_PUBLIC_FE_BASE_URL ?? 'https://cleanhousewms.id.vn';
  const pickSignUrl = `${feBase}/sign-note/${soId}?type=pick`;
  const [pickNoteUrl, setPickNoteUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (pickNoteUrl) return;
    const interval = setInterval(async () => {
      try {
        const { data } = await (await import('@/config/axios')).default
          .get(`/outbound/${soId}`, { params: { orderType: 'SALES_ORDER' } });
        const url = data?.data?.pickSignedNoteUrl;
        if (url) setPickNoteUrl(url);
      } catch { /* silent */ }
    }, 2000);
    return () => clearInterval(interval);
  }, [soId, pickNoteUrl]);

  return (
    <div className="p-4 bg-white rounded-xl border border-blue-200 space-y-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        QR ký — Keeper chụp ảnh phiếu đã ký
      </p>
      {pickNoteUrl ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            <span className="text-xs text-emerald-600 font-semibold">Đã có ảnh phiếu lấy hàng</span>
          </div>
          <a href={pickNoteUrl} target="_blank" rel="noreferrer" className="block">
            <img src={pickNoteUrl} alt="Phiếu lấy hàng đã ký"
              className="w-full rounded-xl border border-gray-200 object-contain max-h-48 bg-gray-50 hover:opacity-90 cursor-zoom-in" />
          </a>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 leading-relaxed">
            Keeper đã ký phiếu? Scan QR bên dưới để chụp ảnh phiếu đã ký và lưu lên hệ thống.
          </p>
          <div className="flex flex-col items-center gap-2 bg-gradient-to-b from-blue-50 to-white rounded-xl p-4 border border-blue-100">
            <div className="bg-white p-2 rounded-xl shadow-sm border border-blue-100">
              <QRCode value={pickSignUrl} size={100} />
            </div>
            <p className="text-[11px] font-semibold text-blue-700">Keeper scan để chụp ảnh phiếu đã ký</p>
          </div>
          <div className="flex items-center justify-center gap-2 py-1 text-xs text-blue-400">
            <span className="material-symbols-outlined text-[13px] animate-spin">progress_activity</span>
            Đang chờ ảnh từ điện thoại...
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Step 3: Picking Panel (QR-based) ─────────────────────────────────────────
function PickingPanel({ item, taskId: initTaskId, onDone }: {
  item: OutboundListItem; taskId: number | null; onDone: (taskId: number) => void;
}) {
  const [pickList,       setPickList]       = useState<PickListResponse | null>(null);
  const [resolvedTaskId, setResolvedTaskId] = useState<number | null>(initTaskId);
  const [listLoading,    setListLoading]    = useState(false);
  const [qrValue,     setQrValue]     = useState<string | null>(null);
  const [qrLoading,   setQrLoading]   = useState(false);
  const [qrError,     setQrError]     = useState<string | null>(null);
  const [copied,      setCopied]      = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef   = useRef(true);
  const sessionIdRef = useRef<string | null>(null);

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setListLoading(true);
        const pl = initTaskId
          ? await fetchPickList(initTaskId)
          : await fetchPickListByDocument(item.documentId);
        if (!cancelled) { setPickList(pl); setResolvedTaskId(pl.taskId); }
      } catch { if (!cancelled) setPickList(null); }
      finally   { if (!cancelled) setListLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [item.documentId, initTaskId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      const sid = sessionIdRef.current;
      if (sid) deleteSession(sid).catch(() => {});
    };
  }, []); // eslint-disable-line

  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  const startPolling = useCallback((taskId: number) => {
    stopPolling();
    pollRef.current = setInterval(async () => {
      if (!mountedRef.current) { stopPolling(); return; }
      try {
        const pl = await fetchPickList(taskId);
        if (!mountedRef.current) return;
        if (pl.status === 'PICKED' || pl.status === 'QC_IN_PROGRESS') {
          stopPolling();
          setIsFinalized(true);
          toast.success('Keeper đã xác nhận lấy hàng xong! Chuyển sang QC.', { duration: 5000 });
          onDoneRef.current(taskId);
        }
      } catch { /* silent */ }
    }, 5000);
  }, []); // eslint-disable-line

  const generateQR = useCallback(async () => {
    const tid = resolvedTaskId;
    if (!tid) { setQrError('Chưa có Task ID. Vui lòng chờ tải xong Pick List.'); return; }
    setQrLoading(true); setQrError(null); setQrValue(null); setIsFinalized(false); stopPolling();
    try {
      const session = await createReceivingSession();
      if (!mountedRef.current) return;
      sessionIdRef.current = session.sessionId;
      const tokenData = await generateScanToken(session.sessionId);
      if (!tokenData.scanToken) throw new Error('Không nhận được scanToken');
      const rawUrl = await getScanUrl(tokenData.scanToken, null);
      const url = rawUrl + `&taskId=${tid}&mode=outbound_picking`;
      if (!mountedRef.current) return;
      setQrValue(url);
      toast.success('Tạo QR thành công', { id: 'pick-qr' });
      startPolling(tid);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setQrError(err instanceof Error ? err.message : 'Không tạo được QR');
    } finally {
      if (mountedRef.current) setQrLoading(false);
    }
  }, [resolvedTaskId, startPolling]);

  const handleCopy = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  if (listLoading) {
    return (
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 animate-pulse space-y-2">
        <div className="h-4 bg-blue-100 rounded w-1/2" />
        <div className="h-20 bg-blue-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-3">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5">forklift</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Bước 3 — Keeper lấy hàng theo Pick List</p>
            <p className="text-xs text-blue-600 mt-1 leading-relaxed">
              <strong>1.</strong> In phiếu → Keeper lấy đúng BIN / SKU / số lô / SL → Ký phiếu.<br/>
              <strong>2.</strong> QR ký: Keeper scan QR bên dưới để chụp ảnh phiếu đã ký.<br/>
              <strong>3.</strong> QR quét: Keeper dùng link scan để quét barcode từng SKU → gửi sang QC.
            </p>
          </div>
        </div>
        <PickListPdfButton soId={item.documentId} soCode={item.documentCode} />
      </div>

      <PickNoteUploadBlock soId={item.documentId} />

      {isFinalized && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl flex items-center gap-3">
          <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
          <div>
            <p className="text-sm font-bold text-emerald-800">Keeper đã xác nhận lấy đủ hàng!</p>
            <p className="text-xs text-emerald-600 mt-0.5">Đơn hàng đã chuyển sang bước QC Scan.</p>
          </div>
        </div>
      )}

      {!isFinalized && (
        <div className="border border-blue-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-blue-50 border-b flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">📱 QR quét barcode (Keeper)</span>
            {resolvedTaskId && (
              <span className="text-[10px] font-mono text-blue-400 bg-blue-100 px-2 py-0.5 rounded">Pick #{resolvedTaskId}</span>
            )}
          </div>
          <div className="p-4">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-3 py-6"><Spin /><p className="text-sm text-gray-400">Đang tạo QR Code...</p></div>
            ) : qrError ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
                <p className="text-sm text-red-500 text-center">{qrError}</p>
                <button onClick={generateQR} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700">Thử lại</button>
              </div>
            ) : qrValue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white border-2 border-blue-200 rounded-xl shadow-sm relative">
                  <QRCode value={qrValue} size={180} level="H" />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-blue-600 font-bold">LIVE</span>
                  </div>
                </div>
                <div className="w-full bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
                  <p className="text-[10px] text-gray-500 flex-1 truncate font-mono">{qrValue}</p>
                  <button onClick={handleCopy} className="flex-shrink-0 text-[11px] font-semibold text-blue-600 px-2 py-1 bg-white border border-blue-200 rounded-lg">
                    {copied ? '✓ Đã copy' : 'Copy'}
                  </button>
                </div>
                <a href={qrValue} target="_blank" rel="noreferrer"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 flex items-center justify-center">
                  Mở trang scan (test trực tiếp)
                </a>
                <button onClick={generateQR} className="text-xs text-gray-400 hover:text-gray-600">Tạo lại QR</button>
                <p className="text-[11px] text-blue-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse inline-block" />
                  Đang chờ Keeper hoàn tất quét barcode trên điện thoại...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-blue-500 text-2xl">qr_code</span>
                </div>
                <p className="text-xs text-gray-500 text-center">Bấm nút bên dưới để tạo QR Code cho Keeper quét.</p>
                <button onClick={generateQR} disabled={!resolvedTaskId}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50">
                  Tạo QR quét barcode cho Keeper
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pickList ? <PickListTable pickList={pickList} /> : (
        !listLoading && (
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">
            Không tải được Pick List. Vui lòng thử lại.
          </div>
        )
      )}
    </div>
  );
}

// ─── Step 4: QC Scan Panel ─────────────────────────────────────────────────────
function QcScanPanel({ taskId, onAllScanned, onAlreadyDone, viewerRole }: { taskId: number; onAllScanned: () => void; onAlreadyDone?: () => void; viewerRole?: string }) {
  const [qcSummary, setQcSummary]   = useState<QcSummaryResponse | null>(null);
  const [pickItems, setPickItems]   = useState<PickListItem[]>([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [qrValue,    setQrValue]    = useState<string | null>(null);
  const [qrLoading,  setQrLoading]  = useState(false);
  const [qrError,    setQrError]    = useState<string | null>(null);
  const [copied,     setCopied]     = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const mountedRef   = useRef(true);
  const sessionIdRef = useRef<string | null>(null);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const onAllScannedRef = useRef(onAllScanned);
  useEffect(() => { onAllScannedRef.current = onAllScanned; }, [onAllScanned]);
  const onAlreadyDoneRef = useRef(onAlreadyDone);
  useEffect(() => { onAlreadyDoneRef.current = onAlreadyDone; }, [onAlreadyDone]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopPolling();
      const sid = sessionIdRef.current;
      if (sid) deleteSession(sid).catch(() => {});
    };
  }, []); // eslint-disable-line

  const stopPolling = () => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  };

  const isFinalizedRef = useRef(false);
  const refreshSummary = useCallback(async () => {
    try {
      const [s, pl] = await Promise.all([fetchQcSummary(taskId), fetchPickList(taskId)]);
      if (!mountedRef.current) return;
      setQcSummary(s);
      setPickItems(pl.items ?? []);
      const total = (s.passCount ?? 0) + (s.failCount ?? 0) + (s.holdCount ?? 0) + (s.pendingCount ?? 0);
      const done  = (s.pendingCount ?? 0) === 0 && total > 0;
      if (done && !isFinalizedRef.current) {
        isFinalizedRef.current = true;
        setIsFinalized(true);
        stopPolling();
        setTimeout(() => { if (mountedRef.current) onAllScannedRef.current(); }, 600);
      }
    } catch {}
  }, [taskId]);

  useEffect(() => {
    setSummaryLoading(true);
    (async () => {
      try {
        const [s, pl] = await Promise.all([fetchQcSummary(taskId), fetchPickList(taskId)]);
        if (!mountedRef.current) return;
        setQcSummary(s);
        setPickItems(pl.items ?? []);
        if (s.passCount > 0 || s.failCount > 0 || s.holdCount > 0 || s.allScanned) {
          setSessionStarted(true);
        }
        const total = (s.passCount ?? 0) + (s.failCount ?? 0) + (s.holdCount ?? 0) + (s.pendingCount ?? 0);
        const done  = (s.pendingCount ?? 0) === 0 && total > 0;
        if (done) {
          isFinalizedRef.current = true;
          setIsFinalized(true);
          stopPolling();
          setTimeout(() => { if (mountedRef.current) (onAlreadyDoneRef.current ?? onAllScannedRef.current)?.(); }, 300);
        } else {
          startPolling();
        }
      } catch {}
      finally { if (mountedRef.current) setSummaryLoading(false); }
    })();
  }, [taskId]); // eslint-disable-line

  const startPolling = useCallback(() => {
    stopPolling();
    pollRef.current = setInterval(() => {
      if (mountedRef.current) refreshSummary();
    }, 3000);
  }, [refreshSummary]);

  const generateQR = useCallback(async () => {
    if (isFinalizedRef.current) return;
    setQrLoading(true); setQrError(null); setQrValue(null);
    try {
      try { await startQcSession(taskId); } catch { /* already started — ok */ }
      if (!mountedRef.current) return;
      const session   = await createReceivingSession();
      if (!mountedRef.current) return;
      sessionIdRef.current = session.sessionId;
      const tokenData = await generateScanToken(session.sessionId);
      if (!tokenData.scanToken) throw new Error('Không nhận được scanToken');
      const rawUrl = await getScanUrl(tokenData.scanToken, null);
      const url    = rawUrl + `&taskId=${taskId}&mode=outbound_qc`;
      if (!mountedRef.current) return;
      setQrValue(url);
      toast.success('QR sẵn sàng — dùng điện thoại quét!', { id: 'qc-qr' });
      startPolling();
    } catch (err: unknown) {
      if (mountedRef.current) setQrError(err instanceof Error ? err.message : 'Không tạo được QR');
    } finally {
      if (mountedRef.current) setQrLoading(false);
    }
  }, [taskId, startPolling]);

  const handleCopy = () => {
    if (!qrValue) return;
    navigator.clipboard.writeText(qrValue).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const pending = pickItems.filter(i => !i.qcResult);
  const scanned = pickItems.filter(i => !!i.qcResult);
  const summaryTotal   = qcSummary ? (qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount + qcSummary.pendingCount) : pickItems.length;
  const summaryScanned = qcSummary ? (qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount) : scanned.length;
  const total = summaryTotal;
  const pct   = total > 0 ? Math.round((summaryScanned / total) * 100) : 0;

  return (
    <div className="space-y-3">
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-purple-600 text-xl mt-0.5">qr_code_scanner</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-800">Bước 4 — QC Kiểm tra hàng</p>
            <p className="text-xs text-purple-600 mt-0.5">
              {viewerRole === 'KEEPER'
                ? <>Đang chờ QC kiểm tra hàng. Màn hình tự cập nhật mỗi 3 giây.</>
                : <>Tạo QR → Dùng điện thoại quét từng barcode → Chọn <strong>PASS / FAIL / HOLD</strong> trên điện thoại. Màn hình tự cập nhật mỗi 3 giây.</>
              }
            </p>
          </div>
          <span className="text-xs font-mono text-purple-500 bg-purple-100 px-2 py-0.5 rounded flex-shrink-0">#{taskId}</span>
        </div>
      </div>

      {summaryLoading ? (
        <div className="grid grid-cols-4 gap-2">
          {[0,1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : qcSummary ? (
        <>
          <div className="grid grid-cols-4 gap-2">
            {([
              ['PASS', qcSummary.passCount,    'text-emerald-600 bg-emerald-50 border-emerald-100'],
              ['FAIL', qcSummary.failCount,    'text-red-600 bg-red-50 border-red-100'],
              ['HOLD', qcSummary.holdCount,    'text-amber-600 bg-amber-50 border-amber-100'],
              ['Chờ',  qcSummary.pendingCount, 'text-gray-600 bg-gray-50 border-gray-100'],
            ] as [string, number, string][]).map(([lbl, val, cls]) => (
              <div key={lbl} className={`rounded-xl p-3 text-center border ${cls}`}>
                <p className="text-lg font-bold">{val}</p>
                <p className="text-[10px] font-semibold">{lbl}</p>
              </div>
            ))}
          </div>
          <div>
            <div className="flex justify-between text-[11px] text-gray-500 mb-1">
              <span>Tiến độ QC</span>
              <span>{summaryScanned}/{total} · {pct}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </>
      ) : null}

      {isFinalized ? (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-200 rounded-xl">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-emerald-600 text-2xl">check_circle</span>
            <p className="text-sm font-bold text-emerald-800">QC hoàn tất!</p>
          </div>
          <p className="text-xs text-emerald-600 ml-9">Toàn bộ mặt hàng đã được kiểm tra. Có thể tiến hành xuất kho.</p>
          <p className="text-[11px] text-emerald-500 mt-1.5 ml-9 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">lock</span>
            Mã QR đã bị khoá — không thể scan thêm
          </p>
        </div>
      ) : viewerRole === 'KEEPER' ? (
        <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
          <p className="text-xs text-purple-700">Đang chờ QC scan trên điện thoại — tự động cập nhật mỗi 3 giây...</p>
        </div>
      ) : (
        <div className="border border-purple-100 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 bg-purple-50 border-b flex items-center justify-between">
            <span className="text-xs font-bold text-purple-700">📱 Mã QR Scanner</span>
            {qrValue && !isFinalized && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE
              </span>
            )}
          </div>
          <div className="p-4">
            {qrLoading ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Spin />
                <p className="text-sm text-gray-400">Đang tạo QR Code...</p>
              </div>
            ) : qrError ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <span className="material-symbols-outlined text-red-400 text-3xl">error</span>
                <p className="text-sm text-red-500 text-center">{qrError}</p>
                <button onClick={generateQR} className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-xl hover:bg-purple-700">Thử lại</button>
              </div>
            ) : qrValue ? (
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white border-2 border-purple-200 rounded-xl shadow-sm relative">
                  <QRCode value={qrValue} size={180} level="H" />
                  <div className="absolute top-2 right-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                    <span className="text-[9px] text-purple-600 font-bold">LIVE</span>
                  </div>
                </div>
                <div className="w-full bg-gray-50 rounded-lg border border-gray-200 px-3 py-2 flex items-center gap-2">
                  <p className="text-[10px] text-gray-500 flex-1 truncate font-mono">{qrValue}</p>
                  <button onClick={handleCopy} className="flex-shrink-0 text-[11px] font-semibold text-purple-600 px-2 py-1 bg-white border border-purple-200 rounded-lg">
                    {copied ? '✓ Đã copy' : 'Copy'}
                  </button>
                </div>
                <a href={qrValue} target="_blank" rel="noreferrer"
                  className="w-full py-2.5 text-sm font-semibold text-white bg-orange-500 rounded-xl hover:bg-orange-600 flex items-center justify-center">
                  Mở trang scan (test trực tiếp)
                </a>
                <button onClick={generateQR} className="text-xs text-gray-400 hover:text-gray-600">Tạo lại QR</button>
                <p className="text-[11px] text-purple-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse inline-block" />
                  Đang chờ QC hoàn tất trên điện thoại...
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 py-4">
                <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-purple-500 text-2xl">qr_code</span>
                </div>
                <p className="text-xs text-gray-500 text-center">Bấm nút bên dưới để tạo QR Code scan QC.</p>
                <button onClick={generateQR}
                  className="w-full py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
                  Tạo QR Code để scan QC
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {pickItems.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          {pending.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <span className="text-xs font-semibold text-gray-600">Chờ scan ({qcSummary ? qcSummary.pendingCount : pending.length})</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                {pending.map((pi, idx) => (
                  <div key={pi.taskItemId ?? idx} className="px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{pi.skuCode}</p>
                      <p className="text-[10px] text-gray-400">{pi.locationCode}{pi.lotNumber ? ` · LOT ${pi.lotNumber}` : ''}</p>
                    </div>
                    <span className="text-xs text-gray-400">×{pi.qtyToPick ?? pi.requiredQty}</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {scanned.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Đã scan ({summaryScanned})</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                {scanned.map((pi, idx) => (
                  <div key={pi.taskItemId ?? idx} className="px-4 py-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{pi.skuCode}</p>
                      <p className="text-[10px] text-gray-400">{pi.locationCode}</p>
                    </div>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      pi.qcResult === 'PASS' ? 'text-emerald-700 bg-emerald-50'
                        : pi.qcResult === 'FAIL' ? 'text-red-700 bg-red-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}>{pi.qcResult}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── [BUG-FIX GAP 4] QcFinalizeOrDispatch ────────────────────────────────────────
// Gọi finalizeQc khi QC xong. Nếu có FAIL → SO chuyển ON_HOLD → không show Dispatch.
// Nếu pass sạch → show DispatchPanel bình thường.
function QcFinalizeOrDispatch({
  taskId, item, onDispatched, onOnHold,
}: {
  taskId: number;
  item: OutboundListItem;
  onDispatched: () => void;
  onOnHold: () => void;
}) {
  const [state, setState] = React.useState<'finalizing' | 'dispatch' | 'on_hold' | 'error'>('finalizing');
  const [failCount, setFailCount] = React.useState(0);
  const finalizedRef = React.useRef(false);

  React.useEffect(() => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    (async () => {
      try {
        const summary = await finalizeQc(taskId);
        const fails = summary.failCount ?? 0;
        setFailCount(fails);
        if (fails > 0) {
          // BE đã set SO → ON_HOLD và tạo DAMAGE incident
          setState('on_hold');
          toast.error(
            `⚠️ Có ${fails} item FAIL — Đơn bị tạm giữ. Manager cần xử lý trước khi xuất kho.`,
            { duration: 8000 }
          );
          onOnHold();
        } else {
          setState('dispatch');
        }
      } catch (err: any) {
        // Nếu lỗi (vd đã finalize rồi) → thử lấy summary để biết trạng thái thực
        try {
          const { fetchQcSummary: getSum } = await import('@/services/outboundService');
          const s = await getSum(taskId);
          if ((s.failCount ?? 0) > 0) {
            setState('on_hold');
            onOnHold();
          } else {
            setState('dispatch');
          }
        } catch {
          setState('error');
        }
      }
    })();
  }, [taskId]);

  if (state === 'finalizing') {
    return (
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 flex items-center gap-3">
        <Spin />
        <p className="text-sm text-purple-700 font-medium">Đang xử lý kết quả QC...</p>
      </div>
    );
  }

  if (state === 'on_hold') {
    return (
      <div className="p-4 bg-red-50 rounded-xl border-2 border-red-200 space-y-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
          <p className="text-sm font-bold text-red-800">
            ⚠️ Có {failCount} item FAIL — Không thể xuất kho
          </p>
        </div>
        <p className="text-xs text-red-600 ml-7">
          Manager đã nhận báo cáo hàng lỗi. Chờ Manager xem xét và xử lý trước khi tiếp tục.
        </p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
        <p className="text-xs text-amber-700 font-semibold">
          Không thể xác nhận kết quả QC. Vui lòng tải lại trang.
        </p>
      </div>
    );
  }

  // state === 'dispatch': tất cả PASS
  return <DispatchPanel item={item} onDone={onDispatched} />;
}

// ─── Step 5: Dispatch Panel ─────────────────────────────────────────────────────
function DispatchPanel({ item, onDone }: { item: OutboundListItem; onDone: () => void }) {
  const [note, setNote] = useState<DispatchNoteResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDispatch = async () => {
    setShowConfirm(false);
    try {
      setDispatching(true);
      await confirmDispatch(item.documentId);
      toast.success('Xuất kho thành công!');
      onDone();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message
        ?? (err as any)?.message
        ?? 'Xuất kho thất bại. Vui lòng kiểm tra lại.';
      toast.error(msg, { duration: 8000 });
    } finally { setDispatching(false); }
  };

  return (
    <div className="space-y-3">
      <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
        <div className="flex items-start gap-3 mb-3">
          <span className="material-symbols-outlined text-teal-600 text-xl mt-0.5">local_shipping</span>
          <div>
            <p className="text-sm font-semibold text-teal-800">Bước 5 — Xuất kho</p>
            <p className="text-xs text-teal-600 mt-0.5">QC hoàn tất. Xem phiếu Dispatch, chất hàng lên xe và xác nhận. Hệ thống sẽ trừ tồn khỏi <span className="font-bold">Z-OUT</span>.</p>
          </div>
        </div>
        <button
          onClick={() => { setLoading(true); fetchDispatchNote(item.documentId).then(setNote).catch(() => {}).finally(() => setLoading(false)); }}
          disabled={loading}
          className="w-full py-2 text-sm font-medium text-teal-700 bg-white border border-teal-200 rounded-xl hover:bg-teal-50 flex items-center justify-center gap-2 disabled:opacity-60">
          {loading && <span className="w-4 h-4 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />}
          {loading ? 'Đang tải...' : 'Xem Dispatch Note'}
        </button>
      </div>
      {note && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b">
            <p className="text-xs font-bold text-gray-700">{note.documentCode}</p>
            <p className="text-[10px] text-gray-400">{note.customerName}</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
            {note.items.map((ni, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-gray-800">{ni.skuCode}</p>
                  <p className="text-[10px] text-gray-400">{ni.locationCode}</p>
                </div>
                <span className="text-sm font-semibold text-teal-600">×{ni.quantity}</span>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 border-t">
            <button onClick={() => setShowConfirm(true)} disabled={dispatching}
              className="w-full py-2.5 text-sm font-bold text-white bg-teal-600 rounded-xl hover:bg-teal-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {dispatching && <Spin />}
              {dispatching ? 'Đang xuất kho...' : '✅ Xác nhận xuất kho'}
            </button>
          </div>
        </div>
      )}
      <ConfirmModal open={showConfirm} icon="local_shipping" iconColor="text-teal-500"
        title="Xác nhận xuất kho?" confirmLabel="Xác nhận xuất kho" confirmColor="bg-teal-600 hover:bg-teal-700"
        description="Hàng sẽ được trừ tồn khỏi Z-OUT và lệnh xuất chuyển sang DISPATCHED. Thao tác này không thể hoàn tác."
        loading={dispatching} onConfirm={handleDispatch} onCancel={() => setShowConfirm(false)} />
    </div>
  );
}

// ─── Constants ──────────────────────────────────────────────────────────────────
const STATUS_ORDER: Record<string, number> = {
  DRAFT: 0, PENDING_APPROVAL: 1, APPROVED: 2, ALLOCATED: 3,
  PICKING: 4, QC_SCAN: 5, ON_HOLD: 5, WAITING_STOCK: 2,
  DISPATCHED: 6, REJECTED: 7, CANCELLED: 8,
};

const STEPS = [
  { status: 'DRAFT',            label: 'Nháp',      icon: 'draft' },
  { status: 'PENDING_APPROVAL', label: 'Chờ duyệt', icon: 'pending_actions' },
  { status: 'APPROVED',         label: 'Đã duyệt',  icon: 'verified' },
  { status: 'ALLOCATED',        label: 'Phân bổ',   icon: 'inventory' },
  { status: 'PICKING',          label: 'Lấy hàng',  icon: 'forklift' },
  { status: 'QC_SCAN',          label: 'QC Scan',   icon: 'qr_code_scanner' },
  { status: 'DISPATCHED',       label: 'Xuất kho',  icon: 'local_shipping' },
];

function FlowProgress({ current }: { current: string }) {
  const displayStatus = current === 'ON_HOLD' ? 'QC_SCAN' : current === 'WAITING_STOCK' ? 'APPROVED' : current;
  const idx = STEPS.findIndex(s => s.status === displayStatus);
  if (idx < 0 || current === 'REJECTED' || current === 'CANCELLED') return null;
  return (
    <div className="flex items-center overflow-x-auto pb-0.5 mt-2">
      {STEPS.map((step, i) => {
        const done = i < idx, active = i === idx;
        return (
          <div key={step.status} className="flex items-center flex-shrink-0">
            <div className={`flex flex-col items-center gap-0.5 ${done ? 'opacity-70' : !active ? 'opacity-25' : ''}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                done ? 'bg-emerald-100 text-emerald-600' :
                active ? 'bg-indigo-600 text-white shadow-sm' :
                'bg-gray-100 text-gray-400'
              }`}>
                {done
                  ? <span className="material-symbols-outlined text-[12px]">check</span>
                  : <span className="material-symbols-outlined text-[12px]">{step.icon}</span>}
              </div>
              <span className={`text-[9px] font-semibold whitespace-nowrap ${active ? 'text-indigo-600' : 'text-gray-400'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-4 h-0.5 mx-0.5 mb-3 flex-shrink-0 ${i < idx ? 'bg-emerald-300' : 'bg-gray-200'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Modal ─────────────────────────────────────────────────────────────────
interface Props {
  item: OutboundListItem | null;
  onClose: () => void;
  onRefresh: () => void;
}

export default function OutboundDetailModal({ item, onClose, onRefresh }: Props) {
  const [localStatus, setLocalStatus] = useState(item?.status ?? 'DRAFT');
  const [showEditModal, setShowEditModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const [qcDone, setQcDone] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const role = getUserRole();

  // [V20] state cho IncidentDetailModal từ banner
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);

  useEffect(() => {
    if (!taskId || localStatus !== 'QC_SCAN' || qcDone) return;
    fetchQcSummary(taskId)
      .then(s => {
        const total = (s.passCount ?? 0) + (s.failCount ?? 0) + (s.holdCount ?? 0) + (s.pendingCount ?? 0);
        if ((s.pendingCount ?? 0) === 0 && total > 0) setQcDone(true);
      })
      .catch(() => {});
  }, [taskId, localStatus, qcDone]);

  const prevDocumentIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!item) return;
    const isNewDocument = prevDocumentIdRef.current !== item.documentId;
    prevDocumentIdRef.current = item.documentId;

    setLocalStatus(prev => {
      if (isNewDocument) return item.status;
      const incomingOrder = STATUS_ORDER[item.status] ?? 0;
      const currentOrder  = STATUS_ORDER[prev] ?? 0;
      if (incomingOrder > currentOrder || item.status === 'REJECTED' || item.status === 'CANCELLED') {
        return item.status;
      }
      return prev;
    });
    if (isNewDocument) { setTaskId(null); setQcDone(false); }
  }, [item?.documentId, item?.status]);

  useEffect(() => {
    if (!item) return;
    setOrderDetail(null);
    fetchOutboundDetail(item.documentId, item.orderType)
      .then(d => setOrderDetail(d))
      .catch(() => {});
  }, [item?.documentId]);

  useEffect(() => {
    if (localStatus !== 'DISPATCHED' || !item) return;
    if (orderDetail?.signedNoteUrl) return;
    const interval = setInterval(async () => {
      try {
        const d = await fetchOutboundDetail(item.documentId, item.orderType);
        if (d?.signedNoteUrl) setOrderDetail(d);
      } catch { /* silent */ }
    }, 1500);
    return () => clearInterval(interval);
  }, [localStatus, item?.documentId, orderDetail?.signedNoteUrl]);

  if (!item) return null;

  const isSO = item.orderType === 'SALES_ORDER';
  const badge = OUTBOUND_STATUS_BADGE[localStatus as keyof typeof OUTBOUND_STATUS_BADGE]
    ?? { label: localStatus, className: 'bg-gray-100 text-gray-500' };
  const dispatchPdfUrl: string | null = orderDetail?.dispatchPdfUrl ?? null;

  const handleSubmit = async () => {
    setShowSubmitConfirm(false);
    try {
      setActionLoading(true);
      if (isSO) await submitSalesOrder(item.documentId);
      else await submitTransfer(item.documentId);
      toast.success(isSO ? 'Đã gửi duyệt!' : 'Internal Transfer tự động duyệt!');
      setLocalStatus(isSO ? 'PENDING_APPROVAL' : 'APPROVED');
      onRefresh();
    } catch { } finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    setShowApproveConfirm(false);
    try {
      setActionLoading(true);
      await approveSalesOrder(item.documentId);
      toast.success('Đã duyệt lệnh xuất!');
      setLocalStatus('APPROVED');
      onRefresh();
    } catch { } finally { setActionLoading(false); }
  };

  const handleReject = async (reason: string) => {
    try {
      setActionLoading(true);
      await rejectSalesOrder(item.documentId, reason);
      toast.success('Đã từ chối.');
      setLocalStatus('REJECTED');
      setShowReject(false);
      onRefresh();
    } catch { } finally { setActionLoading(false); }
  };

  const renderContent = () => {
    const handleDelete = async () => {
      try {
        setDeleting(true);
        setShowDeleteConfirm(false);
        if (item.orderType === 'SALES_ORDER') await deleteSalesOrder(item.documentId);
        else await deleteTransfer(item.documentId);
        toast.success('Đã xoá lệnh xuất kho!');
        onClose(); onRefresh();
      } catch (err: unknown) {
        if (!(err as any)._toastedByInterceptor) {
          const msg = (err as any)?.response?.data?.message ?? 'Xoá thất bại.';
          toast.error(msg, { duration: 6000 });
        }
      } finally { setDeleting(false); }
    };

    // [V20] Trạng thái ON_HOLD — chờ Manager xử lý DAMAGE
    if (localStatus === 'ON_HOLD') {
      return (
        <div className="space-y-3">
          <OutboundStatusBanner
            status="ON_HOLD"
            soId={item.documentId}
            onIncidentClick={(inc) => { setSelectedIncident(inc); setShowIncidentModal(true); }}
          />
          <div className="p-4 bg-red-50 rounded-xl border border-red-100">
            <p className="text-sm text-red-700 font-medium">
              {role === 'MANAGER'
                ? 'Bấm vào Incident bên trên để xử lý hàng hỏng.'
                : 'Đơn đang tạm giữ — chờ Manager xử lý Incident QC FAIL.'}
            </p>
          </div>
        </div>
      );
    }

    // [V20] Trạng thái WAITING_STOCK — chờ hàng bù nhập kho
    if (localStatus === 'WAITING_STOCK') {
      return (
        <div className="space-y-3">
          <OutboundStatusBanner
            status="WAITING_STOCK"
            soId={item.documentId}
            onIncidentClick={(inc) => { setSelectedIncident(inc); setShowIncidentModal(true); }}
          />
          {role === 'KEEPER' && (
            <AllocatePanel item={item} onDone={() => { setLocalStatus('ALLOCATED'); onRefresh(); }} onReportShortageSuccess={() => { setLocalStatus('ON_HOLD'); onRefresh(); }} />
          )}
          {role === 'MANAGER' && (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-700 font-medium">Chờ Keeper Allocate lại sau khi hàng bù đã nhập kho.</p>
            </div>
          )}
        </div>
      );
    }

    if (localStatus === 'DRAFT') {
      if (role === 'KEEPER') return (
        <>
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">{isSO ? 'Submit để gửi Manager duyệt.' : 'Submit → tự động APPROVED (không cần Manager).'}</p>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={actionLoading || deleting}
            className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {actionLoading && <Spin />}
            {actionLoading ? 'Đang gửi...' : 'Gửi duyệt'}
          </button>
          <div className="flex gap-2">
            <button onClick={() => setShowEditModal(true)} disabled={actionLoading || deleting}
              className="flex-1 py-2 text-sm font-semibold text-indigo-600 bg-white border border-indigo-200 rounded-xl hover:bg-indigo-50 flex items-center justify-center gap-1.5 disabled:opacity-60">
              <span className="material-symbols-outlined text-[15px]">edit</span>
              Sửa
            </button>
            <button onClick={() => setShowDeleteConfirm(true)} disabled={actionLoading || deleting}
              className="flex-1 py-2 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 flex items-center justify-center gap-1.5 disabled:opacity-60">
              {deleting ? <Spin /> : <span className="material-symbols-outlined text-[15px]">delete</span>}
              {deleting ? 'Đang xoá...' : 'Xoá'}
            </button>
            <ConfirmModal
              open={showDeleteConfirm} icon="delete_forever" iconColor="text-red-500"
              title="Xoá lệnh xuất kho?" confirmLabel="Xoá" confirmColor="bg-red-600 hover:bg-red-700"
              description={`Bạn chắc chắn muốn xoá lệnh "${item.documentCode}"? Thao tác này không thể hoàn tác.`}
              loading={deleting} onConfirm={handleDelete} onCancel={() => setShowDeleteConfirm(false)}
            />
          </div>
        </div>
        {showEditModal && (
          <CreateOutboundModal
            open={showEditModal}
            onClose={() => setShowEditModal(false)}
            onCreated={() => { setShowEditModal(false); onRefresh(); }}
            editItem={orderDetail ?? null}
          />
        )}
        </>
      );
      if (role === 'MANAGER') return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Đơn đang ở trạng thái Nháp. Chờ Keeper submit.</p>
        </div>
      );
      return null;
    }

    if (localStatus === 'PENDING_APPROVAL') {
      if (role === 'MANAGER') return (
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
          <p className="text-sm text-orange-800 font-medium">Lệnh xuất đang chờ Manager duyệt.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowApproveConfirm(true)} disabled={actionLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {actionLoading && <Spin />}
              {actionLoading ? 'Đang xử lý...' : 'Duyệt'}
            </button>
            <button onClick={() => setShowReject(true)} disabled={actionLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-60">
              Từ chối
            </button>
          </div>
        </div>
      );
      if (role === 'KEEPER') return (
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
          <p className="text-sm text-orange-800 font-medium">Đang chờ Manager duyệt...</p>
        </div>
      );
      return null;
    }

    if (localStatus === 'APPROVED') {
      if (role === 'KEEPER') return <AllocatePanel item={item} onDone={() => { setLocalStatus('ALLOCATED'); onRefresh(); }} onReportShortageSuccess={() => { setLocalStatus('ON_HOLD'); onRefresh(); }} />;
      if (role === 'MANAGER') return (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm text-emerald-800 font-medium">✅ Đã duyệt. Chờ Keeper phân bổ tồn kho.</p>
        </div>
      );
      return null;
    }

    if (localStatus === 'ALLOCATED') {
      if (role === 'KEEPER') return (
        <PickListGeneratePanel item={item}
          onDone={() => { setLocalStatus('PICKING'); }}
          onCreated={(tid) => setTaskId(tid)} />
      );
      return (
        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <p className="text-sm text-indigo-800 font-medium">Tồn kho đã phân bổ. Chờ Keeper tạo Pick List.</p>
        </div>
      );
    }

    if (localStatus === 'PICKING') {
      if (role === 'KEEPER') return (
        <PickingPanel item={item} taskId={taskId}
          onDone={(tid) => { setTaskId(tid); setLocalStatus('QC_SCAN'); onRefresh(); }} />
      );
      return (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500 text-xl">forklift</span>
            <p className="text-sm text-blue-800 font-medium">Keeper đang lấy hàng theo Pick List.</p>
          </div>
        </div>
      );
    }

    if (localStatus === 'QC_SCAN') {
      if (role === 'QC' || role === 'KEEPER') {
        if (taskId) return (
          <div className="space-y-3">
            <QcScanPanel
              taskId={taskId}
              viewerRole={role}
              onAllScanned={() => {
                setQcDone(true);
                toast.success('✅ QC hoàn tất! Toàn bộ hàng đã được kiểm tra — có thể xuất kho.', { duration: 5000 });
                onRefresh();
              }}
              onAlreadyDone={() => {
                setQcDone(true);
                onRefresh();
              }}
            />
            {/* [BUG-FIX GAP 4] Khi QC xong (qcDone), phải gọi finalizeQc trước.
                 finalizeQc: auto-PASS items còn pending, tạo DAMAGE incident nếu có FAIL,
                 set SO → ON_HOLD. Sau đó reload localStatus từ server.
                 - Nếu fail=0 → show DispatchPanel
                 - Nếu fail>0 → SO đã ON_HOLD, onRefresh() sẽ cập nhật localStatus → ON_HOLD banner hiện */}
            {qcDone && role === 'KEEPER' && isSO && (
              <QcFinalizeOrDispatch
                taskId={taskId}
                item={item}
                onDispatched={() => { setLocalStatus('DISPATCHED'); onRefresh(); }}
                onOnHold={() => { setLocalStatus('ON_HOLD'); onRefresh(); }}
              />
            )}
            {!qcDone && role === 'KEEPER' && isSO && (
              <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                <p className="text-xs text-purple-600 font-semibold">⏳ Chờ QC scan xong toàn bộ hàng trước khi xuất kho</p>
              </div>
            )}
          </div>
        );
        return (
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
            <p className="text-sm text-purple-700 font-medium">🔍 Đơn đang ở giai đoạn QC Scan.</p>
            <p className="text-xs text-purple-500">Đang tải Pick Task...</p>
            <AutoLoadTaskId documentId={item.documentId} onLoaded={setTaskId} />
          </div>
        );
      }
      return (
        <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
          <p className="text-sm text-purple-700 font-medium">Đơn đang được QC kiểm tra hàng.</p>
        </div>
      );
    }

    if (localStatus === 'DISPATCHED') {
      const feBase = process.env.NEXT_PUBLIC_FE_BASE_URL ?? 'https://cleanhousewms.id.vn';
      const signUrl = `${feBase}/sign-note/${item.documentId}`;
      const signedNoteUrl   = orderDetail?.signedNoteUrl ?? null;
      const signedNoteAt    = orderDetail?.signedNoteUploadedAt ?? null;

      return (
        <div className="space-y-3">
          <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
            <p className="text-sm font-bold text-teal-800">Đã xuất kho thành công</p>
            <p className="text-xs text-teal-600 mt-1">Tồn kho đã được trừ khỏi Z-OUT. Lệnh xuất hoàn tất.</p>
          </div>
          {isSO && (
            <div className="p-4 bg-white rounded-xl border border-gray-200">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Phiếu xuất kho</p>
              <DispatchPdfButton soId={item.documentId} soCode={item.documentCode} existingPdfUrl={dispatchPdfUrl} />
            </div>
          )}
          {isSO && (
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ảnh phiếu lấy hàng đã ký</p>
              {orderDetail?.pickSignedNoteUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
                    <span className="text-xs text-emerald-600 font-semibold">Nhân viên đã ký xác nhận</span>
                    {orderDetail?.pickSignedNoteUploadedAt && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(orderDetail.pickSignedNoteUploadedAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <a href={orderDetail.pickSignedNoteUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={orderDetail.pickSignedNoteUrl} alt="Phiếu lấy hàng đã ký"
                      className="w-full rounded-xl border border-gray-200 object-contain max-h-64 bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
                  </a>
                  <p className="text-[11px] text-gray-400 text-center">Nhấn vào ảnh để xem full size</p>
                </div>
              ) : (
                <div className="flex items-center gap-2 py-2 text-xs text-gray-400">
                  <span className="material-symbols-outlined text-[16px]">image_not_supported</span>
                  Chưa có ảnh phiếu lấy hàng
                </div>
              )}
            </div>
          )}
          {isSO && (
            <div className="p-4 bg-white rounded-xl border border-gray-200 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Phiếu xuất kho đã ký</p>
              {signedNoteUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
                    <span className="text-xs text-emerald-600 font-semibold">Đã có chữ ký</span>
                    {signedNoteAt && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(signedNoteAt).toLocaleString('vi-VN')}
                      </span>
                    )}
                  </div>
                  <a href={signedNoteUrl} target="_blank" rel="noreferrer" className="block">
                    <img src={signedNoteUrl} alt="Phiếu xuất kho đã ký"
                      className="w-full rounded-xl border border-gray-200 object-contain max-h-64 bg-gray-50 hover:opacity-90 transition-opacity cursor-zoom-in" />
                  </a>
                  <p className="text-[11px] text-gray-400 text-center">Nhấn vào ảnh để xem full size</p>
                  <div className="pt-1 border-t border-gray-100">
                    <p className="text-[11px] text-gray-400 mb-2">Cần cập nhật ảnh mới?</p>
                    <div className="flex items-center justify-center bg-gray-50 rounded-xl p-3 border border-dashed border-gray-200">
                      <QRCode value={signUrl} size={80} />
                      <div className="ml-3">
                        <p className="text-xs font-semibold text-gray-600">Scan để chụp lại</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">Ảnh mới sẽ ghi đè ảnh cũ</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Sau khi in phiếu và thu đầy đủ chữ ký, dùng điện thoại scan QR bên dưới để chụp và lưu ảnh phiếu.
                  </p>
                  <div className="flex flex-col items-center gap-3 bg-gradient-to-b from-indigo-50 to-white rounded-xl p-5 border border-indigo-100">
                    <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100">
                      <QRCode value={signUrl} size={120} />
                    </div>
                    <div className="text-center">
                      <p className="text-xs font-semibold text-indigo-700">Scan bằng camera điện thoại</p>
                      <p className="text-[11px] text-gray-400 mt-1">Chụp ảnh phiếu → tự động lưu vào đơn này</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2 py-2 text-xs text-indigo-400">
                    <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                    Đang chờ ảnh từ điện thoại...
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    if (localStatus === 'REJECTED') return (
      <div className="p-4 bg-red-50 rounded-xl border border-red-100">
        <p className="text-sm font-bold text-red-700">Lệnh xuất bị từ chối</p>
        <p className="text-xs text-red-500 mt-1">Vui lòng tạo lại sau khi điều chỉnh.</p>
      </div>
    );

    return null;
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100 max-h-[92vh]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between flex-shrink-0">
            <div className="min-w-0 flex-1 mr-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-gray-900 font-mono">{item.documentCode}</h2>
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  isSO ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {isSO ? 'Sales Order' : 'Transfer'}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  role === 'MANAGER' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  role === 'QC' ? 'bg-teal-50 text-teal-700 border-teal-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>{role}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Tạo {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                {(item as any).createdByName ? ` · ${(item as any).createdByName}` : ''}
              </p>
              <FlowProgress current={localStatus} />
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400 flex-shrink-0">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto p-6 space-y-4 flex-1">
            <div className="bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 p-4 border-b border-gray-100">
                {isSO ? (
                  <>
                    <InfoRow label="Khách hàng" value={item.customerName ?? item.destination} />
                    <InfoRow label="Ngày giao" value={
                      item.deliveryDate || item.shipmentDate
                        ? new Date((item.deliveryDate ?? item.shipmentDate)!).toLocaleDateString('vi-VN')
                        : '—'
                    } />
                  </>
                ) : (
                  <InfoRow label="Kho đích" value={item.destinationWarehouseName ?? item.destination} />
                )}
                <InfoRow label="Số SKU" value={`${item.totalItems} SKU`} />
              </div>
              {orderDetail?.items?.length > 0 ? (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-100/80 text-gray-500 font-semibold uppercase tracking-wide text-[11px]">
                      <th className="px-4 py-2 text-left">SKU</th>
                      <th className="px-4 py-2 text-left">Tên sản phẩm</th>
                      <th className="px-4 py-2 text-center">
                        {localStatus === 'DISPATCHED' ? 'Đã lấy' : 'SL yêu cầu'}
                      </th>
                      <th className="px-4 py-2 text-center">
                        {localStatus === 'DISPATCHED'
                          ? 'SL cần kiểm tra'
                          : ['PICKING','QC_SCAN','ON_HOLD'].includes(localStatus)
                          ? 'SL cần kiểm tra'
                          : 'Tồn khả dụng'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {orderDetail.items.map((it: any) => (
                      <tr key={it.itemId} className="hover:bg-white/60 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-bold text-gray-800">{it.skuCode}</td>
                        <td className="px-4 py-2.5 text-gray-600">{it.skuName}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-900">{it.requestedQty}</td>
                        <td className="px-4 py-2.5 text-center">
                          {['PICKING','QC_SCAN','DISPATCHED','ON_HOLD'].includes(localStatus) ? (
                            <span className="font-semibold text-indigo-600">{it.requestedQty}</span>
                          ) : (
                            <>
                              <span className={`font-semibold ${it.insufficientStock ? 'text-red-600' : 'text-emerald-600'}`}>
                                {it.availableQty}
                              </span>
                              {it.insufficientStock && (
                                <span className="ml-1.5 text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full font-semibold">Thiếu</span>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="px-4 py-3 flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
                  Đang tải chi tiết hàng hoá...
                </div>
              )}
            </div>

            {renderContent()}
          </div>
        </div>
      </div>

      <ConfirmModal open={showSubmitConfirm} icon="send" iconColor="text-indigo-500"
        title={isSO ? 'Xác nhận gửi duyệt?' : 'Xác nhận submit Transfer?'}
        description={isSO
          ? 'Lệnh xuất sẽ được gửi lên Manager để phê duyệt. Sau khi submit, đơn sẽ bị khoá chỉnh sửa.'
          : 'Internal Transfer sẽ được tự động APPROVED và chuyển sang bước phân bổ tồn kho.'}
        confirmLabel="Gửi duyệt" confirmColor="bg-indigo-600 hover:bg-indigo-700"
        loading={actionLoading} onConfirm={handleSubmit} onCancel={() => setShowSubmitConfirm(false)} />

      <ConfirmModal open={showApproveConfirm} icon="verified" iconColor="text-emerald-500"
        title="Xác nhận duyệt lệnh xuất?"
        description={`Duyệt lệnh xuất ${item.documentCode}. Keeper sẽ tiến hành phân bổ tồn kho và lấy hàng.`}
        confirmLabel="Duyệt" confirmColor="bg-emerald-600 hover:bg-emerald-700"
        loading={actionLoading} onConfirm={handleApprove} onCancel={() => setShowApproveConfirm(false)} />

      {showReject && (
        <RejectModal code={item.documentCode} onConfirm={handleReject}
          onCancel={() => setShowReject(false)} loading={actionLoading} />
      )}

      {/* [V20] IncidentDetailModal từ banner ON_HOLD / WAITING_STOCK */}
      {showIncidentModal && selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          isManager={role === 'MANAGER'}
          onClose={() => setShowIncidentModal(false)}
          onResolved={() => {
            setShowIncidentModal(false);
            onRefresh();
            // Reload local status từ server
            fetchOutboundDetail(item.documentId, item.orderType)
              .then(d => { if (d?.status) setLocalStatus(d.status); })
              .catch(() => {});
          }}
        />
      )}
    </Portal>
  );
}

// ─── Helper ─────────────────────────────────────────────────────────────────────
function AutoLoadTaskId({ documentId, onLoaded }: { documentId: number; onLoaded: (taskId: number) => void }) {
  useEffect(() => {
    fetchPickListByDocument(documentId)
      .then(pl => { if (pl?.taskId) onLoaded(pl.taskId); })
      .catch(() => {});
  }, [documentId, onLoaded]);
  return null;
}