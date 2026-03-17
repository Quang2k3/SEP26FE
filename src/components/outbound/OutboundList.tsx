'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminPage } from '@/components/layout/AdminPage';
import { DataTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Portal from '@/components/ui/Portal';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';
import {
  fetchOutboundOrders,
  fetchOutboundSummary,
  fetchPickListByDocument,
  startQcSession,
  fetchQcSummary,
} from '@/services/outboundService';
import {
  createReceivingSession,
  generateScanToken,
  deleteSession,
} from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import type {
  OutboundListItem,
  OutboundSummary,
  OutboundStatus,
  OutboundType,
  PickListResponse,
  QcSummaryResponse,
} from '@/interfaces/outbound';
import { getOutboundColumns } from './components/columns';
import OutboundFilter from './components/OutboundFilter';
import CreateOutboundModal from './components/CreateOutboundModal';
import OutboundDetailModal from './components/OutboundDetailModal';

// ─── Role helper ──────────────────────────────────────────────────────────────
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

// ─── Spin helper ──────────────────────────────────────────────────────────────
function Spin({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-4 h-4 border-2' : 'w-5 h-5 border-2';
  return <span className={`${sz} border-current/30 border-t-current rounded-full animate-spin inline-block`} />;
}

function QcBadge({ result }: { result: string }) {
  const cfg: Record<string, string> = {
    PASS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    FAIL: 'bg-red-100 text-red-700 border-red-200',
    HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
  };
  return (
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${cfg[result] ?? 'bg-gray-100 text-gray-500 border-gray-200'}`}>
      {result}
    </span>
  );
}

// ─── QC Scan Modal (slide-over) ───────────────────────────────────────────────
interface QcScanModalProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

function QcScanModal({ open, onClose, onRefresh }: QcScanModalProps) {
  const [orders, setOrders]               = useState<OutboundListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OutboundListItem | null>(null);
  const [pickList, setPickList]           = useState<PickListResponse | null>(null);
  const [loadingPick, setLoadingPick]     = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // QR state
  const [qrValue, setQrValue]       = useState<string | null>(null);
  const [qrLoading, setQrLoading]   = useState(false);
  const [qrError, setQrError]       = useState<string | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [qcSummary, setQcSummary]   = useState<QcSummaryResponse | null>(null);
  const [scannedItems, setScannedItems] = useState<Array<{ skuCode: string; result: string; skuName?: string }>>([]);

  const sessionIdRef = useRef<string | null>(null);
  const mountedRef   = useRef(true);
  const pollRef      = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
  }, []);

  // Cleanup on unmount or close
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAll();
      const sid = sessionIdRef.current;
      if (sid) deleteSession(sid).catch(() => {});
    };
  }, [stopAll]);

  // Load orders when modal opens
  useEffect(() => {
    if (!open) return;
    setLoadingOrders(true);
    fetchOutboundOrders({ status: 'QC_SCAN', size: 50 })
      .then(res => { if (mountedRef.current) setOrders((res as any)?.content ?? []); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoadingOrders(false); });
  }, [open]);

  const refreshSummary = useCallback(async (taskId: number) => {
    try {
      const s = await fetchQcSummary(taskId);
      if (!mountedRef.current) return;
      setQcSummary(s);
      if (s.allScanned) { setIsFinalized(true); stopAll(); }
    } catch {}
  }, [stopAll]);

  const startPolling = useCallback((taskId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => refreshSummary(taskId), 4000);
  }, [refreshSummary]);

  const handleSelectOrder = async (order: OutboundListItem) => {
    stopAll();
    setSelectedOrder(order);
    setPickList(null); setQcSummary(null); setSessionStarted(false);
    setQrValue(null); setQrError(null); setQrGenerated(false);
    sessionIdRef.current = null;
    setScannedItems([]); setIsFinalized(false);
    setLoadingPick(true);
    try {
      const pl = await fetchPickListByDocument(order.documentId);
      if (!mountedRef.current) return;
      setPickList(pl);
      if (pl.status === 'QC_IN_PROGRESS') {
        setSessionStarted(true); setQrGenerated(true);
        const s = await fetchQcSummary(pl.taskId);
        if (!mountedRef.current) return;
        setQcSummary(s);
        if (!s.allScanned) startPolling(pl.taskId);
        else setIsFinalized(true);
      }
    } catch { toast.error('Không tải được Pick List.'); }
    finally { if (mountedRef.current) setLoadingPick(false); }
  };

  const generateQR = useCallback(async () => {
    if (!pickList || qrGenerated) return;
    setQrLoading(true); setQrError(null);
    try {
      if (!sessionStarted) {
        await startQcSession(pickList.taskId);
        if (!mountedRef.current) return;
        setSessionStarted(true);
      }
      const session = await createReceivingSession();
      if (!mountedRef.current) return;
      sessionIdRef.current = session.sessionId;
      const tokenData = await generateScanToken(session.sessionId);
      if (!mountedRef.current) return;
      const rawUrl = await getScanUrl(tokenData.scanToken, null);
      if (!mountedRef.current) return;
      const url = rawUrl + `&taskId=${pickList.taskId}&mode=outbound_qc`;
      setQrValue(url); setQrGenerated(true);
      startPolling(pickList.taskId);
      const s = await fetchQcSummary(pickList.taskId);
      if (mountedRef.current) setQcSummary(s);
      toast.success('QR sẵn sàng!', { duration: 3000 });
    } catch (err: any) {
      if (mountedRef.current) { setQrError(err?.message ?? 'Không tạo được QR'); setQrGenerated(false); }
    } finally { if (mountedRef.current) setQrLoading(false); }
  }, [pickList, qrGenerated, sessionStarted, startPolling]);

  const handleCompleteQC = () => {
    toast.success(`✅ QC hoàn tất ${selectedOrder?.documentCode}. Keeper có thể xuất kho.`);
    setSelectedOrder(null); stopAll(); onRefresh();
    // Reload QC orders list
    setLoadingOrders(true);
    fetchOutboundOrders({ status: 'QC_SCAN', size: 50 })
      .then(res => { if (mountedRef.current) setOrders((res as any)?.content ?? []); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoadingOrders(false); });
  };

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

        {/* Slide-over panel */}
        <div className="relative ml-auto w-full max-w-3xl h-full bg-white shadow-2xl flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center">
              <span className="material-symbols-outlined text-purple-600 text-[20px]">qr_code_scanner</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900">QC Scanner — Xuất kho</p>
              <p className="text-xs text-gray-400">Tạo QR → điện thoại quét barcode từng mặt hàng</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 min-h-0 overflow-hidden">

            {/* ── Left: order list ── */}
            <div className="w-56 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
              <div className="px-3 py-2.5 bg-gray-50 border-b flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600">Đơn chờ QC</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">{orders.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingOrders ? (
                  <div className="p-6 flex justify-center"><Spin /></div>
                ) : orders.length === 0 ? (
                  <div className="p-6 text-center">
                    <span className="material-symbols-outlined text-gray-200 text-3xl block mb-1">done_all</span>
                    <p className="text-xs text-gray-400">Không có đơn QC</p>
                  </div>
                ) : (
                  orders.map(order => (
                    <button key={order.documentId} onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left px-3 py-3 border-l-4 transition-colors ${
                        selectedOrder?.documentId === order.documentId
                          ? 'bg-purple-50 border-purple-500'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}>
                      <p className="text-xs font-bold text-gray-800 font-mono truncate">{order.documentCode}</p>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">{order.destination ?? order.customerName ?? '—'}</p>
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded mt-1 inline-block">
                        {order.totalItems} SKU
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* ── Right: QR + progress ── */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!selectedOrder ? (
                <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-50">
                  <span className="material-symbols-outlined text-gray-300 text-5xl">qr_code_scanner</span>
                  <p className="text-sm text-gray-400">Chọn đơn từ danh sách bên trái</p>
                </div>
              ) : (
                <>
                  {/* Order info bar */}
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-mono">{selectedOrder.documentCode}</p>
                      <p className="text-xs text-gray-500">{selectedOrder.destination ?? selectedOrder.customerName}</p>
                    </div>
                    <span className="text-[11px] font-bold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                      {selectedOrder.totalItems} SKU
                    </span>
                  </div>

                  {loadingPick && (
                    <div className="p-8 flex items-center justify-center gap-2">
                      <Spin /><span className="text-sm text-gray-400">Đang tải Pick List...</span>
                    </div>
                  )}

                  {!loadingPick && pickList && (
                    <div className="grid grid-cols-2 gap-3">

                      {/* QR Panel */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col items-center gap-3">
                        <div className="w-full flex items-center gap-2">
                          <span className="material-symbols-outlined text-purple-500 text-lg">qr_code</span>
                          <p className="text-xs font-bold text-gray-800">Mã QR Scanner</p>
                          {qrValue && !isFinalized && (
                            <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600">
                              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />LIVE
                            </span>
                          )}
                        </div>

                        {isFinalized ? (
                          <div className="w-full space-y-2">
                            <div className="relative p-3 bg-gray-100 border-2 border-gray-200 rounded-xl">
                              {qrValue && <div className="opacity-20"><QRCode value={qrValue} size={140} level="H" /></div>}
                              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                                  <span className="material-symbols-outlined text-emerald-600 text-[22px]">verified</span>
                                </div>
                                <p className="text-xs font-bold text-emerald-700">QC Hoàn tất</p>
                              </div>
                            </div>
                            <button onClick={handleCompleteQC}
                              className="w-full py-2.5 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px]">send</span>
                              Hoàn tất QC → Gửi Keeper
                            </button>
                          </div>
                        ) : qrLoading ? (
                          <div className="w-[140px] h-[140px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                            <Spin />
                          </div>
                        ) : qrError ? (
                          <div className="w-full p-3 bg-red-50 rounded-xl border border-red-200 text-center">
                            <p className="text-xs text-red-600 mb-1">{qrError}</p>
                            <button onClick={generateQR} className="text-xs font-semibold text-red-700 underline">Thử lại</button>
                          </div>
                        ) : qrValue ? (
                          <div className="flex flex-col items-center gap-2">
                            <div className="p-2.5 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                              <QRCode value={qrValue} size={140} level="H" />
                            </div>
                            <p className="text-[10px] text-gray-400 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px] text-amber-500">lock</span>
                              QR đã tạo — dùng điện thoại quét
                            </p>
                          </div>
                        ) : qrGenerated && !qrValue ? (
                          <div className="w-full p-3 bg-purple-50 rounded-xl border border-purple-100 text-center">
                            <p className="text-xs text-purple-700 font-medium">Phiên QC đang chạy</p>
                            <p className="text-[10px] text-purple-500 mt-0.5">Dùng điện thoại đang mở để tiếp tục.</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-full p-3 bg-purple-50 rounded-xl border border-purple-100 space-y-1">
                              {['1. Bấm "Tạo QR Code"', '2. Dùng điện thoại quét mã QR', '3. Quét từng mặt hàng → PASS/FAIL', '4. Kết quả cập nhật realtime'].map((s, i) => (
                                <p key={i} className="text-[11px] text-purple-600">{s}</p>
                              ))}
                            </div>
                            <button onClick={generateQR} disabled={qrLoading}
                              className="w-full py-2.5 text-xs font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-1.5 disabled:opacity-60">
                              <span className="material-symbols-outlined text-[15px]">qr_code</span>
                              Tạo QR Code để scan
                            </button>
                          </>
                        )}
                      </div>

                      {/* Progress Panel */}
                      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm space-y-3">
                        <p className="text-xs font-bold text-gray-800">Tiến độ QC</p>
                        {qcSummary ? (
                          <>
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { label: 'PASS', val: qcSummary.passCount,    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                                { label: 'FAIL', val: qcSummary.failCount,    cls: 'bg-red-50 border-red-200 text-red-700' },
                                { label: 'HOLD', val: qcSummary.holdCount,    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                                { label: 'Chờ',  val: qcSummary.pendingCount, cls: 'bg-gray-50 border-gray-200 text-gray-600' },
                              ].map(s => (
                                <div key={s.label} className={`rounded-xl p-2 text-center border ${s.cls}`}>
                                  <p className="text-lg font-bold">{s.val}</p>
                                  <p className="text-[10px] font-semibold">{s.label}</p>
                                </div>
                              ))}
                            </div>
                            <div>
                              <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>Đã scan</span>
                                <span>{qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount} / {qcSummary.totalItems}</span>
                              </div>
                              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                  style={{ width: `${qcSummary.totalItems > 0 ? ((qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount) / qcSummary.totalItems) * 100 : 0}%` }} />
                              </div>
                            </div>
                            {qcSummary.allScanned && (
                              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                                <span className="material-symbols-outlined text-emerald-600 text-[18px]">verified</span>
                                <p className="text-xs font-bold text-emerald-800">QC hoàn tất! Bấm Gửi Keeper.</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="space-y-1.5">
                            <p className="text-xs text-gray-400">Chưa bắt đầu phiên QC.</p>
                            <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-40 overflow-y-auto">
                              {(pickList.items ?? []).map((item, idx) => (
                                <div key={idx} className="px-3 py-2 flex items-center justify-between">
                                  <div>
                                    <p className="text-xs font-bold text-gray-700">{item.skuCode}</p>
                                    <p className="text-[10px] text-gray-400">{item.locationCode}</p>
                                  </div>
                                  <span className="text-xs font-semibold text-gray-500">×{item.qtyToPick ?? item.requiredQty}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Live scan log */}
                  {scannedItems.length > 0 && (
                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                      <div className="px-4 py-2 bg-gray-50 border-b flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="text-xs font-bold text-gray-700">Scan log realtime</span>
                        <span className="ml-auto text-[10px] text-gray-400">{scannedItems.length} items</span>
                      </div>
                      <div className="divide-y divide-gray-50 max-h-32 overflow-y-auto">
                        {scannedItems.map((item, idx) => (
                          <div key={idx} className="px-4 py-2 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-gray-800">{item.skuCode}</p>
                              {item.skuName && <p className="text-[10px] text-gray-400">{item.skuName}</p>}
                            </div>
                            <QcBadge result={item.result} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function OutboundList() {
  const role = getUserRole();
  const searchParams = useSearchParams();
  const urlStatus = searchParams.get('status') as OutboundStatus | null;

  const [orders, setOrders]               = useState<OutboundListItem[]>([]);
  const [summary, setSummary]             = useState<OutboundSummary | null>(null);
  const [loading, setLoading]             = useState(false);
  const [loadError, setLoadError]         = useState<string | null>(null);
  const [totalPages, setTotalPages]       = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage]                   = useState(0);
  const PAGE_SIZE = 20;

  const [filter, setFilter] = useState<{
    keyword: string;
    status: OutboundStatus | 'ALL';
    orderType: OutboundType | 'ALL';
  }>({ keyword: '', status: urlStatus ?? 'ALL', orderType: 'ALL' });

  const [showCreate, setShowCreate]   = useState(false);
  const [selectedItem, setSelectedItem] = useState<OutboundListItem | null>(null);
  const [showQcModal, setShowQcModal] = useState(false);

  const load = useCallback(async (p = 0) => {
    setLoading(true); setLoadError(null);
    try {
      const listRes = await fetchOutboundOrders({
        keyword: filter.keyword || undefined,
        status: filter.status !== 'ALL' ? filter.status : undefined,
        orderType: filter.orderType !== 'ALL' ? filter.orderType : undefined,
        page: p, size: PAGE_SIZE,
      });
      const rawContent = (listRes as any)?.content ?? (listRes as any)?.data?.content ?? [];
      setOrders(rawContent);
      setTotalPages((listRes as any)?.totalPages ?? 0);
      setTotalElements((listRes as any)?.totalElements ?? rawContent.length);
      setPage(p);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Không thể tải danh sách lệnh xuất kho.';
      setLoadError(msg); toast.error(msg);
    } finally { setLoading(false); }
    fetchOutboundSummary().then(setSummary).catch(() => {});
  }, [filter]);

  useEffect(() => { load(0); }, [load]);

  const qcCount = summary?.qcScan ?? 0;
  const columns = getOutboundColumns((row) => setSelectedItem(row));

  return (
    <AdminPage
      title="Lệnh xuất kho"
      description="Quản lý toàn bộ quy trình xuất kho: từ tạo lệnh đến dispatch."
      actions={
        <div className="flex items-center gap-2">
          {/* QC Scan button — chỉ hiện với role QC */}
          {role === 'QC' && (
            <button
              onClick={() => setShowQcModal(true)}
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                qcCount > 0
                  ? 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm'
                  : 'bg-purple-50 text-purple-600 border border-purple-200 hover:bg-purple-100'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
              QC Scan
              {qcCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {qcCount > 9 ? '9+' : qcCount}
                </span>
              )}
            </button>
          )}

          {role === 'KEEPER' && (
            <Button size="sm" onClick={() => setShowCreate(true)}
              leftIcon={<span className="material-symbols-outlined text-sm">add</span>}>
              Tạo lệnh xuất
            </Button>
          )}
        </div>
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
        onRowClick={(row) => setSelectedItem(row)}
      />

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
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onRefresh={() => load(page)}
      />

      <QcScanModal
        open={showQcModal}
        onClose={() => setShowQcModal(false)}
        onRefresh={() => load(page)}
      />
    </AdminPage>
  );
}
