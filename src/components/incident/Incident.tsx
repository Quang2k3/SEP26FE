import { Column } from "@/components/ui/Table";
import type { Incident } from "@/interface/incident";

export function getIncidentColumns(
  handleStartUnload: (incident: Incident) => void,
): Column<Incident>[] {
  return [
    {
      key: "incidentCode",
      title: "Incident Code",
      render: (i) => i.incidentCode,
    },
    {
      key: "warehouse",
      title: "Warehouse",
      render: (i) => i.warehouseId,
    },
    {
      key: "status",
      title: "Status",
      render: (i) => i.status,
    },

    {
      key: "action",
      title: "Action",
      align: "center",
      render: (i) => (
        <button
          onClick={() => handleStartUnload(i)}
          disabled={i.status !== "SUBMITTED"}
          className={`px-3 py-1.5 text-sm rounded-md text-white ${
            i.status === "SUBMITTED"
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-gray-300 cursor-not-allowed"
          }`}
        >
          Bắt đầu dỡ hàng
        </button>
      ),
    },
  ];
}
