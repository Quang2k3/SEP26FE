"use client";

import React, { useEffect, useState } from "react";
import { Table, Card, Button } from "antd";

import { fetchLocations } from "@/services/locationService";
import { fetchZones } from "@/services/zoneService";

import { Location, LocationPage as LocationPageType, LocationQueryParams } from "@/interfaces/location";
import { Zone } from "@/interfaces/zone";

import LocationFilters from "./components/LocationFilters";
import { getLocationColumns } from "./components/colums";
import { AdminPage } from "../layout/AdminPage";

const DEFAULT_PAGE_SIZE = 20;

export default function LocationListPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);

  const [pageInfo, setPageInfo] = useState<Omit<LocationPageType, "content">>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
    totalElements: 0,
    totalPages: 0,
    last: true,
  });

  const [filters, setFilters] = useState<LocationQueryParams>({
    page: 0,
    size: DEFAULT_PAGE_SIZE,
  });

  const loadLocations = async (override?: Partial<LocationQueryParams>) => {
    const params = { ...filters, ...override };

    setLoading(true);

    try {
      const result = await fetchLocations(params);

      setLocations(result.content);

      setPageInfo({
        page: result.page,
        size: result.size,
        totalElements: result.totalElements,
        totalPages: result.totalPages,
        last: result.last,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLocations();
    fetchZones(true).then(setZones);
  }, []);

  const columns = getLocationColumns();

  return (
    <AdminPage
      title="Locations"
      description="Manage warehouse locations"
      actions={<Button type="primary">Create Location</Button>}
    >
      <Card title="Location Filters" style={{ marginBottom: 16 }}>
        <LocationFilters
          filters={filters}
          zones={zones}
          setFilters={setFilters}
          onSearch={() => loadLocations({ page: 0 })}
        />
      </Card>

      <Card>
        <Table
          rowKey="locationId"
          loading={loading}
          columns={columns}
          dataSource={locations}
          pagination={{
            current: pageInfo.page + 1,
            pageSize: pageInfo.size,
            total: pageInfo.totalElements,
            onChange: (page, size) =>
              loadLocations({ page: page - 1, size }),
          }}
        />
      </Card>
    </AdminPage>
  );
}