"use client";

import React from "react";
import { Select } from "antd";

type IncidentStatus = "OPEN" | "APPROVED" | "REJECTED" | "RESOLVED" | "ALL";

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
        Trạng thái
      </span>

      <Select
        value={statusFilter}
        style={{ width: 200 }}
        onChange={(value) => setStatusFilter(value)}
        options={[
          { value: "ALL",      label: "Tất cả" },
          { value: "OPEN",     label: "Đang chờ" },
          { value: "RESOLVED", label: "Đã xử lý" },
          { value: "REJECTED", label: "Từ chối" },
        ]}
      />
    </div>
  );
}