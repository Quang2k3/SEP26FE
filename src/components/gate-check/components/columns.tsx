import { Column } from "@/components/ui/Table";
import type { ReceivingOrder } from "@/interfaces/receiving";
import { Button } from "antd";

export function getReceivingColumns(
  onStartUnload: (receiving: ReceivingOrder) => void,
): Column<ReceivingOrder>[] {
  return [
    {
      key: "receivingCode",
      title: "Receiving Code",
      render: (r) => (
        <span className="font-medium text-gray-900">{r.receivingCode}</span>
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
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    {
      key: "action",
      title: "Action",
      align: "center",
      render: (r) => {
        // Chỉ cho "Bắt đầu dỡ hàng" khi đơn đang SUBMITTED (chờ QC)
      const disabled = r.status !== "SUBMITTED";

        return (
          <Button
            type="primary"
            disabled={disabled}
            onClick={() => onStartUnload(r)}
          >
            Bắt đầu dỡ hàng
          </Button>
        );
      },
    },
  ];
}
