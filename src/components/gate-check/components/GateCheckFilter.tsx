"use client";

import React from "react";
import SearchFilter from "@/components/ui/SearchFilter";
import type { ReceivingStatus } from "@/interfaces/receiving";

type FilterStatus = ReceivingStatus | "ALL";

interface Props {
  search: string;
  statusFilter: FilterStatus;
  setSearch: (v: string) => void;
  setStatusFilter: (v: FilterStatus) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function GateCheckFilter({
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
      placeholder="Search receipt code, supplier..."
      options={[
        { value: "ALL",              label: "All" },
        { value: "DRAFT",            label: "Draft" },
        { value: "PENDING_COUNT",    label: "Pending Count" },
        { value: "SUBMITTED",        label: "Submitted" },
        { value: "PENDING_INCIDENT", label: "Pending Incident" },
        { value: "QC_APPROVED",      label: "QC Approved" },
        { value: "GRN_CREATED",      label: "GRN Created" },
        { value: "POSTED",           label: "Posted" },
      ]}
    />
  );
}