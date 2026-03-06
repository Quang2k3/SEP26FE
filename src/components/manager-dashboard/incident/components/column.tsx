import { Column } from "@/components/ui/Table";
import type { Incident } from "@/interfaces/incident";
import { Button, Space } from "antd";

export function getIncidentColumns(
  onApprove: (incident: Incident) => void,
  onReject: (incident: Incident) => void,
): Column<Incident>[] {
  return [
    {
      key: "incidentCode",
      title: "Incident Code",
      render: (r) => (
        <span className="font-medium text-gray-900">{r.incidentCode}</span>
      ),
    },
    {
      key: "description",
      title: "Description",
      render: (r) => r.description,
    },
    {
      key: "createdAt",
      title: "Created At",
      align: "center",
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (r) => (
        <Space>
          <Button
            type="primary"
            onClick={() => onApprove(r)}
            className="bg-green-600 hover:bg-green-700"
          >
            Duyệt
          </Button>

          <Button
            danger
            onClick={() => onReject(r)}
          >
            Từ chối
          </Button>
        </Space>
      ),
    },
  ];
}