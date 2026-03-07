'use client';

import React from 'react';
import SearchFilter from '@/components/ui/SearchFilter';
import { QCInspectionStatus } from '@/interfaces/qcInspection';

type FilterStatus = QCInspectionStatus;

interface Props {
  search: string;
  statusFilter: FilterStatus;
  setSearch: (v: string) => void;
  setStatusFilter: (v: FilterStatus) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function QCReportFilter({
  search,
  statusFilter,
  setSearch,
  setStatusFilter,
  onSubmit,
}: Props) {
  return (
    <SearchFilter
      search={search}
      status={statusFilter}
      setSearch={setSearch}
      setStatus={(v) => setStatusFilter(v as FilterStatus)}
      onSubmit={onSubmit}
      placeholder="Tìm kiếm theo mã kiểm định, lot number, SKU..."
      options={[
        { value: 'ALL', label: 'Tất cả' },
        { value: 'PENDING', label: 'Chờ kiểm định' },
        { value: 'INSPECTED', label: 'Đã kiểm định' },
        { value: 'DECIDED', label: 'Đã quyết định' },
      ]}
    />
  );
}

