'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchReceivingOrders,
  fetchReceivingOrder,
  qcSubmitCount,
  qcReconcile,
  keeperRecount,
  type QcMismatch,
  type QcCountItem,
} from '@/services/receivingOrdersService';
import type { ReceivingOrder, ReceivingItem } from '@/interfaces/receiving';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// ─── Statuses QC quan tâm ───────────────────────────────────────────────────
const QC_STATUSES = ['PENDING_QC', 'RECONCILIATION_REQUIRED', 'QC_APPROVED', 'PENDING_INCIDENT'];

const STATUS_BADGE: Record<string, { label: string; className: string; icon: string }> = {
  PENDING_QC:               { label: 'Chờ QC kiểm',    className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',   icon: 'hourglass_top' },
  RECONCILIATION_REQUIRED:  { label: 'Cần đối soát',   className: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200', icon: 'sync_problem' },
  QC_APPROVED:              { label: 'QC đã duyệt',    className: 'bg-green-50 text-green-700 ring-1 ring-green-200',   icon: 'check_circle' },
  PENDING_INCIDENT:         { label: 'Chờ Manager',     className: 'bg-red-50 text-red-700 ring-1 ring-red-200',        icon: 'report' },
};

const FILTER_TABS = [
  { value: 'ALL',                     label: 'Tất cả' },
  { value: 'PENDING_QC',             label: 'Chờ QC kiểm' },
  { value: 'RECONCILIATION_REQUIRED', label: 'Cần đối soát' },
  { value: 'QC_APPROVED',            label: 'QC đã duyệt' },
  { value: 'PENDING_INCIDENT',       label: 'Chờ Manager' },
];

// ─── QC Submit Count Modal ──────────────────────────────────────────────────
function QcSubmitCountModal({ order, onClose, onDone }: {
  order: ReceivingOrder; onClose: () => void; onDone: () => void;
}) {
  const [items, setItems] = useState<QcCountItem[]>(
    order.items.map(it => ({
      skuId: it.skuId,
      qcCountedQty: it.receivedQty, // default = Keeper qty
      condition: 'PASS' as const,
      failQty: 0,
      note: '',
    }))
  );
  const [loading, setLoading] = useState(false);
  const [mismatches, setMismatches] = useState<QcMismatch[] | null>(null);
  const [reconcileAction, setReconcileAction] = useState<'REJECT' | 'AMEND'>('REJECT');
  const [reconcileNote, setReconcileNote] = useState('');
  const [amendments, setAmendments] = useState<Record<number, { proposedQty: number; reason: string }>>({});

  const updateItem = (idx: number, field: keyof QcCountItem, val: any) => {
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));
  };

  const handleSubmitCount = async () => {
    setLoading(true);
    try {
      const result = await qcSubmitCount(order.receivingId, { items });
      if (result.matched) {
        if (result.incidentCode) {
          toast.success(`Khớp ✓ Tạo Incident ${result.incidentCode} (${result.incidentItemCount} SKU)`);
        } else {
          toast.success('Khớp ✓ Đơn hàng QC_APPROVED!');
        }
        onDone();
      } else {
        setMismatches(result.mismatches ?? []);
        toast('Số lượng QC không khớp Keeper — vui lòng chọn hướng xử lý', { icon: '⚠️' });
        // prefill amendments
        const amends: Record<number, { proposedQty: number; reason: string }> = {};
        (result.mismatches ?? []).forEach(m => {
          amends[m.skuId] = { proposedQty: m.qcQty, reason: '' };
        });
        setAmendments(amends);
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi gửi kết quả kiểm đếm');
    } finally {
      setLoading(false);
    }
  };

  const handleReconcile = async () => {
    if (reconcileNote.trim().length < 5) {
      toast.error('Ghi chú tối thiểu 5 ký tự');
      return;
    }
    setLoading(true);
    try {
      const payload: any = { action: reconcileAction, note: reconcileNote.trim() };
      if (reconcileAction === 'AMEND') {
        payload.amendments = Object.entries(amendments).map(([skuId, data]) => ({
          skuId: Number(skuId),
          proposedQty: data.proposedQty,
          reason: data.reason || undefined,
        }));
      }
      await qcReconcile(order.receivingId, payload);
      toast.success(reconcileAction === 'REJECT' ? 'Đã yêu cầu Keeper đếm lại' : 'Đã gửi số đề xuất cho Keeper');
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi đối soát');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-blue-500 text-[20px]">fact_check</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {mismatches ? 'Đối soát QC — Số lượng không khớp' : 'QC Kiểm đếm + Phân loại'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  {order.receivingCode} · {order.supplierName ?? '—'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {!mismatches ? (
              // ─── Step 1: QC nhập số đếm + phân loại ───
              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                  <p className="text-xs text-blue-700">
                    <span className="font-semibold">Hướng dẫn:</span> Nhập số lượng QC đếm được và phân loại PASS/FAIL cho từng SKU
                  </p>
                </div>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">SKU</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Keeper đếm</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">QC đếm</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Tình trạng</th>
                        <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">SL hỏng</th>
                        <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Ghi chú</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {items.map((item, idx) => {
                        const origItem = order.items.find(i => i.skuId === item.skuId);
                        const diff = item.qcCountedQty - (origItem?.receivedQty ?? 0);
                        return (
                          <tr key={item.skuId} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2.5">
                              <span className="font-mono font-semibold text-gray-900">{origItem?.skuCode}</span>
                              <br />
                              <span className="text-gray-400">{origItem?.skuName}</span>
                            </td>
                            <td className="px-4 py-2.5 text-center font-bold text-gray-700">
                              {origItem?.receivedQty ?? 0}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <input type="number" min={0} value={item.qcCountedQty}
                                onChange={e => updateItem(idx, 'qcCountedQty', Number(e.target.value))}
                                className={`w-20 text-center font-bold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 ${
                                  diff !== 0 ? 'border-orange-300 text-orange-700 focus:ring-orange-400 bg-orange-50' : 'border-gray-200 text-gray-900 focus:ring-blue-400'
                                }`} />
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <select value={item.condition}
                                onChange={e => updateItem(idx, 'condition', e.target.value)}
                                className={`text-xs font-semibold border rounded-lg px-2 py-1.5 focus:outline-none ${
                                  item.condition === 'PASS' ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'
                                }`}>
                                <option value="PASS">✓ PASS</option>
                                <option value="FAIL">✗ FAIL</option>
                              </select>
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {item.condition === 'FAIL' ? (
                                <input type="number" min={0} value={item.failQty ?? 0}
                                  onChange={e => updateItem(idx, 'failQty', Number(e.target.value))}
                                  className="w-16 text-center font-bold border border-red-200 rounded-lg px-2 py-1.5 bg-red-50 text-red-700 focus:outline-none focus:ring-2 focus:ring-red-400" />
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5">
                              <input type="text" value={item.note ?? ''} placeholder="Ghi chú..."
                                onChange={e => updateItem(idx, 'note', e.target.value)}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              // ─── Step 2: Mismatch → QC chọn REJECT / AMEND ───
              <div className="space-y-4">
                <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">warning</span>
                    {mismatches.length} SKU có số lượng lệch giữa QC và Keeper
                  </p>
                </div>

                {/* Mismatches table */}
                <div className="border border-orange-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-orange-50 border-b border-orange-100">
                        <th className="px-4 py-2.5 text-left text-orange-600 font-semibold">SKU</th>
                        <th className="px-4 py-2.5 text-center text-orange-600 font-semibold">Keeper</th>
                        <th className="px-4 py-2.5 text-center text-orange-600 font-semibold">QC</th>
                        <th className="px-4 py-2.5 text-center text-orange-600 font-semibold">Chênh lệch</th>
                        {reconcileAction === 'AMEND' && (
                          <th className="px-4 py-2.5 text-center text-orange-600 font-semibold">Số đề xuất</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-50">
                      {mismatches.map(m => (
                        <tr key={m.skuId} className="hover:bg-orange-50/50">
                          <td className="px-4 py-2.5 font-mono font-semibold text-gray-900">{m.skuCode}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-gray-700">{m.keeperQty}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-blue-700">{m.qcQty}</td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`font-bold ${m.diff > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {m.diff > 0 ? '+' : ''}{m.diff}
                            </span>
                          </td>
                          {reconcileAction === 'AMEND' && (
                            <td className="px-4 py-2.5 text-center">
                              <input type="number" min={0}
                                value={amendments[m.skuId]?.proposedQty ?? m.qcQty}
                                onChange={e => setAmendments(prev => ({
                                  ...prev,
                                  [m.skuId]: { ...prev[m.skuId], proposedQty: Number(e.target.value) }
                                }))}
                                className="w-20 text-center font-bold border border-blue-200 rounded-lg px-2 py-1.5 bg-blue-50 text-blue-700" />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Action selection */}
                <div className="flex gap-3">
                  <button onClick={() => setReconcileAction('REJECT')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      reconcileAction === 'REJECT' ? 'border-red-400 bg-red-50 text-red-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">undo</span>
                    Reject — Yêu cầu Keeper đếm lại
                  </button>
                  <button onClick={() => setReconcileAction('AMEND')}
                    className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      reconcileAction === 'AMEND' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">edit_note</span>
                    Amend — Đề xuất số mới
                  </button>
                </div>

                {/* Note (mandatory) */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Lý do <span className="text-red-500">*</span>
                  </label>
                  <textarea rows={3} value={reconcileNote} onChange={e => setReconcileNote(e.target.value)}
                    placeholder={reconcileAction === 'REJECT'
                      ? 'VD: Keeper đếm sai, cần đếm lại...'
                      : 'VD: Tìm thấy hàng lẫn trong pallet khác...'}
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
              Đóng
            </button>
            {!mismatches ? (
              <button onClick={handleSubmitCount} disabled={loading}
                className="flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? 'Đang xử lý...' : '✓ Gửi kết quả kiểm đếm'}
              </button>
            ) : (
              <button onClick={handleReconcile} disabled={loading || reconcileNote.trim().length < 5}
                className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 ${
                  reconcileAction === 'REJECT' ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                }`}>
                {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {loading ? 'Đang xử lý...' : reconcileAction === 'REJECT' ? 'Gửi yêu cầu đếm lại' : 'Gửi số đề xuất'}
              </button>
            )}
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Keeper Recount Modal ───────────────────────────────────────────────────
function KeeperRecountModal({ order, onClose, onDone }: {
  order: ReceivingOrder; onClose: () => void; onDone: () => void;
}) {
  const [action, setAction] = useState<'ACCEPT_QC' | 'RECOUNT'>('ACCEPT_QC');
  const [note, setNote] = useState('');
  const [recountItems, setRecountItems] = useState(
    order.items.map(it => ({
      skuId: it.skuId,
      newCountQty: it.receivedQty,
      note: '',
    }))
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const payload: any = { action, note: note || undefined };
      if (action === 'RECOUNT') {
        payload.items = recountItems;
      }
      await keeperRecount(order.receivingId, payload);
      toast.success(action === 'ACCEPT_QC' ? 'Đã chấp nhận số QC' : 'Đã gửi số đếm lại');
      onDone();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi xử lý');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-[20px]">sync_problem</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Đối soát — Xử lý từ Keeper</h3>
                <p className="text-xs text-gray-400 mt-0.5">{order.receivingCode}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
              <p className="text-xs text-orange-700">
                <span className="font-semibold">QC đã báo lệch số lượng.</span> Chọn chấp nhận số QC hoặc đếm lại.
              </p>
            </div>

            {/* Action selection */}
            <div className="flex gap-3">
              <button onClick={() => setAction('ACCEPT_QC')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  action === 'ACCEPT_QC' ? 'border-green-400 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">check_circle</span>
                Chấp nhận số QC
              </button>
              <button onClick={() => setAction('RECOUNT')}
                className={`flex-1 py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                  action === 'RECOUNT' ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}>
                <span className="material-symbols-outlined text-[16px] align-middle mr-1.5">replay</span>
                Đếm lại
              </button>
            </div>

            {action === 'RECOUNT' && (
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">SKU</th>
                      <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Số cũ</th>
                      <th className="px-4 py-2.5 text-center text-gray-500 font-semibold">Số mới</th>
                      <th className="px-4 py-2.5 text-left text-gray-500 font-semibold">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recountItems.map((item, idx) => {
                      const origItem = order.items.find(i => i.skuId === item.skuId);
                      return (
                        <tr key={item.skuId} className="hover:bg-gray-50/50">
                          <td className="px-4 py-2.5">
                            <span className="font-mono font-semibold text-gray-900">{origItem?.skuCode}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center text-gray-500">{origItem?.receivedQty ?? 0}</td>
                          <td className="px-4 py-2.5 text-center">
                            <input type="number" min={0} value={item.newCountQty}
                              onChange={e => setRecountItems(prev => prev.map((it, i) =>
                                i === idx ? { ...it, newCountQty: Number(e.target.value) } : it
                              ))}
                              className="w-20 text-center font-bold border border-blue-200 rounded-lg px-2 py-1.5 bg-blue-50 text-blue-700" />
                          </td>
                          <td className="px-4 py-2.5">
                            <input type="text" value={item.note} placeholder="Ghi chú..."
                              onChange={e => setRecountItems(prev => prev.map((it, i) =>
                                i === idx ? { ...it, note: e.target.value } : it
                              ))}
                              className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Ghi chú</label>
              <textarea rows={2} value={note} onChange={e => setNote(e.target.value)}
                placeholder="VD: Đã kiểm tra lại, đồng ý với số QC..."
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex-shrink-0 flex gap-3">
            <button onClick={onClose} disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Đóng
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className={`flex-1 px-4 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 ${
                action === 'ACCEPT_QC' ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'
              }`}>
              {loading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {loading ? 'Đang xử lý...' : action === 'ACCEPT_QC' ? 'Chấp nhận' : 'Gửi số đếm lại'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main List ──────────────────────────────────────────────────────────────
export default function QcReconciliation() {
  const [allOrders, setAllOrders] = useState<ReceivingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('PENDING_QC');
  const [page, setPage] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ReceivingOrder | null>(null);
  const [modalType, setModalType] = useState<'qc-submit' | 'keeper-recount' | null>(null);
  const PAGE_SIZE = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.all(
        QC_STATUSES.map(s =>
          fetchReceivingOrders({ status: s as any, size: 100 })
            .then(r => r.content ?? [])
            .catch(() => [] as ReceivingOrder[])
        )
      );
      const all = results.flat().sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
      );
      setAllOrders(all);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);
  useEffect(() => { setPage(0); }, [statusFilter]);

  const filtered = statusFilter === 'ALL'
    ? allOrders
    : allOrders.filter(r => r.status === statusFilter);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const openModal = async (order: ReceivingOrder) => {
    // Fetch full detail
    try {
      const full = await fetchReceivingOrder(order.receivingId);
      setSelectedOrder(full);
      if (order.status === 'PENDING_QC') {
        setModalType('qc-submit');
      } else if (order.status === 'RECONCILIATION_REQUIRED') {
        setModalType('keeper-recount');
      } else {
        setModalType(null);
      }
    } catch {
      toast.error('Không thể tải chi tiết đơn');
    }
  };

  const handleDone = () => {
    setSelectedOrder(null);
    setModalType(null);
    loadOrders();
  };

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {FILTER_TABS.map(tab => (
          <button key={tab.value} onClick={() => setStatusFilter(tab.value)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{filtered.length} phiếu</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wide">
                <th className="px-5 py-3">Mã phiếu</th>
                <th className="px-5 py-3">Nhà cung cấp</th>
                <th className="px-5 py-3 text-center">Số lượng</th>
                <th className="px-5 py-3 text-center">Trạng thái</th>
                <th className="px-5 py-3 text-center">Cập nhật</th>
                <th className="px-5 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(6).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
                    ))}
                  </tr>
                ))
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-14 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-gray-200 text-[48px]">fact_check</span>
                      <p className="text-sm text-gray-400">Không có đơn nào</p>
                    </div>
                  </td>
                </tr>
              ) : paged.map(r => {
                const badge = STATUS_BADGE[r.status] ?? { label: r.status, className: 'bg-gray-100 text-gray-600', icon: 'info' };
                const canAct = r.status === 'PENDING_QC' || r.status === 'RECONCILIATION_REQUIRED';
                return (
                  <tr key={r.receivingId} className="hover:bg-blue-50/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-gray-900 text-xs">{r.receivingCode}</span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-gray-500">{r.supplierName ?? '—'}</td>
                    <td className="px-5 py-3.5 text-center text-xs font-semibold text-gray-700">
                      {r.totalLines} SKU · {r.totalQty}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge.className}`}>
                        <span className="material-symbols-outlined text-[12px]">{badge.icon}</span>
                        {badge.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-xs text-gray-400">
                      {new Date(r.updatedAt ?? r.createdAt).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button onClick={() => openModal(r)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                          canAct
                            ? r.status === 'PENDING_QC'
                              ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100'
                              : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                        }`}>
                        <span className="material-symbols-outlined text-[13px]">
                          {r.status === 'PENDING_QC' ? 'fact_check' : r.status === 'RECONCILIATION_REQUIRED' ? 'sync_problem' : 'visibility'}
                        </span>
                        {r.status === 'PENDING_QC' ? 'Kiểm đếm' : r.status === 'RECONCILIATION_REQUIRED' ? 'Đối soát' : 'Xem'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-xs text-gray-400">Trang {page + 1} / {totalPages} · {filtered.length} đơn</span>
            <div className="flex gap-2">
              <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100">← Trước</button>
              <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-100">Tiếp →</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {selectedOrder && modalType === 'qc-submit' && (
        <QcSubmitCountModal order={selectedOrder} onClose={() => { setSelectedOrder(null); setModalType(null); }} onDone={handleDone} />
      )}
      {selectedOrder && modalType === 'keeper-recount' && (
        <KeeperRecountModal order={selectedOrder} onClose={() => { setSelectedOrder(null); setModalType(null); }} onDone={handleDone} />
      )}
    </div>
  );
}
