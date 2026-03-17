'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';
import {
  submitSalesOrder,
  submitTransfer,
  approveSalesOrder,
  rejectSalesOrder,
  allocateStock,
  reportShortage,
  generatePickList,
  fetchPickList,
  fetchPickListByDocument,
  confirmPickedTask,
  startQcSession,
  qcScanItem,
  fetchQcSummary,
  fetchDispatchNote,
  confirmDispatch,
  buildOrderFromListItem,
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
      <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
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
            <button onClick={onConfirm} disabled={loading}
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

// ─── Step 1: Allocate Panel ─────────────────────────────────────────────────────
function AllocatePanel({ item, onDone }: { item: OutboundListItem; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showShortageConfirm, setShowShortageConfirm] = useState(false);

  const handle = async () => {
    setShowConfirm(false);
    try {
      setLoading(true);
      const res = await allocateStock(item.documentId, item.orderType);
      setResult(res);
      if ((res as any).fullyAllocated) toast.success('Phân bổ thành công!');
      else toast('⚠️ Phân bổ một phần — một số SKU thiếu hàng', { icon: '⚠️' });
    } catch { } finally { setLoading(false); }
  };

  const handleReportShortage = async () => {
    setShowShortageConfirm(false);
    try {
      setReporting(true);
      await reportShortage(item.documentId, item.orderType);
      toast.success('✅ Đã gửi báo cáo thiếu hàng lên Manager!');
    } catch { } finally { setReporting(false); }
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

  return (
    <div className="space-y-3">
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
          ✅ Xác nhận — Tạo Pick List
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
            {reporting ? 'Đang gửi báo cáo...' : '📋 Báo thiếu hàng lên Manager'}
          </button>
          <ConfirmModal open={showShortageConfirm} icon="report" iconColor="text-red-500"
            title="Xác nhận báo thiếu hàng?" confirmLabel="Báo thiếu hàng" confirmColor="bg-red-600 hover:bg-red-700"
            description="Hệ thống sẽ tạo Incident báo cáo danh sách SKU thiếu. Manager sẽ nhận thông báo và xử lý."
            loading={reporting} onConfirm={handleReportShortage} onCancel={() => setShowShortageConfirm(false)} />
        </div>
      )}
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
    } catch { } finally { setLoading(false); }
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

// ─── Step 3: Picking Panel ──────────────────────────────────────────────────────
function PickingPanel({ item, taskId: initTaskId, onDone }: {
  item: OutboundListItem; taskId: number | null; onDone: (taskId: number) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [resolvedTaskId, setResolvedTaskId] = useState<number | null>(initTaskId);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        let pl: PickListResponse;
        if (initTaskId) { pl = await fetchPickList(initTaskId); }
        else { pl = await fetchPickListByDocument(item.documentId); }
        if (!cancelled) { setPickList(pl); setResolvedTaskId(pl.taskId); }
      } catch { if (!cancelled) setPickList(null); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [item.documentId, initTaskId]);

  const handleConfirm = async () => {
    if (!resolvedTaskId) return;
    try {
      setConfirming(true);
      await confirmPickedTask(resolvedTaskId);
      toast.success('✅ Đã xác nhận lấy hàng! Chuyển sang QC.');
      onDone(resolvedTaskId);
    } catch { } finally { setConfirming(false); setShowConfirm(false); }
  };

  if (loading) {
    return (
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 animate-pulse space-y-2">
        <div className="h-4 bg-blue-100 rounded w-1/2" />
        <div className="h-20 bg-blue-100 rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-blue-600 text-xl mt-0.5">forklift</span>
          <div>
            <p className="text-sm font-semibold text-blue-800">Bước 3 — Lấy hàng theo Pick List</p>
            <p className="text-xs text-blue-600 mt-1">
              Đi lấy hàng theo <span className="font-bold">đúng vị trí</span> và <span className="font-bold">đúng số lượng</span> trong danh sách dưới đây.
              Hàng đã được chuyển sang trạng thái <span className="font-bold">Z-OUT</span> (đang chờ xuất).
            </p>
            <p className="text-xs text-blue-500 mt-1">
              Sau khi lấy đủ toàn bộ, bấm <strong>"Xác nhận đã lấy hàng"</strong> để chuyển sang bước QC.
            </p>
          </div>
        </div>
      </div>
      {pickList ? <PickListTable pickList={pickList} /> : (
        <div className="p-3 bg-amber-50 rounded-xl border border-amber-100 text-xs text-amber-700">⚠️ Không tải được Pick List. Vui lòng thử lại.</div>
      )}
      {pickList && (
        <button onClick={() => setShowConfirm(true)} disabled={confirming || !resolvedTaskId}
          className="w-full py-3 text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 disabled:opacity-60">
          {confirming && <Spin />}
          {confirming ? 'Đang xác nhận...' : '✅ Xác nhận đã lấy đủ hàng → Chuyển QC'}
        </button>
      )}
      <ConfirmModal open={showConfirm} icon="forklift" iconColor="text-blue-500"
        title="Xác nhận đã lấy đủ hàng?" confirmLabel="Xác nhận → Chuyển QC" confirmColor="bg-blue-600 hover:bg-blue-700"
        description="Toàn bộ hàng trong Pick List đã được lấy đúng vị trí và đúng số lượng. Sau bước này đơn hàng sẽ chuyển sang QC kiểm tra hàng."
        loading={confirming} onConfirm={handleConfirm} onCancel={() => setShowConfirm(false)} />
    </div>
  );
}

// ─── Step 4: QC Scan Panel ──────────────────────────────────────────────────────
function QcScanPanel({ taskId, onAllScanned }: { taskId: number; onAllScanned: () => void }) {
  const [qcSummary, setQcSummary] = useState<QcSummaryResponse | null>(null);
  const [pickItems, setPickItems] = useState<PickListItem[]>([]);
  const [selected, setSelected] = useState<PickListItem | null>(null);
  const [result, setResult] = useState<QcResult>('PASS');
  const [reason, setReason] = useState('');
  const [startLoading, setStartLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const refreshAll = useCallback(async () => {
    try {
      const [s, pl] = await Promise.all([fetchQcSummary(taskId), fetchPickList(taskId)]);
      setQcSummary(s); setPickItems(pl.items ?? []);
      if (s.allScanned) onAllScanned();
    } catch {}
  }, [taskId, onAllScanned]);

  useEffect(() => {
    fetchQcSummary(taskId).then(setQcSummary).catch(() => {});
    fetchPickList(taskId).then(pl => setPickItems(pl.items ?? [])).catch(() => {});
  }, [taskId]);

  const handleStart = async () => {
    try { setStartLoading(true); await startQcSession(taskId); toast.success('Bắt đầu phiên QC!'); await refreshAll(); }
    catch { } finally { setStartLoading(false); }
  };

  const handleScan = async () => {
    if (!selected) return;
    if (result === 'FAIL' && !reason.trim()) { toast.error('Nhập lý do FAIL.'); return; }
    const itemId = (selected as any).pickingTaskItemId ?? selected.taskItemId;
    try {
      setScanning(true);
      await qcScanItem({ taskId, taskItemId: itemId, result, reason: result === 'FAIL' ? reason.trim() : undefined });
      toast.success(`QC ${result} — ${selected.skuCode}`);
      setSelected(null); setReason(''); setResult('PASS');
      await refreshAll();
    } catch { } finally { setScanning(false); }
  };

  const pending = pickItems.filter(i => !i.qcResult);
  const scanned = pickItems.filter(i => !!i.qcResult);

  return (
    <div className="space-y-3">
      <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
        <div className="flex items-start gap-3 mb-3">
          <span className="material-symbols-outlined text-purple-600 text-xl mt-0.5">qr_code_scanner</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-800">Bước 4 — QC Kiểm tra hàng</p>
            <p className="text-xs text-purple-600 mt-0.5">Scan từng mặt hàng, đánh giá <strong>PASS / FAIL / HOLD</strong>. Cần <strong>100% PASS</strong> để tiến hành xuất kho.</p>
          </div>
          <span className="text-xs font-mono text-purple-500 bg-purple-100 px-2 py-0.5 rounded">#{taskId}</span>
        </div>
        {!qcSummary && (
          <button onClick={handleStart} disabled={startLoading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {startLoading && <Spin />}
            {startLoading ? 'Đang khởi động...' : '▶ Bắt đầu phiên QC'}
          </button>
        )}
      </div>

      {qcSummary && (
        <div className="grid grid-cols-4 gap-2">
          {[['PASS', qcSummary.passCount, 'text-emerald-600 bg-emerald-50 border-emerald-100'],
            ['FAIL', qcSummary.failCount, 'text-red-600 bg-red-50 border-red-100'],
            ['HOLD', qcSummary.holdCount, 'text-amber-600 bg-amber-50 border-amber-100'],
            ['Chờ',  qcSummary.pendingCount, 'text-gray-600 bg-gray-50 border-gray-100'],
          ].map(([lbl, val, cls]) => (
            <div key={lbl as string} className={`rounded-xl p-3 text-center border ${cls}`}>
              <p className="text-lg font-bold">{val as number}</p>
              <p className="text-[10px] font-semibold">{lbl as string}</p>
            </div>
          ))}
        </div>
      )}

      {qcSummary && !qcSummary.allScanned && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          {pending.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-b">
                <span className="text-xs font-semibold text-gray-600">Chọn mặt hàng để scan QC ({pending.length} chờ)</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
                {pending.map((pi, idx) => {
                  const isSel = selected?.taskItemId === pi.taskItemId;
                  return (
                    <button key={pi.taskItemId ?? idx} type="button"
                      onClick={() => { setSelected(isSel ? null : pi); setResult('PASS'); setReason(''); }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 border-l-4 transition-colors ${isSel ? 'bg-purple-50 border-purple-500' : 'hover:bg-gray-50 border-transparent'}`}>
                      <div>
                        <p className="text-xs font-bold text-gray-800">{pi.skuCode}</p>
                        <p className="text-[10px] text-gray-400">{pi.locationCode}{pi.lotNumber ? ` · LOT ${pi.lotNumber}` : ''}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-600 flex-shrink-0">×{pi.qtyToPick ?? pi.requiredQty}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {selected && (
            <div className="p-4 bg-purple-50/60 border-t border-purple-100 space-y-3">
              <p className="text-xs font-semibold text-purple-700">
                Đang QC: <span className="font-bold">{selected.skuCode}</span>
                <span className="text-purple-500 ml-1">({selected.locationCode})</span>
              </p>
              <div className="flex gap-2">
                {(['PASS', 'FAIL', 'HOLD'] as QcResult[]).map(r => (
                  <button key={r} type="button" onClick={() => setResult(r)}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                      result === r
                        ? r === 'PASS' ? 'bg-emerald-500 text-white border-emerald-500'
                          : r === 'FAIL' ? 'bg-red-500 text-white border-red-500'
                          : 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                    }`}>{r}</button>
                ))}
              </div>
              {result === 'FAIL' && (
                <input placeholder="Lý do FAIL *" value={reason} onChange={e => setReason(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-red-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-400" />
              )}
              <button onClick={handleScan} disabled={scanning}
                className="w-full py-2.5 text-sm font-semibold text-white bg-purple-600 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-60">
                {scanning && <Spin />}
                {scanning ? 'Ghi nhận...' : `Xác nhận QC ${result}`}
              </button>
            </div>
          )}

          {scanned.length > 0 && (
            <>
              <div className="px-4 py-2 bg-gray-50 border-t">
                <span className="text-xs font-semibold text-gray-500">Đã scan ({scanned.length})</span>
              </div>
              <div className="divide-y divide-gray-50 max-h-32 overflow-y-auto">
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

      {qcSummary?.allScanned && (
        <p className="text-xs text-center text-emerald-600 font-semibold bg-emerald-50 py-2.5 rounded-xl border border-emerald-100">
          ✅ Đã scan xong toàn bộ — sẵn sàng Dispatch
        </p>
      )}
    </div>
  );
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
    } catch { } finally { setDispatching(false); }
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
          {loading ? 'Đang tải...' : '📋 Xem Dispatch Note'}
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
  PICKING: 4, QC_SCAN: 5, DISPATCHED: 6, REJECTED: 7, CANCELLED: 8,
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
  const idx = STEPS.findIndex(s => s.status === current);
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
  const [showReject, setShowReject] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [taskId, setTaskId] = useState<number | null>(null);
  const role = getUserRole();

  // Dùng ref để track documentId trước — phân biệt "đổi đơn" vs "cùng đơn BE cập nhật"
  const prevDocumentIdRef = React.useRef<number | null>(null);

  useEffect(() => {
    if (!item) return;
    const isNewDocument = prevDocumentIdRef.current !== item.documentId;
    prevDocumentIdRef.current = item.documentId;

    setLocalStatus(prev => {
      // Mở đơn KHÁC → luôn sync hoàn toàn về BE status (tránh stale localStatus)
      if (isNewDocument) return item.status;
      // Cùng đơn → chỉ sync nếu BE tiến hơn hoặc terminal state
      const incomingOrder = STATUS_ORDER[item.status] ?? 0;
      const currentOrder  = STATUS_ORDER[prev] ?? 0;
      if (incomingOrder > currentOrder || item.status === 'REJECTED' || item.status === 'CANCELLED') {
        return item.status;
      }
      return prev;
    });
    if (isNewDocument) setTaskId(null);
  }, [item?.documentId, item?.status]);

  if (!item) return null;

  const isSO = item.orderType === 'SALES_ORDER';
  const badge = OUTBOUND_STATUS_BADGE[localStatus as keyof typeof OUTBOUND_STATUS_BADGE]
    ?? { label: localStatus, className: 'bg-gray-100 text-gray-500' };

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

  // ─── Role-based step rendering ────────────────────────────────────────────────
  const renderContent = () => {
    // DRAFT
    if (localStatus === 'DRAFT') {
      if (role === 'KEEPER') return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">{isSO ? 'Submit để gửi Manager duyệt.' : 'Submit → tự động APPROVED (không cần Manager).'}</p>
          <button onClick={() => setShowSubmitConfirm(true)} disabled={actionLoading}
            className="w-full py-2.5 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-60">
            {actionLoading && <Spin />}
            {actionLoading ? 'Đang submit...' : 'Submit lệnh xuất'}
          </button>
        </div>
      );
      if (role === 'MANAGER') return (
        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Đơn đang ở trạng thái Nháp. Chờ Keeper submit.</p>
        </div>
      );
      return null;
    }

    // PENDING_APPROVAL
    if (localStatus === 'PENDING_APPROVAL') {
      if (role === 'MANAGER') return (
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100 space-y-3">
          <p className="text-sm text-orange-800 font-medium">Lệnh xuất đang chờ Manager duyệt.</p>
          <div className="flex gap-3">
            <button onClick={() => setShowApproveConfirm(true)} disabled={actionLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-60">
              {actionLoading && <Spin />}
              {actionLoading ? 'Đang xử lý...' : '✅ Duyệt'}
            </button>
            <button onClick={() => setShowReject(true)} disabled={actionLoading}
              className="flex-1 py-2.5 text-sm font-semibold text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 disabled:opacity-60">
              ❌ Từ chối
            </button>
          </div>
        </div>
      );
      if (role === 'KEEPER') return (
        <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-orange-500 text-xl">hourglass_top</span>
            <p className="text-sm text-orange-800 font-medium">Đang chờ Manager duyệt...</p>
          </div>
        </div>
      );
      return null;
    }

    // APPROVED → Keeper phân bổ
    if (localStatus === 'APPROVED') {
      if (role === 'KEEPER') return <AllocatePanel item={item} onDone={() => { setLocalStatus('ALLOCATED'); onRefresh(); }} />;
      if (role === 'MANAGER') return (
        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
          <p className="text-sm text-emerald-800 font-medium">✅ Đã duyệt. Chờ Keeper phân bổ tồn kho.</p>
        </div>
      );
      return null;
    }

    // ALLOCATED → Keeper tạo Pick List
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

    // PICKING → Keeper lấy hàng
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

    // QC_SCAN
    if (localStatus === 'QC_SCAN') {
      if (role === 'QC' || role === 'KEEPER') {
        if (taskId) return (
          <div className="space-y-3">
            <QcScanPanel taskId={taskId} onAllScanned={() => onRefresh()} />
            {role === 'KEEPER' && isSO && (
              <DispatchPanel item={item} onDone={() => { setLocalStatus('DISPATCHED'); onRefresh(); }} />
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

    // DISPATCHED
    if (localStatus === 'DISPATCHED') return (
      <div className="p-4 bg-teal-50 rounded-xl border border-teal-100 flex items-center gap-3">
        <span className="material-symbols-outlined text-teal-600 text-2xl">check_circle</span>
        <div>
          <p className="text-sm font-bold text-teal-800">Đã xuất kho thành công</p>
          <p className="text-xs text-teal-600">Tồn kho đã được trừ khỏi Z-OUT. Lệnh xuất hoàn tất.</p>
        </div>
      </div>
    );

    // REJECTED
    if (localStatus === 'REJECTED') return (
      <div className="p-4 bg-red-50 rounded-xl border border-red-100 flex items-center gap-3">
        <span className="material-symbols-outlined text-red-500 text-2xl">cancel</span>
        <div>
          <p className="text-sm font-bold text-red-700">Lệnh xuất bị từ chối</p>
          <p className="text-xs text-red-500">Vui lòng tạo lại sau khi điều chỉnh.</p>
        </div>
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
                {/* Role badge */}
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
            {/* Order info */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-xl">
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

            {renderContent()}
          </div>
        </div>
      </div>

      {/* Top-level confirm modals */}
      <ConfirmModal open={showSubmitConfirm} icon="send" iconColor="text-indigo-500"
        title={isSO ? 'Xác nhận gửi duyệt?' : 'Xác nhận submit Transfer?'}
        description={isSO
          ? 'Lệnh xuất sẽ được gửi lên Manager để phê duyệt. Sau khi submit, đơn sẽ bị khoá chỉnh sửa.'
          : 'Internal Transfer sẽ được tự động APPROVED và chuyển sang bước phân bổ tồn kho.'}
        confirmLabel="Xác nhận Submit" confirmColor="bg-indigo-600 hover:bg-indigo-700"
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
