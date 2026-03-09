"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { getQCInspections } from "@/services/qcInspectionService";
import type {
  QCInspection,
  QCInspectionStatus,
  QCInspectionPagePayload,
} from "@/interfaces/qcInspection";
import { getQCInspectionColumns } from "./components/columns";
import QCInspectionsFilter from "./components/QCInspectionsFilter";
import toast from "react-hot-toast";

type FilterStatus = QCInspectionStatus;

const DEFAULT_PAGE_SIZE = 20;

export default function QCInspectionsContent() {
  const [inspections, setInspections] = useState<QCInspection[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");

  const [pageInfo, setPageInfo] = useState<Omit<QCInspectionPagePayload, "content">>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });

  const loadInspections = async (override?: { page?: number; size?: number }) => {
    setLoading(true);

    try {
      const params = {
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        page: override?.page ?? pageInfo.page,
        size: override?.size ?? pageInfo.size,
      };

      const result = await getQCInspections(params);

      setInspections(result.content);

      setPageInfo({
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        last: result.last,
      });
    } catch (error) {
      console.error("Failed to fetch QC inspections:", error);
      toast.error("Không thể tải danh sách kiểm định QC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInspections({ page: 0 });
  }, [statusFilter]);

  const filteredInspections = useMemo(() => {
    if (!search) return inspections;

    return inspections.filter(
      (i) =>
        i.inspectionCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.lotNumber?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.skuName?.toLowerCase().includes(search.toLowerCase())
    );
  }, [inspections, search]);

  const handleViewDetail = (inspectionId: number) => {
    console.log("View detail for inspection:", inspectionId);
    toast.success(`Xem chi tiết kiểm định #${inspectionId}`);
  };

  const columns = getQCInspectionColumns(handleViewDetail);

  return (
    <AdminPage
      title="QC Inspections"
      description="Danh sách các phiếu kiểm định chất lượng"
    >
      <Card className="flex flex-col gap-3">
        <QCInspectionsFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={(e) => e.preventDefault()}
        />
      </Card>

      <Card className="overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredInspections}
          loading={loading}
          emptyText="Không có dữ liệu kiểm định QC"

          page={pageInfo.page}
          totalPages={pageInfo.totalPages}
          totalElements={pageInfo.totalElements}
          pageSize={pageInfo.size}

          onPrev={() =>
            loadInspections({ page: Math.max(0, pageInfo.page - 1) })
          }

          onNext={() =>
            loadInspections({ page: pageInfo.page + 1 })
          }
        />
      </Card>
    </AdminPage>
  );
}