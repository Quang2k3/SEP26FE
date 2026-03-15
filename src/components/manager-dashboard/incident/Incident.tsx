"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/Table";
import {
  fetchIncidents,
  approveIncident,
  rejectIncident,
} from "@/services/incidentService";
import { getIncidentColumns } from "./components/column";
import IncidentFilter from "./components/IncidentFilter";
import type { Incident, IncidentPagePayload } from "@/interfaces/incident";
import { Modal, Input } from "antd";
import toast from "react-hot-toast";

type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "ALL";

export default function IncidentListPage() {
  const [incidentPage, setIncidentPage] = useState<IncidentPagePayload | null>(
    null,
  );

  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<IncidentStatus>("OPEN");

  async function loadIncidents() {
    try {
      setLoading(true);

      const params =
        statusFilter === "ALL"
          ? { page, size: pageSize }
          : { status: statusFilter, page, size: pageSize };

      const data = await fetchIncidents(params);

      setIncidentPage(data);
    } catch {
      toast.error("Không tải được danh sách Incident");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, [statusFilter, page]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const handleChangePage = (newPage: number) => {
    if (!incidentPage) return;
    if (newPage < 0 || newPage >= incidentPage.totalPages) return;

    setPage(newPage);
  };
  async function handleApprove(incident: Incident) {
    try {
      await approveIncident(incident.incidentId);
      toast.success("Duyệt sự cố thành công");
      loadIncidents();
    } catch {
      toast.error("Duyệt sự cố thất bại");
    }
  }

  function handleReject(incident: Incident) {
    let reason = "";

    Modal.confirm({
      title: "Từ chối Incident",
      content: (
        <Input
          placeholder="Nhập lý do từ chối"
          onChange={(e) => (reason = e.target.value)}
        />
      ),
      async onOk() {
        try {
          await rejectIncident(incident.incidentId, reason);
          toast.success("Đã từ chối sự cố");
          loadIncidents();
        } catch {
          toast.error("Từ chối sự cố thất bại");
        }
      },
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Incident List</h1>
        <p className="text-gray-500 text-sm">Danh sách Incident</p>
      </div>

      <IncidentFilter
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <DataTable
        data={incidentPage?.content ?? []}
        columns={getIncidentColumns(handleApprove, handleReject)}
        loading={loading}
        page={page}
        pageSize={incidentPage?.pageSize ?? 10}
        totalPages={incidentPage?.totalPages ?? 0}
        totalElements={incidentPage?.totalElements ?? 0}
        onPrev={() => handleChangePage(page - 1)}
        onNext={() => handleChangePage(page + 1)}
      />
    </div>
  );
}
