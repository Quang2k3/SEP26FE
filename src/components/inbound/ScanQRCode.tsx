'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'react-qr-code';
import {
  createReceivingSession,
  generateScanToken,
  getSession,
  deleteSession,
} from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import toast from 'react-hot-toast';

interface ScanLine {
  skuCode: string;
  skuName: string;
  qty: number;
  condition: string;
}

interface Props {
  receivingId: number;
  userRole?: string; // 'KEEPER' | 'QC'
  onDone?: () => void; // callback khi QC submit session xong
}

export default function ScanQRCode({ receivingId, userRole = 'KEEPER', onDone }: Props) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedLines, setScannedLines] = useState<ScanLine[]>([]);

  // Dùng ref để polling không bị stale closure
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const pollErrorCountRef = useRef(0); // đếm lỗi liên tiếp

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const parseLines = (lines: unknown[]): ScanLine[] => {
    if (!Array.isArray(lines)) return [];
    return lines
      .map((l: any) => ({
        skuCode: l.skuCode ?? '',
        skuName: l.skuName ?? l.skuCode ?? '',
        qty: Number(l.qty ?? 0),
        condition: l.condition ?? 'PASS',
      }))
      .filter(l => l.skuCode);
  };

  const startPolling = (sid: string) => {
    stopPolling();
    pollErrorCountRef.current = 0;

    pollingRef.current = setInterval(async () => {
      if (!mountedRef.current) { stopPolling(); return; }
      try {
        const session = await getSession(sid);
        if (!mountedRef.current) return;
        if (session?.lines) {
          setScannedLines(parseLines(session.lines as unknown[]));
        }
        pollErrorCountRef.current = 0; // reset lỗi khi success
      } catch {
        pollErrorCountRef.current += 1;
        // Sau 3 lỗi liên tiếp → dừng polling (session đã bị xóa/hết hạn)
        if (pollErrorCountRef.current >= 3) {
          stopPolling();
        }
      }
    }, 3000);
  };

  const generateQRCode = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoading(true);
    setErrorMsg(null);
    setQrValue(null);
    setScannedLines([]);
    stopPolling();

    try {
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

      startPolling(session.sessionId);
    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Không tạo được QR Code';
      setErrorMsg(msg);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingId]);

  // Cleanup khi unmount — xóa session trên BE để tránh SSE còn treo
  useEffect(() => {
    mountedRef.current = true;
    generateQRCode();

    return () => {
      mountedRef.current = false;
      stopPolling();
      // Xóa session khi đóng modal — silent (không throw)
      const sid = sessionIdRef.current;
      if (sid) {
        deleteSession(sid).catch(() => {});
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingId]);

  // Group lines by skuCode
  const groupedLines = scannedLines.reduce<Record<string, ScanLine>>((acc, line) => {
    if (acc[line.skuCode]) {
      acc[line.skuCode] = {
        ...acc[line.skuCode],
        qty: acc[line.skuCode].qty + line.qty,
      };
    } else {
      acc[line.skuCode] = { ...line };
    }
    return acc;
  }, {});
  const lineList = Object.values(groupedLines);

  return (
    <div className="flex flex-col gap-4 py-2">

      {/* Hướng dẫn */}
      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-xs font-semibold text-blue-700 mb-1.5">Hướng dẫn</p>
        <ol className="text-xs text-blue-600 space-y-0.5 list-decimal list-inside">
          <li>Dùng điện thoại quét mã QR bên dưới</li>
          <li>Scan từng barcode sản phẩm trên điện thoại</li>
          <li>Laptop tự cập nhật số lượng mỗi 3 giây</li>
          <li>
            {userRole === 'QC'
              ? 'Nhấn "Xác nhận QC" trên điện thoại khi kiểm tra xong'
              : 'Nhấn "Xác nhận kiểm đếm" trên điện thoại khi xong'}
          </li>
        </ol>
      </div>

      {/* Badges */}
      <div className="flex gap-2 w-full">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500 text-base">receipt_long</span>
          <div>
            <p className="text-[11px] text-green-600">Phiếu nhận</p>
            <p className="text-xs font-bold text-green-800 font-mono">#{receivingId}</p>
          </div>
        </div>
        {sessionId && (
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2 min-w-0">
            <span className="material-symbols-outlined text-gray-400 text-base">tag</span>
            <div className="min-w-0">
              <p className="text-[11px] text-gray-500">Session</p>
              <p className="text-[11px] font-mono text-gray-600 truncate">{sessionId}</p>
            </div>
          </div>
        )}
      </div>

      {/* QR Code */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
          <p className="text-sm text-gray-500">Đang tạo QR Code...</p>
        </div>
      ) : errorMsg ? (
        <div className="flex flex-col items-center gap-3 py-4 w-full">
          <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500">error</span>
          </div>
          <p className="text-sm text-red-600 text-center">{errorMsg}</p>
          <button
            onClick={generateQRCode}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Thử lại
          </button>
        </div>
      ) : qrValue ? (
        <div className="flex flex-col items-center gap-2 w-full">
          <div className="p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <QRCode value={qrValue} size={200} level="H" />
          </div>
          <button
            onClick={generateQRCode}
            className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mt-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Tạo lại QR
          </button>
        </div>
      ) : null}

      {/* Scanned items */}
      {lineList.length > 0 && (
        <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Đã scan ({lineList.length} dòng)
            </span>
            <span className="text-[11px] text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-3 py-1.5 text-left text-gray-500 font-medium">SKU</th>
                <th className="px-3 py-1.5 text-left text-gray-500 font-medium">Tên SP</th>
                <th className="px-3 py-1.5 text-center text-gray-500 font-medium">Qty</th>
                <th className="px-3 py-1.5 text-center text-gray-500 font-medium">Tình trạng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {lineList.map(line => (
                <tr key={line.skuCode} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono font-semibold text-gray-900">{line.skuCode}</td>
                  <td className="px-3 py-1.5 text-gray-600 truncate max-w-[100px]">{line.skuName}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-gray-900">{line.qty}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      line.condition === 'FAIL'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
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

      {qrValue && lineList.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          Chưa có sản phẩm nào được scan. Dùng điện thoại quét QR để bắt đầu.
        </p>
      )}
    </div>
  );
}