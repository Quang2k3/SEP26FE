'use client';

import { useState } from 'react';
import type { OutboundStatus, OutboundType } from '@/interfaces/outbound';
import { OUTBOUND_STATUS_BADGE } from '@/interfaces/outbound';

interface FilterState {
  keyword: string;
  status: OutboundStatus | 'ALL';
  orderType: OutboundType | 'ALL';
}

interface OutboundFilterProps {
  value: FilterState;
  onChange: (next: FilterState) => void;
}

const TYPE_OPTIONS: { value: OutboundType | 'ALL'; label: string }[] = [
  { value: 'ALL',               label: 'Tất cả loại' },
  { value: 'SALES_ORDER',       label: 'Sales Order' },
  { value: 'INTERNAL_TRANSFER', label: 'Chuyển kho' },
];

const STATUS_OPTIONS: { value: OutboundStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  ...Object.entries(OUTBOUND_STATUS_BADGE).map(([k, v]) => ({
    value: k as OutboundStatus,
    label: v.label,
  })),
];

export default function OutboundFilter({ value, onChange }: OutboundFilterProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Search */}
      <div className="flex flex-1 min-w-[200px] max-w-sm items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 transition-all shadow-sm">
        <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
        <input
          className="w-full bg-transparent border-none p-0 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
          placeholder="Tìm mã lệnh, khách hàng..."
          value={value.keyword}
          onChange={(e) => onChange({ ...value, keyword: e.target.value })}
        />
        {value.keyword && (
          <button onClick={() => onChange({ ...value, keyword: '' })} className="text-gray-300 hover:text-gray-500">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>

      {/* Type filter */}
      <select
        value={value.orderType}
        onChange={(e) => onChange({ ...value, orderType: e.target.value as OutboundType | 'ALL' })}
        className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
      >
        {TYPE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Status filter */}
      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as OutboundStatus | 'ALL' })}
        className="h-9 px-3 text-sm bg-white border border-gray-200 rounded-xl text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
      >
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
