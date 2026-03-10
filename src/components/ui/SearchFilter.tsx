"use client";

import React from "react";
import { Input, Select, Button, Space } from "antd";

interface Option {
  value: string;
  label: string;
}

interface Props {
  search: string;
  status: string;
  options: Option[];

  placeholder?: string;

  setSearch: (v: string) => void;
  setStatus: (v: string) => void;

  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
}

export default function SearchFilter({
  search,
  status,
  options,
  placeholder = "Search...",
  setSearch,
  setStatus,
  onSubmit,
}: Props) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
    >
      <Space wrap>
        <Input
          allowClear
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 260 }}
        />

        <Select
          value={status}
          onChange={(v) => setStatus(v)}
          style={{ width: 180 }}
          options={options}
        />

        <Button type="primary" htmlType="submit">
          Search
        </Button>
      </Space>
    </form>
  );
}