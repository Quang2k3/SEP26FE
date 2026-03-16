'use client';

import type { Column } from '@/components/ui/Table';
import type { OutboundListItem, OutboundType } from '@/interfaces/outbound';
import { OUTBOUND_STATUS_BADGE, type OutboundStatus } from '@/interfaces/outbound';

export function StatusBadge({ status }: { status: string }) {
  const cfg = OUTBOUND_STATUS_BADGE[status as OutboundStatus] ?? {
    label: status,
    className: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

export function TypeBadge({ type }: { type: OutboundType }) {
  return type === 'SALES_ORDER' ? (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-700">
      <span className="material-symbols-outlined text-[13px]">store</span>
      Sales Order
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700">
      <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
      Transfer
    </span>
  );
}

export function getOutboundColumns(
  onView: (row: OutboundListItem) => void,
): Column<OutboundListItem>[] {
  return [
    {
      key: 'documentCode',
      title: 'Mã lệnh xuất',
      render: (row) => (
        <button
          onClick={() => onView(row)}
          className="font-mono text-sm font-bold text-indigo-600 hover:underline"
        >
          {row.documentCode}
        </button>
      ),
    },
    {
      key: 'orderType',
      title: 'Loại',
      render: (row) => <TypeBadge type={row.orderType} />,
    },
    {
      key: 'destination',
      title: 'Khách hàng / Kho đích',
      render: (row) => (
        <span className="text-sm text-gray-700">
          {/* BE trả "destination", fallback sang customerName/destinationWarehouseName */}
          {row.destination ?? row.customerName ?? row.destinationWarehouseName ?? '—'}
        </span>
      ),
    },
    {
      key: 'shipmentDate',
      title: 'Ngày giao',
      render: (row) => {
        const date = row.shipmentDate ?? row.deliveryDate;
        return (
          <span className="text-sm text-gray-500">
            {date ? new Date(date).toLocaleDateString('vi-VN') : '—'}
          </span>
        );
      },
    },
    {
      key: 'totalItems',
      title: 'Số SKU',
      align: 'center',
      render: (row) => (
        <span className="text-sm font-medium text-gray-700">{row.totalItems}</span>
      ),
    },
    {
      key: 'status',
      title: 'Trạng thái',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'createdAt',
      title: 'Ngày tạo',
      render: (row) => (
        <span className="text-xs text-gray-400">
          {new Date(row.createdAt).toLocaleDateString('vi-VN')}
        </span>
      ),
    },
  ];
}
