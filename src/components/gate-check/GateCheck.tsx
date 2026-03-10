"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { fetchReceivingOrders } from "@/services/receivingOrdersService";
import type {
  ReceivingOrder,
  ReceivingOrderPagePayload,
} from "@/interfaces/receiving";
import { getReceivingColumns } from "./components/columns";
import GateCheckModal from "./components/GateCheckModal";
import GateCheckFilter from "./components/GateCheckFilter";
import type { ReceivingStatus } from "@/interfaces/receiving";

export default function GateCheckContent() {
  const [receivings, setReceivings] =
    useState<ReceivingOrderPagePayload | null>(null);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedReceiving, setSelectedReceiving] =
    useState<ReceivingOrder | null>(null);
  type FilterStatus = ReceivingStatus | "ALL";

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("SUBMITTED");
  const [openGateCheck, setOpenGateCheck] = useState(false);
  const [page, setPage] = useState(0);
  const currentPage = receivings?.currentPage ?? 0;
  const pageSize = receivings?.pageSize ?? 10;
  const totalPages = receivings?.totalPages ?? 0;

  const loadReceivings = async () => {
    setLoading(true);
    try {
      const data = await fetchReceivingOrders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page,
        size: pageSize,
      });

      setReceivings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivings();
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const filteredReceivings = useMemo(() => {
    if (!receivings) return [];

    if (!search) return receivings.content;

    return receivings.content.filter(
      (r) =>
        r.receivingCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.supplierName?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [receivings, search]);

  const handleStartUnload = (receiving: ReceivingOrder) => {
    setSelectedReceiving(receiving);
    setOpenGateCheck(true);
  };

  const handleChangePage = (newPage: number) => {
    if (newPage < 0 || newPage >= totalPages) return;
    setPage(newPage);
  };
  const columns = getReceivingColumns(handleStartUnload);

  const totalElements = receivings?.totalElements ?? 0;
  const from = totalElements === 0 ? 0 : currentPage * pageSize + 1;
  const to = Math.min(totalElements, (currentPage + 1) * pageSize);

  return (
    <AdminPage title="Gate Check" description="Danh sách xe chờ nhận hàng">
      <Card className="flex flex-col gap-3">
        <GateCheckFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={(e) => e.preventDefault()}
        />
      </Card>

      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={filteredReceivings}
          loading={loading}
          page={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPrev={() => handleChangePage(page - 1)}
          onNext={() => handleChangePage(page + 1)}
        />
      </Card>

      {selectedReceiving && (
        <GateCheckModal
          open={openGateCheck}
          receivingId={selectedReceiving.receivingId}
          warehouseId={selectedReceiving.warehouseId}
          onClose={() => {
            setOpenGateCheck(false);
            setSelectedReceiving(null);
            loadReceivings();
          }}
        />
      )}
    </AdminPage>
  );
}
