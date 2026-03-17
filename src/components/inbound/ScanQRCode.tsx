'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  createReceivingSession,
  generateScanToken,
  getSession,
  deleteSession,
} from '@/services/receivingSessionService';
import { fetchReceivingOrder } from '@/services/receivingOrdersService';
import { getScanUrl } from '@/services/scanService';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScanLine {
  skuCode: string;
  skuName: string;
  qty: number;
  condition: string;
}

interface Props {
  receivingId: number;
  userRole?: string; // 'KEEPER' | 'QC'
  onDone?: () => void;
  onFinalized?: (newStatus: string) => void; // callback khi scan xong & status thay đổi
}

// Trạng thái sau khi finalize theo role
const FINALIZED_STATUS: Record<string, string[]> = {
  // PENDING_COUNT đã bị khóa với Keeper — QC mới được scan ở bước này
  KEEPER: ['SUBMITTED', 'PENDING_INCIDENT', 'QC_APPROVED', 'GRN_CREATED', 'PENDING_APPROVAL', 'GRN_APPROVED', 'POSTED'],
  // FIX: QC scan từ PENDING_COUNT (Keeper nộp xong = chờ kiểm đếm), kết quả có thể là
  // QC_APPROVED (toàn pass) hoặc PENDING_INCIDENT (có hàng lỗi)
  QC:     ['QC_APPROVED', 'PENDING_INCIDENT', 'GRN_CREATED', 'PENDING_APPROVAL', 'GRN_APPROVED', 'POSTED'],
};

const FINALIZED_MSG: Record<string, string> = {
  SUBMITTED:        ' Keeper đã chốt kiểm đếm — chờ QC xử lý',
  PENDING_INCIDENT: ' Kiểm đếm xong — phát hiện sự cố, chờ xử lý',
  QC_APPROVED:      ' QC xác nhận đạt — có thể tạo GRN',
  GRN_CREATED:      ' Kiểm đếm xong — GRN đã được tạo',
  PENDING_APPROVAL: ' Đã gửi Manager chờ duyệt',
  GRN_APPROVED:     ' Manager đã duyệt',
  POSTED:           ' Đã nhập kho hoàn tất',
};

export default function ScanQRCode({ receivingId, userRole = 'KEEPER', onDone, onFinalized }: Props) {
  const [qrValue,      setQrValue]      = useState<string | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [sessionId,    setSessionId]    = useState<string | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const [scannedLines, setScannedLines] = useState<ScanLine[]>([]);
  const [isFinalized,  setIsFinalized]  = useState(false);
  const [finalStatus,  setFinalStatus]  = useState<string | null>(null);
  const isFinalizedRef = useRef(false); // ref để cleanup effect đọc được giá trị mới nhất

  const pollingRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const statusPollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef     = useRef<string | null>(null);
  const mountedRef       = useRef(true);
  const pollErrRef       = useRef(0);
  const initialStatus    = useRef<string | null>(null); // status lúc mở modal

  const stopPolling = () => {
    if (pollingRef.current)       { clearInterval(pollingRef.current);       pollingRef.current = null; }
    if (statusPollingRef.current) { clearInterval(statusPollingRef.current); statusPollingRef.current = null; }
  };

  const parseLines = (lines: unknown[]): ScanLine[] => {
    if (!Array.isArray(lines)) return [];
    return lines
      .map((l: any) => ({ skuCode: l.skuCode ?? '', skuName: l.skuName ?? l.skuCode ?? '', qty: Number(l.qty ?? 0), condition: l.condition ?? 'PASS' }))
      .filter(l => l.skuCode);
  };

  // Poll session lines (3s)
  const startSessionPolling = (sid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollErrRef.current = 0;
    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current) { clearInterval(pollingRef.current!); return; }
      try {
        const session = await getSession(sid);
        if (!mountedRef.current) return;
        if (session?.lines) setScannedLines(parseLines(session.lines as unknown[]));
        pollErrRef.current = 0;
      } catch {
        if (++pollErrRef.current >= 3) clearInterval(pollingRef.current!);
      }
    }, 3000);
  };

  // Poll receiving order status — detect khi điện thoại bấm "Xác nhận"
  const checkStatus = useCallback(async () => {
    if (!mountedRef.current || isFinalized) return;
    try {
      const order = await fetchReceivingOrder(receivingId);
      if (!mountedRef.current) return;
      const finalizedStatuses = FINALIZED_STATUS[userRole] ?? [];
      // Finalized: status nằm trong danh sách confirmed (bất kể initialStatus)
      if (finalizedStatuses.includes(order.status) && order.status !== initialStatus.current) {
        clearInterval(statusPollingRef.current!);
        clearInterval(pollingRef.current!);
        isFinalizedRef.current = true;
        setIsFinalized(true);
        setFinalStatus(order.status);
        const msg = FINALIZED_MSG[order.status] ?? `Hoàn tất — trạng thái: ${order.status}`;
        toast.success(msg, { duration: 5000, icon: '📋' });
        onFinalized?.(order.status);
      }
    } catch { /* silent */ }
  }, [receivingId, userRole, isFinalized, onFinalized]);

  const startStatusPolling = useCallback(() => {
    if (statusPollingRef.current) clearInterval(statusPollingRef.current);
    // Check ngay lập tức (không chờ interval đầu tiên)
    checkStatus();
    // Sau đó poll mỗi 2.5s
    statusPollingRef.current = setInterval(checkStatus, 2500);
  }, [checkStatus]);

  const generateQRCode = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setErrorMsg(null);
    setQrValue(null);
    setScannedLines([]);
    isFinalizedRef.current = false;
    setIsFinalized(false);
    setFinalStatus(null);
    stopPolling();

    try {
      // Lấy status hiện tại để detect thay đổi
      const currentOrder = await fetchReceivingOrder(receivingId);
      initialStatus.current = currentOrder.status;

      const session = await createReceivingSession();
      if (!mountedRef.current) return;
      setSessionId(session.sessionId);
      sessionIdRef.current = session.sessionId;

      const tokenData = await generateScanToken(session.sessionId);
      if (!tokenData.scanToken) throw new Error('Không nhận được scanToken');
      const url = await getScanUrl(tokenData.scanToken, receivingId);
      if (!url) throw new Error('Không nhận được scan URL');

      if (!mountedRef.current) return;
      setQrValue(url);
      toast.success('Tạo QR thành công', { id: 'qr-created' });

      startSessionPolling(session.sessionId);
      startStatusPolling();
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      setErrorMsg(err instanceof Error ? err.message : 'Không tạo được QR Code');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [receivingId, startStatusPolling]);

  useEffect(() => {
    mountedRef.current = true;
    generateQRCode();
    return () => {
      mountedRef.current = false;
      stopPolling();
      // Chỉ xóa session khi đã finalized — giữ session sống để finalizeCount vẫn sync được
      const sid = sessionIdRef.current;
      if (sid && isFinalizedRef.current) deleteSession(sid).catch(() => {});
    };
  }, [receivingId]); // eslint-disable-line

  // Group lines
  const lineList = Object.values(
    scannedLines.reduce<Record<string, ScanLine>>((acc, l) => {
      acc[l.skuCode] = acc[l.skuCode]
        ? { ...acc[l.skuCode], qty: acc[l.skuCode].qty + l.qty }
        : { ...l };
      return acc;
    }, {})
  );

  const isQC = userRole === 'QC';
  const totalQty = lineList.reduce((s, l) => s + l.qty, 0);
  const passCount = lineList.filter(l => l.condition !== 'FAIL').length;
  const failCount = lineList.filter(l => l.condition === 'FAIL').length;

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* ── Finalized banner ── */}
      {isFinalized && (
        <div className="w-full bg-emerald-50 border-2 border-emerald-200 rounded-xl px-4 py-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-emerald-600 text-[22px]">check_circle</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-emerald-800">
              {isQC ? 'Kiểm định QC hoàn tất!' : 'Kiểm đếm hoàn tất!'}
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              {FINALIZED_MSG[finalStatus ?? ''] ?? 'Trạng thái đã được cập nhật'}
            </p>
            <p className="text-[11px] text-emerald-500 mt-2 flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">lock</span>
              Mã QR đã bị khóa — không thể scan thêm
            </p>
          </div>
          {onDone && (
            <button onClick={onDone}
              className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors">
              Đóng
            </button>
          )}
        </div>
      )}

      {/* ── Hướng dẫn (chỉ hiện khi chưa finalize) ── */}
      {!isFinalized && (
        <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
          <p className="text-xs font-bold text-blue-700 mb-1.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">info</span>
            Hướng dẫn
          </p>
          <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
            <li>Dùng điện thoại quét mã QR bên dưới</li>
            <li>Scan từng barcode sản phẩm trên điện thoại</li>
            <li>Màn hình này tự cập nhật mỗi 3 giây</li>
            <li className="font-medium">
              {isQC
                ? 'Nhấn "Xác nhận QC" trên điện thoại khi kiểm tra xong'
                : 'Nhấn "Xác nhận kiểm đếm" trên điện thoại khi xong'}
            </li>
          </ol>
        </div>
      )}

      {/* ── Status badges ── */}
      <div className="flex gap-2 w-full">
        <div className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-indigo-400 text-[18px]">receipt_long</span>
          <div>
            <p className="text-[10px] text-gray-400">Phiếu nhận</p>
            <p className="text-xs font-bold text-gray-800 font-mono">#{receivingId}</p>
          </div>
        </div>
        {lineList.length > 0 && (
          <>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
              <div className="text-center">
                <p className="text-[10px] text-emerald-600">Pass</p>
                <p className="text-xs font-bold text-emerald-700">{passCount}</p>
              </div>
            </div>
            {failCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-red-500 text-[16px]">cancel</span>
                <div className="text-center">
                  <p className="text-[10px] text-red-600">Fail</p>
                  <p className="text-xs font-bold text-red-700">{failCount}</p>
                </div>
              </div>
            )}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-indigo-500 text-[16px]">inventory_2</span>
              <div className="text-center">
                <p className="text-[10px] text-indigo-600">Tổng SL</p>
                <p className="text-xs font-bold text-indigo-700">{totalQty}</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── QR Code ── */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          <p className="text-sm text-gray-500">Đang tạo QR Code...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center gap-3 py-4 w-full">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500">error</span>
          </div>
          <p className="text-sm text-red-600 text-center">{errorMsg}</p>
          <button onClick={generateQRCode}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Thử lại
          </button>
        </div>
      ) : isFinalized ? (
        /* QR bị khóa sau finalize */
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="relative p-3 bg-gray-100 border-2 border-gray-200 rounded-xl">
            {qrValue && (
              <div className="opacity-20">
                <QRCode value={qrValue} size={200} level="H" />
              </div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-emerald-600 text-[26px]">lock</span>
              </div>
              <p className="text-xs font-bold text-emerald-700">QR đã khóa</p>
            </div>
          </div>
        </div>
      ) : qrValue ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm relative">
            <QRCode value={qrValue} size={200} level="H" />
            {/* Live indicator */}
            <div className="absolute top-2 right-2 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[9px] text-green-600 font-bold">LIVE</span>
            </div>
          </div>
          <button onClick={generateQRCode}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1 transition-colors">
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Tạo lại QR
          </button>
        </div>
      ) : null}

      {/* ── Scanned items ── */}
      {lineList.length > 0 && (
        <div className="w-full border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-700">
              Đã scan ({lineList.length} SKU · {totalQty} thùng)
            </span>
            {!isFinalized && (
              <span className="text-[11px] text-green-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                Đang cập nhật...
              </span>
            )}
            {isFinalized && (
              <span className="text-[11px] text-emerald-600 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">check_circle</span>
                Hoàn tất
              </span>
            )}
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50/60 border-b border-gray-100">
              <tr>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold">SKU</th>
                <th className="px-3 py-2 text-left text-gray-500 font-semibold">Tên SP</th>
                <th className="px-3 py-2 text-center text-gray-500 font-semibold">Qty</th>
                <th className="px-3 py-2 text-center text-gray-500 font-semibold">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineList.map(line => (
                <tr key={line.skuCode} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono font-bold text-gray-900">{line.skuCode}</td>
                  <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">{line.skuName}</td>
                  <td className="px-3 py-2 text-center font-bold text-gray-900">{line.qty}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      line.condition === 'FAIL' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {line.condition}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {qrValue && !isFinalized && lineList.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2 flex items-center justify-center gap-1">
          <span className="material-symbols-outlined text-[14px]">qr_code_scanner</span>
          Chưa có sản phẩm nào được scan. Dùng điện thoại quét QR để bắt đầu.
        </p>
      )}
    </div>
  );
}
