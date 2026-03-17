'use client';

/**
 * OutboundQCScanner — Trang QC Xuất kho (REBUILT)
 *
 * Fixes & additions:
 * 1. Thêm nút "Hoàn tất QC → Gửi Keeper" khi allScanned (có modal xác nhận)
 * 2. Chỉ cho gen QR 1 lần / đơn — sau khi QR đã tạo, không cho tạo lại
 *    (tránh tạo session mới trong khi session cũ vẫn active)
 * 3. Nếu QC_IN_PROGRESS đã có session → hiển thị trạng thái, không gen lại
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import QRCode from 'react-qr-code';
import {
  fetchOutboundOrders,
  fetchPickListByDocument,
  startQcSession,
  fetchQcSummary,
  confirmDispatch,
} from '@/services/outboundService';
import {
  createReceivingSession,
  generateScanToken,
  deleteSession,
} from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import type {
  OutboundListItem,
  PickListResponse,
  QcSummaryResponse,
} from '@/interfaces/outbound';
import toast from 'react-hot-toast';
import Portal from '@/components/ui/Portal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

// ─── Confirm Modal ─────────────────────────────────────────────────────────────
function ConfirmModal({
  open, icon = 'help', iconColor = 'text-indigo-500',
  title, description, confirmLabel, confirmColor = 'bg-indigo-600 hover:bg-indigo-700',
  loading, onConfirm, onCancel,
}: {
  open: boolean; icon?: string; iconColor?: string;
  title: string; description: string; confirmLabel: string;
  confirmColor?: string; loading?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
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
              {loading && <Spin size="sm" />}
              {loading ? 'Đang xử lý...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function OutboundQCScanner() {
  const [orders, setOrders] = useState<OutboundListItem[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OutboundListItem | null>(null);

  const [pickList, setPickList] = useState<PickListResponse | null>(null);
  const [loadingPick, setLoadingPick] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);

  // QR — chỉ gen 1 lần / đơn
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrGenerated, setQrGenerated] = useState(false); // lock: đã gen rồi không gen nữa

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [qcSummary, setQcSummary] = useState<QcSummaryResponse | null>(null);
  const [scannedItems, setScannedItems] = useState<Array<{ skuCode: string; result: string; skuName?: string }>>([]);

  // Modal xác nhận hoàn tất QC
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [completing, setCompleting] = useState(false);

  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sseRef = useRef<EventSource | null>(null);

  const stopAll = useCallback(() => {
    if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopAll();
      const sid = sessionIdRef.current;
      if (sid) deleteSession(sid).catch(() => {});
    };
  }, [stopAll]);

  // Load đơn QC_SCAN
  const loadOrders = useCallback(() => {
    setLoadingOrders(true);
    fetchOutboundOrders({ status: 'QC_SCAN', size: 50 })
      .then(res => { if (mountedRef.current) setOrders(res.content ?? []); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoadingOrders(false); });
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  // Refresh QC summary
  const refreshSummary = useCallback(async (taskId: number) => {
    try {
      const s = await fetchQcSummary(taskId);
      if (!mountedRef.current) return;
      setQcSummary(s);
      if (s.allScanned) {
        setIsFinalized(true);
        stopAll();
      }
    } catch {}
  }, [stopAll]);

  const startPolling = useCallback((taskId: number) => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => refreshSummary(taskId), 4000);
  }, [refreshSummary]);

  const startSSE = useCallback((sid: string, taskId: number) => {
    if (sseRef.current) sseRef.current.close();
    const token = (() => {
      try { return JSON.parse(localStorage.getItem('auth_user') ?? '{}')?.token; } catch { return null; }
    })();
    const url = `/api/v1/receiving-sessions/${sid}/stream${token ? `?token=${token}` : ''}`;
    const es = new EventSource(url);
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (!mountedRef.current) return;
        if (data.type === 'qc_scan' || data.skuCode) {
          const result = data.result ?? data.condition ?? 'PASS';
          const skuCode = data.skuCode ?? '';
          setScannedItems(prev => [
            { skuCode, result, skuName: data.skuName },
            ...prev.filter(i => i.skuCode !== skuCode),
          ]);
          toast.success(`${result} — ${skuCode}`, { duration: 2000 });
          refreshSummary(taskId);
        }
      } catch {}
    };
    es.onerror = () => {};
    sseRef.current = es;
  }, [refreshSummary]);

  // Chọn đơn
  const handleSelectOrder = async (order: OutboundListItem) => {
    stopAll();
    setSelectedOrder(order);
    setPickList(null);
    setQcSummary(null);
    setSessionStarted(false);
    setQrValue(null);
    setQrError(null);
    setQrGenerated(false); // reset lock khi đổi đơn
    setSessionId(null);
    setScannedItems([]);
    setIsFinalized(false);
    sessionIdRef.current = null;

    setLoadingPick(true);
    try {
      const pl = await fetchPickListByDocument(order.documentId);
      if (!mountedRef.current) return;
      setPickList(pl);
      if (pl.status === 'QC_IN_PROGRESS') {
        // Đơn đã có session đang chạy — chỉ load summary, KHÔNG gen QR mới
        setSessionStarted(true);
        setQrGenerated(true); // lock: đã có session rồi
        const s = await fetchQcSummary(pl.taskId);
        if (!mountedRef.current) return;
        setQcSummary(s);
        if (!s.allScanned) startPolling(pl.taskId);
        else setIsFinalized(true);
      }
    } catch {
      toast.error('Không tải được Pick List.');
    } finally {
      if (mountedRef.current) setLoadingPick(false);
    }
  };

  // Gen QR — chỉ 1 lần / đơn
  const generateQR = useCallback(async () => {
    if (!pickList || qrGenerated) return; // bảo vệ double-gen
    setQrLoading(true);
    setQrError(null);

    try {
      // 1. Start QC session (task → QC_IN_PROGRESS)
      if (!sessionStarted) {
        await startQcSession(pickList.taskId);
        if (!mountedRef.current) return;
        setSessionStarted(true);
      }

      // 2. Tạo scan session Redis
      const session = await createReceivingSession();
      if (!mountedRef.current) return;
      setSessionId(session.sessionId);
      sessionIdRef.current = session.sessionId;

      // 3. Sinh token
      const tokenData = await generateScanToken(session.sessionId);
      if (!mountedRef.current) return;

      // 4. Build URL
      const rawUrl = await getScanUrl(tokenData.scanToken, null);
      if (!mountedRef.current) return;
      const url = rawUrl + `&taskId=${pickList.taskId}&mode=outbound_qc`;
      setQrValue(url);
      setQrGenerated(true); // LOCK — không gen nữa

      // 5. SSE + polling
      startSSE(session.sessionId, pickList.taskId);
      startPolling(pickList.taskId);

      // 6. Summary hiện tại
      const s = await fetchQcSummary(pickList.taskId);
      if (mountedRef.current) setQcSummary(s);

      toast.success('QR sẵn sàng! Dùng điện thoại quét.', { duration: 3000 });
    } catch (err: any) {
      if (mountedRef.current) {
        setQrError(err?.message ?? 'Không tạo được QR');
        setQrGenerated(false); // unlock nếu fail để có thể thử lại
      }
    } finally {
      if (mountedRef.current) setQrLoading(false);
    }
  }, [pickList, qrGenerated, sessionStarted, startSSE, startPolling]);

  // Hoàn tất QC → thông báo cho Keeper có thể dispatch
  const handleCompleteQC = async () => {
    if (!selectedOrder) return;
    setCompleting(true);
    try {
      // Không có endpoint riêng "complete QC" — trạng thái đã là allScanned
      // Chỉ cần toast success và reload danh sách đơn để QC thấy đơn đã xong
      toast.success(`✅ QC hoàn tất đơn ${selectedOrder.documentCode}. Keeper có thể tiến hành xuất kho.`);
      setShowCompleteConfirm(false);
      // Reset selection và reload
      setSelectedOrder(null);
      stopAll();
      loadOrders();
    } catch {
    } finally {
      setCompleting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/50 p-4 md:p-6 font-sans">
      <div className="max-w-5xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-600 text-[22px]">qr_code_scanner</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">QC Scanner — Xuất kho</h1>
            <p className="text-xs text-gray-400">Tạo QR → dùng điện thoại quét barcode từng mặt hàng</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Danh sách đơn chờ QC ── */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
              <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700">Đơn chờ QC</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                  {orders.length}
                </span>
              </div>
              {loadingOrders ? (
                <div className="p-8 flex justify-center"><Spin /></div>
              ) : orders.length === 0 ? (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-gray-200 text-4xl block mb-2">done_all</span>
                  <p className="text-sm text-gray-400">Không có đơn nào cần QC</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50 max-h-[65vh] overflow-y-auto">
                  {orders.map(order => (
                    <button key={order.documentId} onClick={() => handleSelectOrder(order)}
                      className={`w-full text-left px-4 py-3 border-l-4 transition-colors ${
                        selectedOrder?.documentId === order.documentId
                          ? 'bg-purple-50 border-purple-500'
                          : 'hover:bg-gray-50 border-transparent'
                      }`}>
                      <p className="text-sm font-bold text-gray-800 font-mono">{order.documentCode}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{order.destination ?? order.customerName ?? '—'}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gray-400">{order.totalItems} SKU</span>
                        <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">QC_SCAN</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Chi tiết + QR ── */}
          <div className="lg:col-span-2 space-y-3">
            {!selectedOrder ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-14 flex flex-col items-center text-center shadow-sm">
                <span className="material-symbols-outlined text-gray-200 text-6xl mb-3">qr_code_scanner</span>
                <p className="text-sm font-semibold text-gray-400">Chọn đơn từ danh sách bên trái</p>
              </div>
            ) : (
              <>
                {/* Order info */}
                <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-base font-bold text-gray-900 font-mono">{selectedOrder.documentCode}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {selectedOrder.destination ?? selectedOrder.customerName}
                        {selectedOrder.shipmentDate && ` · Giao: ${new Date(selectedOrder.shipmentDate).toLocaleDateString('vi-VN')}`}
                      </p>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full border border-purple-200">
                      {selectedOrder.totalItems} SKU
                    </span>
                  </div>
                </div>

                {loadingPick && (
                  <div className="bg-white rounded-2xl border p-8 flex items-center justify-center gap-3 shadow-sm">
                    <Spin /><span className="text-sm text-gray-400">Đang tải Pick List...</span>
                  </div>
                )}

                {!loadingPick && pickList && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                    {/* ── QR Panel ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm flex flex-col items-center gap-4">
                      <div className="w-full flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-500 text-xl">qr_code</span>
                        <p className="text-sm font-bold text-gray-800">Mã QR Scanner</p>
                        {qrValue && !isFinalized && (
                          <span className="ml-auto flex items-center gap-1 text-[10px] text-emerald-600">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            LIVE
                          </span>
                        )}
                      </div>

                      {/* Đã hoàn tất */}
                      {isFinalized ? (
                        <div className="w-full space-y-3">
                          <div className="relative p-3 bg-gray-100 border-2 border-gray-200 rounded-xl">
                            {qrValue && <div className="opacity-20"><QRCode value={qrValue} size={160} level="H" /></div>}
                            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                                <span className="material-symbols-outlined text-emerald-600 text-[26px]">verified</span>
                              </div>
                              <p className="text-xs font-bold text-emerald-700">QC Hoàn tất</p>
                            </div>
                          </div>
                          {/* ✅ NÚT HOÀN TẤT QC → GỬI KEEPER */}
                          <button
                            onClick={() => setShowCompleteConfirm(true)}
                            className="w-full py-3 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[18px]">send</span>
                            Hoàn tất QC → Gửi Keeper
                          </button>
                        </div>
                      ) : qrLoading ? (
                        <div className="w-[160px] h-[160px] flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                          <Spin />
                        </div>
                      ) : qrError ? (
                        <div className="w-full p-4 bg-red-50 rounded-xl border border-red-200 text-center">
                          <p className="text-xs text-red-600 mb-2">{qrError}</p>
                          <button onClick={generateQR} className="text-xs font-semibold text-red-700 underline">Thử lại</button>
                        </div>
                      ) : qrValue ? (
                        /* QR đã gen — chỉ hiển thị, KHÔNG cho tạo lại */
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
                            <QRCode value={qrValue} size={160} level="H" />
                          </div>
                          <p className="text-[11px] text-gray-400 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px] text-amber-500">lock</span>
                            QR đã tạo — dùng điện thoại để quét
                          </p>
                          {/* Không có nút "Tạo lại QR" — đúng yêu cầu chỉ gen 1 lần */}
                        </div>
                      ) : qrGenerated && !qrValue ? (
                        /* Session đang chạy nhưng không có QR URL (reload trang) */
                        <div className="w-full p-4 bg-purple-50 rounded-xl border border-purple-100 text-center">
                          <span className="material-symbols-outlined text-purple-400 text-3xl block mb-2">qr_code_scanner</span>
                          <p className="text-xs text-purple-700 font-medium">Phiên QC đang chạy</p>
                          <p className="text-xs text-purple-500 mt-1">Session đã tạo. Dùng điện thoại đang mở để tiếp tục quét.</p>
                        </div>
                      ) : (
                        /* Chưa gen QR */
                        <>
                          <div className="w-full p-4 bg-purple-50 rounded-xl border border-purple-100 space-y-2">
                            <p className="text-xs text-purple-700 font-medium">Cách sử dụng:</p>
                            {[
                              '1. Bấm "Tạo QR Code" bên dưới',
                              '2. Dùng điện thoại quét mã QR',
                              '3. Camera sẽ mở scanner barcode',
                              '4. Quét từng mặt hàng → PASS / FAIL',
                              '5. Kết quả cập nhật realtime trên PC',
                            ].map((s, i) => (
                              <p key={i} className="text-xs text-purple-600">{s}</p>
                            ))}
                          </div>
                          <button onClick={generateQR} disabled={qrLoading}
                            className="w-full py-3 text-sm font-bold text-white bg-purple-600 rounded-xl hover:bg-purple-700 flex items-center justify-center gap-2 disabled:opacity-60">
                            <span className="material-symbols-outlined text-[18px]">qr_code</span>
                            Tạo QR Code để scan
                          </button>
                        </>
                      )}
                    </div>

                    {/* ── Progress Panel ── */}
                    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
                      <p className="text-sm font-bold text-gray-800">Tiến độ QC</p>

                      {qcSummary ? (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: 'PASS', val: qcSummary.passCount,    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
                              { label: 'FAIL', val: qcSummary.failCount,    cls: 'bg-red-50 border-red-200 text-red-700' },
                              { label: 'HOLD', val: qcSummary.holdCount,    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
                              { label: 'Chờ',  val: qcSummary.pendingCount, cls: 'bg-gray-50 border-gray-200 text-gray-600' },
                            ].map(s => (
                              <div key={s.label} className={`rounded-xl p-3 text-center border ${s.cls}`}>
                                <p className="text-xl font-bold">{s.val}</p>
                                <p className="text-[10px] font-semibold">{s.label}</p>
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                              <span>Đã scan</span>
                              <span>{qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount} / {qcSummary.totalItems}</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${qcSummary.totalItems > 0 ? ((qcSummary.passCount + qcSummary.failCount + qcSummary.holdCount) / qcSummary.totalItems) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {qcSummary.allScanned && (
                            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2">
                              <span className="material-symbols-outlined text-emerald-600">verified</span>
                              <div>
                                <p className="text-sm font-bold text-emerald-800">QC hoàn tất!</p>
                                <p className="text-xs text-emerald-600">Bấm "Hoàn tất QC → Gửi Keeper" để chuyển đơn sang bước xuất kho.</p>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-gray-400">Chưa bắt đầu phiên QC.</p>
                          <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 max-h-48 overflow-y-auto">
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
                    <div className="px-4 py-2.5 bg-gray-50 border-b flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <span className="text-xs font-bold text-gray-700">Scan log realtime</span>
                      <span className="ml-auto text-[10px] text-gray-400">{scannedItems.length} items</span>
                    </div>
                    <div className="divide-y divide-gray-50 max-h-40 overflow-y-auto">
                      {scannedItems.map((item, idx) => (
                        <div key={idx} className="px-4 py-2.5 flex items-center justify-between">
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

      {/* Modal xác nhận hoàn tất QC */}
      <ConfirmModal
        open={showCompleteConfirm}
        icon="verified"
        iconColor="text-emerald-500"
        title="Xác nhận hoàn tất QC?"
        description={`Toàn bộ mặt hàng trong đơn ${selectedOrder?.documentCode ?? ''} đã được kiểm tra. Keeper sẽ nhận thông báo và tiến hành xuất kho.`}
        confirmLabel="Hoàn tất QC"
        confirmColor="bg-emerald-600 hover:bg-emerald-700"
        loading={completing}
        onConfirm={handleCompleteQC}
        onCancel={() => setShowCompleteConfirm(false)}
      />
    </div>
  );
}
