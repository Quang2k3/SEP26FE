import { Switch, Tag } from "antd";
import type { Location } from "@/interfaces/location";
import { ColumnsType } from "antd/es/table";
import toast from "react-hot-toast";
import { deactivateLocation } from "@/services/locationService";

export function getLocationColumns(reload: () => void): ColumnsType<Location> {
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
      dataIndex: "active",
      render: (value: boolean, record: Location) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <Switch
            checked={value}
            disabled={!value}
            onChange={async (checked) => {
              if (!checked) {
                try {
                  await deactivateLocation(record.locationId);
                  toast.success("Đã vô hiệu hóa location");
                  reload();
                } catch {
                  toast.error("Vô hiệu hóa thất bại");
                }
              }
            }}
          />
        </div>
      ),
    },
    {
      title: "Updated",
      key: "updatedAt",
      render: (_, r) => new Date(r.updatedAt).toLocaleString(),
    },
  ];
}
