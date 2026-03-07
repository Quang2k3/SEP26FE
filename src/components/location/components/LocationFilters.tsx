"use client";

import React from "react";
import { Select, Input, Button, Space } from "antd";
import { Zone } from "@/interfaces/zone";
import { LocationQueryParams } from "@/interfaces/location";

const { Option } = Select;

interface Props {
  filters: LocationQueryParams;
  zones: Zone[];
  setFilters: (filters: LocationQueryParams) => void;
  onSearch: () => void;
}

export default function LocationFilters({
  filters,
  zones,
  setFilters,
  onSearch,
}: Props) {
  return (
    <Space wrap>
      <Select
        placeholder="Zone"
        allowClear
        style={{ width: 180 }}
        value={filters.zoneId}
        onChange={(v) =>
          setFilters({
            ...filters,
            zoneId: v,
          })
        }
      >
        {zones.map((z) => (
          <Option key={z.zoneId} value={z.zoneId}>
            {z.zoneCode} - {z.zoneName}
          </Option>
        ))}
      </Select>

      <Select
        placeholder="Location Type"
        allowClear
        style={{ width: 150 }}
        value={filters.locationType}
        onChange={(v) =>
          setFilters({
            ...filters,
            locationType: v,
          })
        }
      >
        <Option value="AISLE">AISLE</Option>
        <Option value="RACK">RACK</Option>
        <Option value="BIN">BIN</Option>
        <Option value="STAGING">STAGING</Option>
      </Select>

      <Select
        placeholder="Active"
        allowClear
        style={{ width: 120 }}
        value={filters.active}
        onChange={(v) =>
          setFilters({
            ...filters,
            active: v,
          })
        }
      >
        <Option value={true}>Active</Option>
        <Option value={false}>Inactive</Option>
      </Select>

      <Input
        placeholder="Keyword"
        style={{ width: 200 }}
        value={filters.keyword}
        onChange={(e) =>
          setFilters({
            ...filters,
            keyword: e.target.value,
          })
        }
      />

      <Button type="primary" onClick={onSearch}>
        Search
      </Button>
    </Space>
  );
}