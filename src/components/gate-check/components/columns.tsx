import { Column } from "@/components/ui/Table";
import type { ReceivingOrder } from "@/interface/receiving";
import { Button } from "antd";

export function getReceivingColumns(
  onStartUnload: (receiving: ReceivingOrder) => void
): Column<ReceivingOrder>[] {
  return [
    {
      key: "receivingCode",
      title: "Receiving Code",
      render: (r) => (
        <span className="font-medium text-gray-900">
          {r.receivingCode}
        </span>
      ),
    },

    {
      key: "warehouse",
      title: "Warehouse",
      render: (r) => r.warehouseName,
    },

    {
      key: "supplier",
      title: "Supplier",
      render: (r) => r.supplierName,
    },

    {
      key: "totalQty",
      title: "Total Qty",
      align: "center",
      render: (r) => r.totalQty,
    },

    {
      key: "createdAt",
      title: "Created At",
      align: "center",
      render: (r) =>
        new Date(r.createdAt).toLocaleString(),
    },

    {
      key: "action",
      title: "Action",
      align: "center",
      render: (r) => (
        <Button
        type="primary"
          onClick={() => onStartUnload(r)}
          className="px-3 py-1.5 text-sm rounded-md font-medium bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
        >
          Bắt đầu dỡ hàng
        </Button>
      ),
    },
  ];
}