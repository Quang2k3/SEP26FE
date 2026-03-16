import { Column } from "@/components/ui/Table";
import type { ReceivingOrder } from "@/interfaces/receiving";

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:            { label: "Nháp",            className: "bg-gray-100 text-gray-600" },
  PENDING_COUNT:    { label: "Chờ kiểm đếm",    className: "bg-indigo-50 text-indigo-700" },
  SUBMITTED:        { label: "Đã nộp",          className: "bg-blue-50 text-blue-700" },
  PENDING_INCIDENT: { label: "Có sự cố",        className: "bg-yellow-50 text-yellow-700" },
  QC_APPROVED:      { label: "QC Đạt",          className: "bg-purple-50 text-purple-700" },
  GRN_CREATED:      { label: "GRN Created",     className: "bg-orange-50 text-orange-700" },
  PENDING_APPROVAL: { label: "Chờ duyệt",       className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  GRN_APPROVED:     { label: "Đã duyệt",        className: "bg-green-50 text-green-700" },
  GRN_REJECTED:     { label: "Bị từ chối",      className: "bg-red-50 text-red-600" },
  POSTED:           { label: "Đã nhập kho",     className: "bg-blue-50 text-blue-700" },
};

// Style chung cho tất cả action button — gọn, đồng nhất
const BTN = "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap disabled:opacity-50";
const BTN_GHOST  = `${BTN} bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300`;
const BTN_BLUE   = `${BTN} bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100`;
const BTN_INDIGO = `${BTN} bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100`;
const BTN_PURPLE = `${BTN} bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100`;
const BTN_YELLOW = `${BTN} bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100`;

const BTN_GREEN = `${BTN} bg-green-50 border-green-200 text-green-700 hover:bg-green-100`;

interface Props {
  userRole: string;
  onDetail: (r: ReceivingOrder) => void;
  onSubmitConfirm: (r: ReceivingOrder) => void;
  onScan: (r: ReceivingOrder) => void;
  onGenerateGrn: (r: ReceivingOrder) => void;
  onSubmitGrn: (r: ReceivingOrder) => void;
  onViewIncident: (r: ReceivingOrder) => void;
  onDelete?: (r: ReceivingOrder) => void;
  loadingId: number | null;
  submitLoadingId: number | null;
}

const ICO = "material-symbols-outlined text-[13px]";

export function getReceivingColumns({
  userRole,
  onDetail,
  onSubmitConfirm,
  onScan,
  onGenerateGrn,
  onSubmitGrn,
  onViewIncident,
  onDelete,
  loadingId,
  submitLoadingId,
}: Props): Column<ReceivingOrder>[] {
  return [
    {
      key: "receivingCode",
      title: "Receipt Code",
      render: (r) => (
        <span className="font-mono font-semibold text-gray-900 text-xs">
          {r.receivingCode}
        </span>
      ),
    },
    {
      key: "supplier",
      title: "Supplier",
      render: (r) => (
        <span className="text-xs text-gray-700">{r.supplierName ?? "—"}</span>
      ),
    },
    {
      key: "qty",
      title: "Qty",
      align: "center",
      render: (r) => (
        <span className="text-xs font-semibold text-gray-900">{r.totalExpectedQty ?? 0}</span>
      ),
    },
    {
      key: "status",
      title: "Status",
      align: "center",
      render: (r) => {
        const badge = STATUS_BADGE[r.status] ?? { label: r.status, className: "bg-gray-100 text-gray-500" };
        return (
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "createdAt",
      title: "Created",
      align: "center",
      render: (r) => (
        <span className="text-[11px] text-gray-400">
          {new Date(r.createdAt).toLocaleDateString("vi-VN")}
        </span>
      ),
    },

    // ── Cột 1: Chi tiết ──────────────────────────────────
    {
      key: "col_detail",
      title: "Chi tiết",
      align: "center",
      render: (r) => (
        <div className="flex items-center gap-1">
          <button onClick={() => onDetail(r)} className={BTN_GHOST}>
            <span className={ICO}>{r.status === "DRAFT" ? "edit" : "visibility"}</span>
            {r.status === "DRAFT" ? "Sửa" : "Xem"}
          </button>
          {r.status === "DRAFT" && onDelete && (
            <button onClick={() => onDelete(r)}
              className={`${BTN} bg-red-50 border-red-100 text-red-400 hover:text-red-600 hover:bg-red-100`}
              title="Xóa phiếu nháp">
              <span className={ICO}>delete</span>
            </button>
          )}
        </div>
      ),
    },

    // ── Cột 2: Submit (DRAFT only) ───────────────────────
    {
      key: "col_submit",
      title: "Submit",
      align: "center",
      render: (r) => {
        if (r.status !== "DRAFT") return <span className="text-gray-200 text-xs">—</span>;
        const isLoading = submitLoadingId === r.receivingId;
        return (
          <button
            disabled={isLoading}
            onClick={() => onSubmitConfirm(r)}
            className={BTN_BLUE}
          >
            {isLoading
              ? <span className={`${ICO} animate-spin`}>progress_activity</span>
              : <span className={ICO}>send</span>
            }
            {isLoading ? "..." : "Submit"}
          </button>
        );
      },
    },

    // ── Cột 3: Action chính ──────────────────────────────
    {
      key: "col_action",
      title: "Action",
      align: "center",
      render: (r) => {
        const isLoading = loadingId === r.receivingId;

        if (userRole === "KEEPER") {
          if (r.status === "PENDING_COUNT") {
            return (
              <button onClick={() => onScan(r)} className={BTN_INDIGO}>
                <span className={ICO}>qr_code_scanner</span>
                Scan
              </button>
            );
          }
          if (r.status === "SUBMITTED") {
            return (
              <span className={`${BTN} bg-blue-50 border-blue-200 text-blue-600 cursor-default opacity-80`}>
                <span className={ICO}>send</span>
                Đã gửi QC
              </span>
            );
          }
          if (r.status === "QC_APPROVED") {
            return (
              <button disabled={isLoading} onClick={() => onGenerateGrn(r)} className={BTN_PURPLE}>
                <span className={ICO}>receipt_long</span>
                {isLoading ? "..." : "Gen GRN"}
              </button>
            );
          }
          if (r.status === "GRN_CREATED") {
            return (
              <button onClick={() => onSubmitGrn(r)} className={BTN_GREEN}>
                <span className={ICO}>send</span>
                Gửi Manager
              </button>
            );
          }
          if (r.status === "PENDING_APPROVAL") {
            return (
              <span className={`${BTN} bg-amber-50 border-amber-200 text-amber-700 cursor-default opacity-80`}>
                <span className={ICO}>hourglass_top</span>
                Đang chờ duyệt
              </span>
            );
          }
          if (r.status === "GRN_REJECTED") {
            return (
              <div className="flex items-center gap-1">
                <button onClick={() => onDetail(r)}
                  className={`${BTN} bg-red-50 border-red-200 text-red-600 hover:bg-red-100`}
                  title="Xem lý do từ chối">
                  <span className={ICO}>info</span>
                  Lý do
                </button>
                <button onClick={() => onSubmitGrn(r)}
                  className={`${BTN} bg-orange-50 border-orange-200 text-orange-600 hover:bg-orange-100`}>
                  <span className={ICO}>refresh</span>
                  Gửi lại
                </button>
              </div>
            );
          }
          if (r.status === "PENDING_INCIDENT") {
            return (
              <button onClick={() => onViewIncident(r)}
                className={`${BTN} bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100`}>
                <span className={ICO}>warning</span>
                Xem sự cố
              </button>
            );
          }
          if (r.status === "GRN_APPROVED" || r.status === "POSTED") {
            return (
              <span className={`${BTN} bg-green-50 border-green-200 text-green-700 cursor-default opacity-80`}>
                <span className={ICO}>check_circle</span>
                {r.status === "POSTED" ? "Đã nhập kho" : "Đã duyệt"}
              </span>
            );
          }
        }

        if (userRole === "QC" && (r.status === "SUBMITTED" || r.status === "PENDING_INCIDENT")) {
          return (
            <button onClick={() => onScan(r)} className={BTN_YELLOW}>
              <span className={ICO}>{r.status === "PENDING_INCIDENT" ? "warning" : "verified"}</span>
              {r.status === "PENDING_INCIDENT" ? "Xử lý sự cố" : "QC Scan"}
            </button>
          );
        }

        return <span className="text-gray-200 text-xs">—</span>;
      },
    },
  ];
}