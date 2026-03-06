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
import type { Incident } from "@/interfaces/incident";
import { Modal, Input } from "antd";
import toast from "react-hot-toast";

type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "ALL";

export default function IncidentListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] =
    useState<IncidentStatus>("OPEN");

  async function loadIncidents() {
    try {
      setLoading(true);

      const params =
        statusFilter === "ALL"
          ? {}
          : { status: statusFilter };

      const data = await fetchIncidents(params);

      setIncidents(data);
    } catch {
      toast.error("Không tải được danh sách Incident");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, [statusFilter]);

  async function handleApprove(incident: Incident) {
    try {
      await approveIncident(incident.incidentId);
      toast.success("Duyệt Incident thành công");
      loadIncidents();
    } catch {
      toast.error("Duyệt thất bại");
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
          toast.success("Đã từ chối Incident");
          loadIncidents();
        } catch {
          toast.error("Từ chối thất bại");
        }
      },
    });
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">
          Incident List
        </h1>
        <p className="text-gray-500 text-sm">
          Danh sách Incident
        </p>
      </div>

      <IncidentFilter
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <DataTable
        data={incidents}
        columns={getIncidentColumns(handleApprove, handleReject)}
        loading={loading}
      />
    </div>
  );
}