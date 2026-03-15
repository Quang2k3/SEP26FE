'use client';

import Portal from '@/components/ui/Portal';
import type { QCInspection } from '@/interfaces/qcInspection';

interface Props {
  inspection: QCInspection;
  onClose: () => void;
}

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  PENDING:   { label: 'Chờ kiểm định', cls: 'bg-yellow-100 text-yellow-800' },
  INSPECTED: { label: 'Đã kiểm định',  cls: 'bg-blue-100 text-blue-800'   },
  DECIDED:   { label: 'Đã quyết định', cls: 'bg-green-100 text-green-800'  },
};

const DECISION_CONFIG: Record<string, { label: string; cls: string }> = {
  APPROVED: { label: 'Chấp nhận',   cls: 'bg-emerald-100 text-emerald-700' },
  REJECTED: { label: 'Từ chối',     cls: 'bg-red-100 text-red-700'         },
  QUARANTINE:{ label: 'Cách ly',    cls: 'bg-amber-100 text-amber-700'     },
};

function formatDate(s?: string) {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleString('vi-VN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return s; }
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-gray-100 last:border-0 gap-4">
      <span className="text-xs text-gray-400 font-medium w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-gray-800 font-medium text-right flex-1">{value || '—'}</span>
    </div>
  );
}

export default function QCInspectionDetailModal({ inspection, onClose }: Props) {
  const status   = STATUS_CONFIG[inspection.status];
  const decision = inspection.decision ? DECISION_CONFIG[inspection.decision] : null;

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[80] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500 text-[18px]">verified</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Chi tiết kiểm định</h3>
                <p className="text-[11px] text-gray-400 mt-0.5">{inspection.inspectionCode}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Badges */}
          <div className="px-5 pt-3 pb-1 flex items-center gap-2 flex-wrap">
            {status && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${status.cls}`}>
                {status.label}
              </span>
            )}
            {decision && (
              <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 ${decision.cls}`}>
                <span className="material-symbols-outlined text-[12px]">
                  {inspection.decision === 'APPROVED' ? 'check_circle' : inspection.decision === 'REJECTED' ? 'cancel' : 'warning'}
                </span>
                {decision.label}
              </span>
            )}
          </div>

          {/* Details */}
          <div className="px-5 py-2 divide-y divide-gray-50">
            <Row label="Mã phiếu"       value={inspection.inspectionCode} />
            <Row label="SKU"            value={<><span className="font-bold text-indigo-600">{inspection.skuCode}</span> — {inspection.skuName}</>} />
            <Row label="Số lô"          value={inspection.lotNumber} />
            <Row label="Người kiểm tra" value={inspection.inspectedByName} />
            <Row label="Ngày kiểm tra"  value={formatDate(inspection.inspectedAt)} />
            <Row label="Ngày tạo"       value={formatDate(inspection.createdAt)} />
            {inspection.remarks && (
              <div className="py-3">
                <p className="text-xs text-gray-400 font-medium mb-1.5">Ghi chú</p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5 border border-gray-100">
                  {inspection.remarks}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
