'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';
import type { ReceivingOrder } from '@/interfaces/receiving';

const STATUS_CONFIG = {
  DRAFT:            { label: 'Nháp',          cls: 'bg-gray-100 text-gray-600 border-gray-200' },
  PENDING_COUNT:    { label: 'Chờ đếm',       cls: 'bg-sky-50 text-sky-700 border-sky-100' },
  SUBMITTED:        { label: 'Đang nhận hàng', cls: 'bg-cyan-50 text-cyan-700 border-cyan-100' },
  PENDING_INCIDENT: { label: 'Sự cố',         cls: 'bg-red-50 text-red-600 border-red-100' },
  QC_APPROVED:      { label: 'QC duyệt',      cls: 'bg-violet-50 text-violet-700 border-violet-100' },
  GRN_CREATED:      { label: 'GRN đã tạo',   cls: 'bg-orange-50 text-orange-700 border-orange-100' },
  POSTED:           { label: 'Hoàn thành',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
};

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-100 animate-pulse">
      <td className="px-5 py-3.5"><div className="flex flex-col gap-1.5"><div className="w-24 h-3 bg-gray-100 rounded"/><div className="w-16 h-2.5 bg-gray-100 rounded"/></div></td>
      <td className="px-5 py-3.5"><div className="w-28 h-3 bg-gray-100 rounded"/></td>
      <td className="px-5 py-3.5 text-center"><div className="w-12 h-3 bg-gray-100 rounded mx-auto"/></td>
      <td className="px-5 py-3.5 text-center"><div className="w-16 h-5 bg-gray-100 rounded-full mx-auto"/></td>
      <td className="px-5 py-3.5"><div className="w-6 h-5 bg-gray-100 rounded mx-auto"/></td>
    </tr>
  );
}

export default function InventoryTable() {
  const [orders, setOrders] = useState<ReceivingOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReceivingOrders({ page: 0, size: 6 })
      .then(data => setOrders(data.content))
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Phiếu nhập kho gần đây</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {loading ? 'Đang tải...' : `${orders.length} phiếu mới nhất`}
          </p>
        </div>
        <Link href="/inbound/gate-check"
          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors px-3 py-1.5 rounded-lg hover:bg-blue-50 border border-transparent hover:border-blue-100">
          Xem tất cả
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mã phiếu / Kho</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Nhà cung cấp</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Số lượng</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Trạng thái</th>
              <th className="px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider text-center">Ngày tạo</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(4).fill(0).map((_, i) => <SkeletonRow key={i} />)
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <span className="material-symbols-outlined text-gray-200 text-4xl">inbox</span>
                    <p className="text-sm text-gray-400 font-medium">Chưa có phiếu nhập kho</p>
                    <p className="text-xs text-gray-300">Tạo phiếu mới để bắt đầu</p>
                  </div>
                </td>
              </tr>
            ) : (
              orders.map(order => {
                const s = STATUS_CONFIG[order.status] ?? { label: order.status, cls: 'bg-gray-100 text-gray-600 border-gray-200' };
                const date = new Date(order.createdAt);
                const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                return (
                  <tr key={order.receivingId} className="border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 font-mono">{order.receivingCode}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{order.warehouseName}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700 truncate max-w-[140px] block">
                        {order.supplierName ?? <span className="text-gray-300 italic">Không có</span>}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-sm font-bold text-gray-900">{order.totalQty}</span>
                      <span className="text-xs text-gray-400">/{order.totalExpectedQty}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.cls}`}>
                        {s.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <span className="text-xs text-gray-500">{dateStr}</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with quick link */}
      {!loading && orders.length > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between">
          <p className="text-[11px] text-gray-400">Hiển thị {orders.length} phiếu gần nhất</p>
          <Link href="/inbound/gate-check"
            className="text-[11px] text-blue-600 font-semibold hover:text-blue-800 flex items-center gap-1 transition-colors">
            Quản lý inbound
            <span className="material-symbols-outlined text-[12px]">arrow_forward</span>
          </Link>
        </div>
      )}
    </div>
  );
}
