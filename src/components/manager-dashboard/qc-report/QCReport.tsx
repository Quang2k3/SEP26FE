"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { getQCInspections } from "@/services/qcInspectionService";
import type {
  QCInspection,
  QCInspectionPagePayload,
  QCInspectionStatus,
} from "@/interfaces/qcInspection";
import { getQCReportColumns } from "./components/columns";
import QCReportFilter from "./components/QCReportFilter";
import QCInspectionDetailModal from "@/components/qc-inspections/QCInspectionDetailModal";
import toast from "react-hot-toast";

type FilterStatus = QCInspectionStatus;

export default function QCReportContent() {
  const [selectedInspection, setSelectedInspection] = useState<QCInspection | null>(null);
  const [inspectionPage, setInspectionPage] =
    useState<QCInspectionPagePayload | null>(null);

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("INSPECTED");

  const loadInspections = async () => {
    setLoading(true);
    try {
      const params =
        statusFilter !== "ALL"
          ? { status: statusFilter, page, size: pageSize }
          : { page, size: pageSize };

      const data = await getQCInspections(params);

      setInspectionPage(data);
    } catch (error) {
      toast.error("Không thể tải danh sách kiểm định QC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections();
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const filteredInspections = useMemo(() => {
    if (!inspectionPage) return [];

    if (!search) return inspectionPage.content;

    return inspectionPage.content.filter(
      (i) =>
        i.inspectionCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuName?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [inspectionPage, search]);

  const handleChangePage = (newPage: number) => {
    if (!inspectionPage) return;
    if (newPage < 0 || newPage >= inspectionPage.totalPages) return;

    setPage(newPage);
  };

  const handleViewDetail = (inspectionId: number) => {
    const found = filteredInspections.find(i => i.inspectionId === inspectionId) ?? null;
    setSelectedInspection(found);
  };

  const columns = getQCReportColumns(handleViewDetail);

  return (
    <>
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
          page={page}
          pageSize={inspectionPage?.size ?? 10}
          totalPages={inspectionPage?.totalPages ?? 0}
          totalElements={inspectionPage?.totalElements ?? 0}
          onPrev={() => handleChangePage(page - 1)}
          onNext={() => handleChangePage(page + 1)}
          emptyText="Không có dữ liệu kiểm định QC"
        />
      </Card>
    </AdminPage>

      {selectedInspection && (
        <QCInspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
        />
      )}
    </>
  );
}
