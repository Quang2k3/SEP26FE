import { Column } from "@/components/ui/Table";
import type { ReceivingOrder, ReceivingStatus } from "@/interfaces/receiving";

const STATUS_BADGE: Record<
  ReceivingStatus,
  { label: string; className: string }
> = {
  DRAFT: { label: "Draft", className: "bg-gray-100 text-gray-600" },
  SUBMITTED: { label: "Submitted", className: "bg-blue-50 text-blue-700" },
  PENDING_INCIDENT: {
    label: "Pending Incident",
    className: "bg-yellow-50 text-yellow-700",
  },
  QC_APPROVED: {
    label: "QC Approved",
    className: "bg-purple-50 text-purple-700",
  },
  GRN_CREATED: {
    label: "GRN Created",
    className: "bg-orange-50 text-orange-700",
  },
  POSTED: { label: "Posted", className: "bg-green-50 text-green-700" },
};

interface Props {
  onScan: (r: ReceivingOrder) => void;
  onGenerateGrn: (r: ReceivingOrder) => void;
  loadingId: number | null;
}

export function getReceivingColumns({
  onScan,
  onGenerateGrn,
  loadingId,
}: Props): Column<ReceivingOrder>[] {
  return [
    {
      key: "receivingCode",
      title: "Mã phiếu",
      render: (r) => (
        <span className="font-mono font-semibold text-gray-900 text-xs">
          {r.receivingCode}
        </span>
      ),
    },
    {
      key: "warehouse",
      title: "Kho nhận",
      render: (r) => (
        <span className="text-sm text-gray-700">{r.warehouseName ?? "—"}</span>
      ),
    },
    {
      key: "supplier",
      title: "Nhà cung cấp",
      render: (r) => (
        <span className="text-sm text-gray-700">{r.supplierName ?? "—"}</span>
      ),
    },
    {
      key: "qty",
      title: "Dự kiến",
      align: "center",
      render: (r) => (
        <span className="text-sm font-medium">{r.totalExpectedQty ?? 0}</span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      align: "center",
      render: (r) => {
        const badge = STATUS_BADGE[r.status] ?? {
          label: r.status,
          className: "bg-gray-100 text-gray-600",
        };
        return (
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${badge.className}`}
          >
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "Ngày tạo",
      align: "center",
      render: (r) => (
        <span className="text-xs text-gray-500">
          {new Date(r.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      align: "center",
      render: (r) => {
        const isLoading = loadingId === r.receivingId;

        // DRAFT → cho Scan hàng luôn
        if (r.status === "DRAFT") {
          return (
            <button
              onClick={() => onScan(r)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                qr_code_scanner
              </span>
              Scan hàng
            </button>
          );
        }

        // SUBMITTED → cho Scan hàng
        if (r.status === "SUBMITTED") {
          return (
            <button
              onClick={() => onScan(r)}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">
                qr_code_scanner
              </span>
              Scan hàng
            </button>
          );
        }

        // PENDING_INCIDENT → chờ xử lý
        if (r.status === "PENDING_INCIDENT") {
          return (
            <span className="text-xs text-yellow-600 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">warning</span>
              Chờ xử lý sự cố
            </span>
          );
        }

        // QC_APPROVED → tạo GRN
        if (r.status === "QC_APPROVED") {
          return (
            <button
              disabled={isLoading}
              onClick={() => onGenerateGrn(r)}
              className="px-3 py-1.5 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-md disabled:opacity-60 transition-colors"
            >
              {isLoading ? "..." : "Tạo GRN"}
            </button>
          );
        }

        // GRN_CREATED → chờ manager
        if (r.status === "GRN_CREATED") {
          return (
            <span className="text-xs text-orange-600 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                schedule
              </span>
              Chờ Manager duyệt
            </span>
          );
        }

        // POSTED → xong
        if (r.status === "POSTED") {
          return (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">
                check_circle
              </span>
              Hoàn thành
            </span>
          );
        }

        return null;
      },
    },
  ];
}
