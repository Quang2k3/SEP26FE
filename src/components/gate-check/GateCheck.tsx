"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import { fetchReceivingOrders } from "@/services/receivingOrdersService";
import type { ReceivingOrder } from "@/interfaces/receiving";
import { getReceivingColumns } from "./components/columns";
import GateCheckModal from "./components/GateCheckModal";
import GateCheckFilter from "./components/GateCheckFilter";
import type { ReceivingStatus } from "@/interfaces/receiving";

export default function GateCheckContent() {
  const [receivings, setReceivings] = useState<ReceivingOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [selectedReceiving, setSelectedReceiving] =
    useState<ReceivingOrder | null>(null);
  type FilterStatus = ReceivingStatus | "ALL";

  const [statusFilter, setStatusFilter] = useState<FilterStatus>("SUBMITTED");
  const [openGateCheck, setOpenGateCheck] = useState(false);

  const loadReceivings = async () => {
    setLoading(true);
    try {
      const data = await fetchReceivingOrders({
        status: "SUBMITTED",
      });

      setReceivings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceivings();
  }, []);

  const filteredReceivings = useMemo(() => {
    if (!search) return receivings;

    return receivings.filter(
      (r) =>
        r.receivingCode?.toLowerCase().includes(search.toLowerCase()) ||
        r.supplierName?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [receivings, search]);

  const handleStartUnload = (receiving: ReceivingOrder) => {
    setSelectedReceiving(receiving);
    setOpenGateCheck(true);
  };

  const columns = getReceivingColumns(handleStartUnload);

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
