"use client";

import { useEffect, useState } from "react";
import { DataTable } from "@/components/ui/Table";
import { fetchIncidents } from "@/services/incidentService";
import { getIncidentColumns } from "./components/column";
import IncidentFilter from "./components/IncidentFilter";
import IncidentDetailModal from "./components/IncidentDetailModal";
import type { Incident, IncidentPagePayload } from "@/interfaces/incident";
import toast from "react-hot-toast";
import { getStoredSession } from "@/services/authService";

type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "RESOLVED" | "ALL";

export default function IncidentListPage() {
  const [incidentPage, setIncidentPage] = useState<IncidentPagePayload | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<IncidentStatus>("OPEN");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);

  // Role check
  const session = getStoredSession();
  const isManager = session?.user?.roleCodes?.includes("MANAGER") ?? false;

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

  function handleDetail(incident: Incident) {
    setSelectedIncident(incident);
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Incident List</h1>
        <p className="text-gray-500 text-sm">Danh sách sự cố nhập kho</p>
      </div>

      <IncidentFilter
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <DataTable
        data={incidentPage?.content ?? []}
        columns={getIncidentColumns(handleDetail)}
        loading={loading}
        page={page}
        pageSize={incidentPage?.pageSize ?? 10}
        totalPages={incidentPage?.totalPages ?? 0}
        totalElements={incidentPage?.totalElements ?? 0}
        onPrev={() => handleChangePage(page - 1)}
        onNext={() => handleChangePage(page + 1)}
      />

      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          isManager={isManager}
          onClose={() => setSelectedIncident(null)}
          onResolved={() => {
            setSelectedIncident(null);
            loadIncidents();
          }}
        />
      )}
    </div>
  );
}
