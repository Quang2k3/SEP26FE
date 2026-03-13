"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/Table";
import {
  fetchReceivingOrders,
  generateGrn,
} from "@/services/receivingOrdersService";
import type {
  ReceivingOrder,
  ReceivingOrderPagePayload,
  ReceivingStatus,
} from "@/interfaces/receiving";
import { getReceivingColumns } from "./components/columns";
import GateCheckModal from "./components/GateCheckModal";
import GateCheckFilter from "./components/GateCheckFilter";
import CreateReceivingOrderModal from "@/components/inbound/CreateReceivingOrderModal";
import toast from "react-hot-toast";

type FilterStatus = ReceivingStatus | "ALL";

export default function GateCheckContent() {
  const [receivings, setReceivings] =
    useState<ReceivingOrderPagePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>(() => {
  if (typeof window === 'undefined') return 'ALL';
  const session = JSON.parse(localStorage.getItem('auth_user') ?? '{}');
  const roles: string[] = session?.roleCodes ?? [];
  // QC mặc định xem SUBMITTED, MANAGER xem GRN_CREATED, KEEPER xem ALL
  if (roles.includes('QC')) return 'SUBMITTED';
  if (roles.includes('MANAGER')) return 'GRN_CREATED';
  return 'ALL';
});
  const [page, setPage] = useState(0);

  // Modal scan QR
  const [scanReceiving, setScanReceiving] = useState<ReceivingOrder | null>(
    null,
  );

  // Modal tạo phiếu mới
  const [showCreateModal, setShowCreateModal] = useState(false);

  const currentPage = receivings?.page ?? 0;
  const pageSize = receivings?.size ?? 10;
  const totalPages = receivings?.totalPages ?? 0;
  const totalElements = receivings?.totalElements ?? 0;

  const loadReceivings = async (p = page) => {
    setLoading(true);
    try {
      const data = await fetchReceivingOrders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: p,
        size: 10,
      });
      setReceivings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // SUBMITTED → mở modal scan QR
  const handleScan = (r: ReceivingOrder) => {
    setScanReceiving(r);
  };

  // QC_APPROVED → GRN_CREATED
  const handleGenerateGrn = async (r: ReceivingOrder) => {
    setActionLoadingId(r.receivingId);
    try {
      await generateGrn(r.receivingId);
      toast.success(`Đã tạo GRN cho phiếu ${r.receivingCode}`);
      loadReceivings(page);
    } finally {
      setActionLoadingId(null);
    }
  };

  const columns = getReceivingColumns({
    onScan: handleScan,
    onGenerateGrn: handleGenerateGrn,
    loadingId: actionLoadingId,
  });

  return (
    <AdminPage
      title="Inbound — Nhập kho"
      description="Quản lý toàn bộ luồng nhập hàng: tạo phiếu, scan, QC, tạo GRN."
      actions={
        <Button
          size="sm"
          onClick={() => setShowCreateModal(true)}
          leftIcon={
            <span className="material-symbols-outlined text-sm">add</span>
          }
        >
          Tạo phiếu mới
        </Button>
      }
    >
      {/* Filter */}
      <Card className="flex flex-col gap-3">
        <GateCheckFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={(e) => e.preventDefault()}
        />
      </Card>

      {/* Table */}
      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={filteredReceivings}
          loading={loading}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPrev={() => setPage((p) => Math.max(0, p - 1))}
          onNext={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
        />
      </Card>

      {/* Modal scan QR — chỉ cho SUBMITTED */}
      {scanReceiving && (
        <GateCheckModal
          open={!!scanReceiving}
          receivingId={scanReceiving.receivingId}
          warehouseId={scanReceiving.warehouseId}
          onClose={() => {
            setScanReceiving(null);
            loadReceivings(page);
          }}
        />
      )}

      {/* Modal tạo phiếu mới */}
      <CreateReceivingOrderModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={(receivingId) => {
          setShowCreateModal(false);
          loadReceivings(0);
          // Mở QR scan luôn với phiếu vừa tạo
          setScanReceiving({ receivingId, warehouseId: 0 } as ReceivingOrder);
        }}
      />
    </AdminPage>
  );
}
