'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { createReceivingSession, generateScanToken } from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import toast from 'react-hot-toast';

interface Props {
  receivingId: number;
}

export default function ScanQRCode({ receivingId }: Props) {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const generateQRCode = async () => {
    setLoading(true);
    setErrorMsg(null);
    setQrValue(null);

    try {
      // Bước 2: Tạo session
      const session = await createReceivingSession();
      setSessionId(session.sessionId);

      // Bước 3: Sinh scan token
      const tokenData = await generateScanToken(session.sessionId);
      if (!tokenData.scanToken) throw new Error('Không nhận được scanToken');

      // Bước 4: Lấy scan URL kèm receivingId
      const url = await getScanUrl(tokenData.scanToken, receivingId);
      if (!url) throw new Error('Không nhận được scan URL');

      setQrValue(url);
      toast.success('Tạo QR thành công');
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [receivingId]);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Info */}
      <div className="w-full bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
        <p className="text-xs text-blue-600 font-medium mb-1">Hướng dẫn</p>
        <ol className="text-xs text-blue-700 space-y-0.5 list-decimal list-inside">
          <li>Dùng điện thoại quét mã QR bên dưới</li>
          <li>Scan từng barcode sản phẩm trên điện thoại</li>
          <li>Laptop tự cập nhật số lượng real-time</li>
          <li>Nhấn "Xác nhận kiểm đếm" trên điện thoại khi xong</li>
        </ol>
      </div>

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

      {/* QR */}
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
        <div className="flex flex-col items-center gap-3">
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
    </div>
  );
}