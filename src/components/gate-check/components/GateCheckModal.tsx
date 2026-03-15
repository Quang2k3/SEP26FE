'use client';

import Portal from '@/components/ui/Portal';
import ScanQRCode from '@/components/inbound/ScanQRCode';

interface Props {
  open: boolean;
  receivingId: number;
  userRole?: string;
  onClose: () => void;
  onFinalized?: (newStatus: string) => void; // callback để GateCheck reload list
}

export default function GateCheckModal({ open, onClose, receivingId, userRole = 'KEEPER', onFinalized }: Props) {
  if (!open) return null;

  const isQC = userRole === 'QC';

  const handleFinalized = (newStatus: string) => {
    onFinalized?.(newStatus);
    // Không tự đóng modal ngay — để user thấy banner xác nhận và tự đóng
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden"
          style={{ maxHeight: '90vh' }}>

          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0 ${
            isQC ? 'bg-amber-50/50' : 'bg-indigo-50/50'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isQC ? 'bg-amber-100' : 'bg-indigo-100'
              }`}>
                <span className={`material-symbols-outlined text-[20px] ${
                  isQC ? 'text-amber-600' : 'text-indigo-600'
                }`}>
                  {isQC ? 'verified' : 'qr_code_scanner'}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {isQC ? 'QC Kiểm tra' : 'Scan hàng nhận'}
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Phiếu #{receivingId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-5 py-4">
            <ScanQRCode
              receivingId={receivingId}
              userRole={userRole}
              onDone={onClose}
              onFinalized={handleFinalized}
            />
          </div>
        </div>
      </div>
    </Portal>
  );
}
