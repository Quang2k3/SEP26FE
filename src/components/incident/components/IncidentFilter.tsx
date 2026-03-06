"use client";

import React from "react";
import SearchFilter from "@/components/ui/SearchFilter";
import type { IncidentStatus } from "@/interface/incident";

type FilterStatus = IncidentStatus | "ALL";

interface Props {
  search: string;
  statusFilter: FilterStatus;
  setSearch: (v: string) => void;
  setStatusFilter: (v: FilterStatus) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function IncidentFilter({
  search,
  statusFilter,
  setSearch,
  setStatusFilter,
  onSubmit,
}: Props) {
  return (
    <SearchFilter
      search={search}
      status={statusFilter}
      setSearch={setSearch}
      setStatus={(v) => setStatusFilter(v as FilterStatus)}
      onSubmit={onSubmit}
      placeholder="Search incident code..."
      options={[
        { value: "ALL", label: "All" },
        { value: "SUBMITTED", label: "Submitted" },
        { value: "APPROVED", label: "Approved" },
        { value: "REJECTED", label: "Rejected" },
      ]}
    />
  );
}