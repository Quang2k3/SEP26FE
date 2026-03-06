"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/Table";
import IncidentFilter from "./components/IncidentFilter";
import { fetchIncidents } from "@/services/incidentService";
import type { Incident, IncidentStatus } from "@/interface/incident";
import { getIncidentColumns } from "./components/columns";

type FilterStatus = IncidentStatus | "ALL";

export default function IncidentManagementContent() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("SUBMITTED");

  const loadIncidents = async () => {
    setLoading(true);
    try {
      const data = await fetchIncidents({
        status: statusFilter === "ALL" ? undefined : statusFilter,
      });

      setIncidents(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIncidents();
  }, []);

  const filteredIncidents = useMemo(() => {
    if (!search) return incidents;

    return incidents.filter(
      (i) =>
        i.incidentCode?.toLowerCase().includes(search.toLowerCase()) ||
        i.receivingCode?.toLowerCase().includes(search.toLowerCase()),
    );
  }, [incidents, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadIncidents();
  };

  const columns = getIncidentColumns();

  return (
    <AdminPage title="Gate Check" description="Danh sách sự cố trong kho">
      {/* Filter */}
      <Card className="flex flex-col gap-3">
        <IncidentFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={handleSearchSubmit}
        />
      </Card>

      {/* Table */}
      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={filteredIncidents}
          loading={loading}
        />
      </Card>
    </AdminPage>
  );
}
