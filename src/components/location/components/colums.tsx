import { Tag } from "antd";
import type { Location } from "@/interfaces/location";
import { ColumnsType } from "antd/es/table";

export function getLocationColumns(): ColumnsType<Location> {
  return [
    {
      title: "Location Code",
      dataIndex: "locationCode",
      key: "locationCode",
      render: (value: string) => (
        <span className="font-semibold text-blue-600">{value}</span>
      ),
    },
    {
      title: "Zone",
      key: "zone",
      render: (_, r) => `${r.zoneCode} (#${r.zoneId})`,
    },
    {
      title: "Type",
      dataIndex: "locationType",
      key: "locationType",
    },
    {
      title: "Max Weight",
      dataIndex: "maxWeightKg",
      key: "maxWeightKg",
    },
    {
      title: "Max Volume",
      dataIndex: "maxVolumeM3",
      key: "maxVolumeM3",
    },
    {
      title: "Picking Face",
      key: "isPickingFace",
      render: (_, r) =>
        r.isPickingFace ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: "Staging",
      key: "isStaging",
      render: (_, r) =>
        r.isStaging ? <Tag color="blue">Yes</Tag> : <Tag>No</Tag>,
    },
    {
      title: "Active",
      key: "active",
      render: (_, r) =>
        r.active ? (
          <Tag color="green">Active</Tag>
        ) : (
          <Tag color="red">Inactive</Tag>
        ),
    },
    {
      title: "Updated",
      key: "updatedAt",
      render: (_, r) => new Date(r.updatedAt).toLocaleString(),
    },
  ];
}