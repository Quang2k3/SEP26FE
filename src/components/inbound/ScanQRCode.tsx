'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'react-qr-code';
import { createReceivingSession, generateScanToken, getSession } from '@/services/receivingSessionService';
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
}

export default function ScanQRCode({ receivingId }: Props) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [scannedLines, setScannedLines] = useState<ScanLine[]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const parseLines = (lines: unknown[]): ScanLine[] => {
    if (!Array.isArray(lines)) return [];
    return lines
      .map((l: any) => ({
        skuCode: l.skuCode ?? '',
        skuName: l.skuName ?? l.skuCode ?? '',
        qty: Number(l.qty ?? 0),
        condition: l.condition ?? 'PASS',
      }))
      .filter((l) => l.skuCode);
  };

  const startPolling = (sid: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const session = await getSession(sid);
        if (session?.lines) {
          setScannedLines(parseLines(session.lines as unknown[]));
        }
      } catch {
        // silent — không làm gián đoạn UX
      }
    }, 3000);
  };

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const generateQRCode = async () => {
    setLoading(true);
    setErrorMsg(null);
    setQrValue(null);
    setScannedLines([]);
    stopPolling();

    try {
      const session = await createReceivingSession();
      setSessionId(session.sessionId);

      const tokenData = await generateScanToken(session.sessionId);
      if (!tokenData.scanToken) throw new Error('Không nhận được scanToken');

      const url = await getScanUrl(tokenData.scanToken, receivingId);
      if (!url) throw new Error('Không nhận được scan URL');

      setQrValue(url);
      toast.success('Tạo QR thành công');

      startPolling(session.sessionId);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không tạo được QR Code';
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingId]);

  // Group lines by skuCode
  const groupedLines = scannedLines.reduce<Record<string, ScanLine>>((acc, line) => {
    if (acc[line.skuCode]) {
      acc[line.skuCode].qty += line.qty;
    } else {
      acc[line.skuCode] = { ...line };
    }
    return acc;
  }, {});

  const lineList = Object.values(groupedLines);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Hướng dẫn */}
      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-600 font-medium mb-1">Hướng dẫn</p>
        <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
          <li>Dùng điện thoại quét mã QR bên dưới</li>
          <li>Scan từng barcode sản phẩm trên điện thoại</li>
          <li>Laptop tự cập nhật số lượng mỗi 3 giây</li>
          <li>Nhấn "Xác nhận kiểm đếm" trên điện thoại khi xong</li>
        </ol>
      </div>

      {/* Info badges */}
      <div className="flex gap-3 w-full">
        <div className="flex-1 bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-green-500 text-base">receipt_long</span>
          <div>
            <p className="text-xs text-green-600">Phiếu nhận</p>
            <p className="text-xs font-bold text-green-800 font-mono">#{receivingId}</p>
          </div>
        </div>
        {sessionId && (
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-400 text-base">tag</span>
            <div>
              <p className="text-xs text-gray-500">Session</p>
              <p className="text-xs font-mono text-gray-700 truncate">{sessionId}</p>
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
          <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-red-500">error</span>
          </div>
          <p className="text-sm text-red-600 text-center">{errorMsg}</p>
          <button
            onClick={generateQRCode}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Thử lại
          </button>
        </div>
      ) : qrValue ? (
        <div className="flex flex-col items-center gap-3 w-full">
          <div className="p-3 bg-white border-2 border-gray-200 rounded-xl shadow-sm">
            <QRCode value={qrValue} size={200} level="H" />
          </div>
          <button
            onClick={generateQRCode}
            className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Tạo lại QR
          </button>
        </div>
      ) : null}

      {/* Scanned items — live polling */}
      {lineList.length > 0 && (
        <div className="w-full border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-700">
              Đã scan ({lineList.length} dòng)
            </span>
            <span className="text-xs text-green-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-1.5 text-left text-gray-500 font-medium">SKU</th>
                <th className="px-3 py-1.5 text-left text-gray-500 font-medium">Tên SP</th>
                <th className="px-3 py-1.5 text-center text-gray-500 font-medium">Qty</th>
                <th className="px-3 py-1.5 text-center text-gray-500 font-medium">Condition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lineList.map((line) => (
                <tr key={line.skuCode} className="hover:bg-gray-50">
                  <td className="px-3 py-1.5 font-mono font-medium text-gray-900">{line.skuCode}</td>
                  <td className="px-3 py-1.5 text-gray-700 truncate max-w-[120px]">{line.skuName}</td>
                  <td className="px-3 py-1.5 text-center font-bold text-gray-900">{line.qty}</td>
                  <td className="px-3 py-1.5 text-center">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      line.condition === 'PASS'
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
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
        <p className="text-xs text-gray-400 text-center">
          Chưa có sản phẩm nào được scan. Dùng điện thoại quét QR để bắt đầu.
        </p>
      )}
    </div>
  );
}