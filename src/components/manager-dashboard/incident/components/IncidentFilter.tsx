"use client";

import React from "react";
import { Select } from "antd";

type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "ALL";

interface Props {
  statusFilter: IncidentStatus;
  setStatusFilter: (v: IncidentStatus) => void;
}

export default function IncidentFilter({
  statusFilter,
  setStatusFilter,
}: Props) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">
        Status
      </span>

      <Select
        value={statusFilter}
        style={{ width: 200 }}
        onChange={(value) => setStatusFilter(value)}
        options={[
          { value: "ALL", label: "All" },
          { value: "OPEN", label: "Open" },
          { value: "APPROVED", label: "Approved" },
          { value: "REJECTED", label: "Rejected" },
        ]}
      />
    </div>
  );
}