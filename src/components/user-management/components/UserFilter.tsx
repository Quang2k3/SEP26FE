"use client";

import React from "react";
import SearchFilter from "@/components/ui/SearchFilter";
import type { UserStatus } from "@/interfaces/user";

type FilterStatus = UserStatus | "ALL";

interface Props {
  search: string;
  statusFilter: FilterStatus;

  setSearch: (v: string) => void;
  setStatusFilter: (v: FilterStatus) => void;

  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function UserFilter({
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
      placeholder="Search email, name, phone..."
      options={[
        { value: "ALL", label: "All" },
        { value: "ACTIVE", label: "Active" },
        { value: "PENDING_VERIFY", label: "Pending Verify" },
        { value: "LOCKED", label: "Locked" },
      ]}
    />
  );
}
