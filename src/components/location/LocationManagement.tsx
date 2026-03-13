"use client";

import React, { useEffect, useState } from "react";
import {
  Modal,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Card,
  Table,
} from "antd";

import {
  createLocation,
  fetchLocations,
  updateLocation,
} from "@/services/locationService";
import { fetchZones } from "@/services/zoneService";

import {
  Location,
  LocationPage as LocationPageType,
  LocationQueryParams,
  CreateLocationRequest,
  UpdateLocationRequest,
} from "@/interfaces/location";
import { Zone } from "@/interfaces/zone";

import LocationFilters from "./components/LocationFilters";
import { getLocationColumns } from "./components/colums";
import { AdminPage } from "../layout/AdminPage";
import toast from "react-hot-toast";

import { getStoredSession } from "@/services/authService";

const DEFAULT_PAGE_SIZE = 20;

export default function LocationListPage() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);

  const session = getStoredSession();
  const warehouseId = session?.user?.warehouseIds?.[0];
  const [allLocations, setAllLocations] = useState<Location[]>([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null,
  );
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
    const params = {
      ...filters,
      ...override,
    };

    setFilters(params);

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

  const handleCreate = async (values: CreateLocationRequest) => {
    try {
      await createLocation(values);

      toast.success("Location created");

      setIsCreateOpen(false);

      loadLocations(); // reload table
    } catch (error) {
      toast.error("Create location failed");
    }
  };

  const handleUpdate = async (values: UpdateLocationRequest) => {
    if (!selectedLocation) return;

    try {
      await updateLocation(selectedLocation.locationId, values);

      toast.success("Location updated");

      setSelectedLocation(null);

      loadLocations(); // reload table
    } catch (error) {
      toast.error("Update location failed");
    }
  };

  useEffect(() => {
    loadLocations();

    fetchZones({ activeOnly: true, warehouseId }).then((data) =>
      setZones(data),
    );

    fetchLocations({ page: 0, size: 1000 }).then((data) =>
      setAllLocations(data.content),
    );
  }, []);
  const columns = getLocationColumns(loadLocations);

  return (
    <AdminPage
      title="Locations"
      description="Manage warehouse locations"
      actions={
        <Button type="primary" onClick={() => setIsCreateOpen(true)}>
          Create Location
        </Button>
      }
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
          onRow={(record) => ({
            onClick: () => setSelectedLocation(record),
          })}
          loading={loading}
          columns={columns}
          dataSource={locations}
          pagination={{
            current: pageInfo.page + 1,
            pageSize: pageInfo.size,
            total: pageInfo.totalElements,
            onChange: (page, size) => loadLocations({ page: page - 1, size }),
          }}
        />
      </Card>
      {/* Create Modal */}
      <Modal
        title="Create Location"
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        footer={null}
      >
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Zone" name="zoneId" rules={[{ required: true }]}>
            <Select
              options={zones.map((z) => ({
                value: z.zoneId,
                label: z.zoneName,
              }))}
            />
          </Form.Item>

          <Form.Item
            label="Location Code"
            name="locationCode"
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            label="Location Type"
            name="locationType"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: "AISLE", label: "AISLE" },
                { value: "RACK", label: "RACK" },
                { value: "BIN", label: "BIN" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Parent Location" name="parentLocationId">
            <Select
              allowClear
              showSearch
              placeholder="Select parent location"
              options={allLocations.map((l) => ({
                value: l.locationId,
                label: l.locationCode,
              }))}
            />
          </Form.Item>

          <Form.Item label="Max Weight (Kg)" name="maxWeightKg">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item label="Max Volume (M3)" name="maxVolumeM3">
            <InputNumber style={{ width: "100%" }} />
          </Form.Item>

          <Form.Item
            label="Picking Face"
            name="isPickingFace"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item label="Staging" name="isStaging" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Button type="primary" htmlType="submit">
            Create
          </Button>
        </Form>
      </Modal>
      <Modal
        title="Location Detail"
        open={!!selectedLocation}
        onCancel={() => setSelectedLocation(null)}
        footer={null}
      >
        {selectedLocation && (
          <Form
            layout="vertical"
            initialValues={selectedLocation}
            onFinish={handleUpdate}
          >
            <Form.Item label="Location Code">
              <Input value={selectedLocation.locationCode} disabled />
            </Form.Item>

            <Form.Item label="Max Weight" name="maxWeightKg">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item label="Max Volume" name="maxVolumeM3">
              <InputNumber style={{ width: "100%" }} />
            </Form.Item>

            <Form.Item
              label="Picking Face"
              name="isPickingFace"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item label="Staging" name="isStaging" valuePropName="checked">
              <Switch />
            </Form.Item>

            <Button type="primary" htmlType="submit">
              Update
            </Button>
          </Form>
        )}
      </Modal>
    </AdminPage>
  );
}
