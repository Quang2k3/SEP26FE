"use client";

import React from "react";
import { Input, Select, Space } from "antd";
import type { UserStatus } from "@/interfaces/user";

type FilterStatus = UserStatus | "ALL";

interface Props {
  search: string;
  statusFilter: FilterStatus;
  setSearch: (v: string) => void;
  setStatusFilter: (v: FilterStatus) => void;
}

export default function UserFilter({
  search,
  statusFilter,
  setSearch,
  setStatusFilter,
}: Props) {
  return (
    <Space wrap>
      <Input
        allowClear
        placeholder="Search email, name, phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: 280 }}
        prefix={<span className="material-symbols-outlined text-gray-400 text-base">search</span>}
      />
      <Select
        value={statusFilter}
        onChange={(v) => setStatusFilter(v as FilterStatus)}
        style={{ width: 180 }}
        options={[
          { value: "ALL", label: "Tất cả" },
          { value: "ACTIVE", label: "Đang hoạt động" },
          { value: "INACTIVE", label: "Không hoạt động" },
          { value: "PENDING_VERIFY", label: "Chờ xác minh" },
          { value: "LOCKED", label: "Đã khoá" },
        ]}
      />
    </Space>
  );
}