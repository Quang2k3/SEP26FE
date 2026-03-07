'use client';

import { useEffect, useMemo, useState } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/Table';
import { getQCInspections } from '@/services/qcInspectionService';
import type { QCInspection, QCInspectionStatus } from '@/interfaces/qcInspection';
import { getQCReportColumns } from './components/columns';
import QCReportFilter from './components/QCReportFilter';
import toast from 'react-hot-toast';

type FilterStatus = QCInspectionStatus;

export default function QCReportContent() {
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('INSPECTED');

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'ALL' ? { status: statusFilter } : undefined;
      const data = await getQCInspections(params);
      setInspections(data);
    } catch (error) {
      console.error('Failed to fetch QC inspections:', error);
      toast.error('Không thể tải danh sách kiểm định QC');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [statusFilter]);

  const filteredInspections = useMemo(() => {
    if (!search) return inspections;

    return inspections.filter(
      (i) =>
        i.inspectionCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuName?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [inspections, search]);

  const handleViewDetail = (inspectionId: number) => {
    console.log('View detail for inspection:', inspectionId);
    toast.success(`Xem chi tiết kiểm định #${inspectionId}`);
  };

  const columns = getQCReportColumns(handleViewDetail);

  return (
    <AdminPage
      title="QC Inspections"
      description="Danh sách các phiếu kiểm định chất lượng"
    >
      {/* Filters */}
      {/* <Card className="flex flex-col gap-3">
        <QCReportFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={(e) => e.preventDefault()}
        />
      </Card> */}

      {/* Main Table */}
      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredInspections}
          loading={loading}
          emptyText="Không có dữ liệu kiểm định QC"
        />
      </Card>
    </AdminPage>
  );
}

