'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { createReceivingSession, generateScanToken } from '@/services/receivingSessionService';
import { getScanUrl } from '@/services/scanService';
import toast from 'react-hot-toast';

export default function ScanQRCode() {
  const [qrValue, setQrValue] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const generateQRCode = async () => {
    setLoading(true);
    try {
      // Bước 1: Tạo receiving session
      const session = await createReceivingSession();
      setSessionId(session.sessionId);

      // Bước 2: Generate scan token từ sessionId
      const scanTokenData = await generateScanToken(session.sessionId);

      // Bước 3: Lấy scan URL từ scanToken
      const scanUrl = await getScanUrl(scanTokenData.scanToken);

      // Bước 4: Set QR code value
      setQrValue(scanUrl);
      toast.success('QR Code generated successfully');
    } catch (error) {
      console.error('Failed to generate QR code:', error);
      toast.error('Failed to generate QR code');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateQRCode();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-6 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="flex flex-col items-center gap-4">
        <h2 className="text-xl font-bold text-gray-900">Scan QR Code</h2>
        {sessionId && (
          <p className="text-sm text-gray-600">
            Session ID: <span className="font-mono font-semibold">{sessionId}</span>
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="text-sm text-gray-500">Generating QR Code...</p>
        </div>
      ) : qrValue ? (
        <div className="flex flex-col items-center gap-4">
          <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
            <QRCode
              value={qrValue}
              size={256}
              level="H"
            />
          </div>
          <div className="text-center max-w-md">
            <p className="text-xs text-gray-500 mb-2">Scan this QR code to access receiving session</p>
          </div>
          <button
            onClick={generateQRCode}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Regenerate QR Code
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8">
          <p className="text-sm text-gray-500">No QR code available</p>
          <button
            onClick={generateQRCode}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors"
          >
            Generate QR Code
          </button>
        </div>
      )}
    </div>
  );
}

