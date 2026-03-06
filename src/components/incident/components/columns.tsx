import { Column } from "@/components/ui/Table";
import type { Incident } from "@/interface/incident";

export function getIncidentColumns(): Column<Incident>[] {
  return [
    {
      key: "incidentCode",
      title: "Incident Code",
      render: (i) => (
        <span className="font-medium text-gray-900">
          {i.incidentCode}
        </span>
      ),
    },
    {
      key: "warehouse",
      title: "Warehouse",
      render: (i) => i.warehouseId ?? "-",
    },
    {
      key: "severity",
      title: "Severity",
      align: "center",
      render: (i) => (
        <span className="px-2 py-0.5 text-xs bg-orange-50 text-orange-700 rounded-full">
          {i.severity}
        </span>
      ),
    },
    {
      key: "status",
      title: "Status",
      align: "center",
      render: (i) => {
        const color =
          i.status === "APPROVED"
            ? "bg-green-50 text-green-700"
            : i.status === "REJECTED"
            ? "bg-red-50 text-red-700"
            : "bg-yellow-50 text-yellow-700";

        return (
          <span
            className={`px-2 py-0.5 text-xs rounded-full ${color}`}
          >
            {i.status}
          </span>
        );
      },
    },
    {
      key: "reportedBy",
      title: "Reported By",
      render: (i) => i.reportedByName || "-",
    },
    {
      key: "createdAt",
      title: "Created At",
      align: "center",
      render: (i) => (
        <span className="text-xs text-gray-700">
          {new Date(i.createdAt).toLocaleString()}
        </span>
      ),
    },
  ];
}