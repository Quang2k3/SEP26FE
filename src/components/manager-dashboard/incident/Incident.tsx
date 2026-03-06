"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/Table";
import {
  fetchIncidents,
  approveIncident,
  rejectIncident,
} from "@/services/incidentService";
import { getIncidentColumns } from "./components/column";
import type { Incident } from "@/interfaces/incident";
import { message, Modal, Input } from "antd";
import toast from "react-hot-toast";

export default function IncidentListPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadIncidents() {
    try {
      setLoading(true);
      const data = await fetchIncidents({ status: "OPEN" });
      setIncidents(data);
    } catch {
        toast.error("Không tải được danh sách Incident");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadIncidents();
  }, []);

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
    <div className="p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">
          Incident List
        </h1>
        <p className="text-gray-500 text-sm">
          Danh sách Incident đang OPEN
        </p>
      </div>

      <DataTable
        data={incidents}
        columns={getIncidentColumns(handleApprove, handleReject)}
        loading={loading}
      />
    </div>
  );
}