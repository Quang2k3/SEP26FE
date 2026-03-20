import { Column } from "@/components/ui/Table";
import type { ReceivingOrder } from "@/interfaces/receiving";

export const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  DRAFT:            { label: "Nháp",            className: "bg-gray-100 text-gray-600" },
  SUBMITTED:        { label: "Đang nhận hàng",   className: "bg-cyan-50 text-cyan-700" },
  PENDING_COUNT:    { label: "Chờ kiểm đếm",    className: "bg-indigo-50 text-indigo-700" },
  PENDING_INCIDENT: { label: "Có sự cố",        className: "bg-yellow-50 text-yellow-700" },
  QC_APPROVED:      { label: "QC Đạt",          className: "bg-purple-50 text-purple-700" },
  GRN_CREATED:      { label: "Đã tạo GRN",      className: "bg-orange-50 text-orange-700" },
  PENDING_APPROVAL: { label: "Chờ duyệt",       className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  GRN_APPROVED:     { label: "Đã duyệt",        className: "bg-green-50 text-green-700" },
  GRN_REJECTED:     { label: "Bị từ chối",      className: "bg-red-50 text-red-600" },
  POSTED:           { label: "Đã nhập kho",     className: "bg-blue-50 text-blue-700" },
  KEEPER_RESCAN:    { label: "Yêu cầu quét lại", className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
};

const BTN = "inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap disabled:opacity-50";
const BTN_GHOST  = `${BTN} bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300`;
const BTN_BLUE   = `${BTN} bg-blue-600 border-blue-600 text-white hover:bg-blue-700 font-semibold`;
const BTN_INDIGO = `${BTN} bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 font-semibold`;
const BTN_PURPLE = `${BTN} bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100`;
const BTN_GREEN  = `${BTN} bg-green-50 border-green-200 text-green-700 hover:bg-green-100`;

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
  detailLoadingId?: number | null;
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
  detailLoadingId,
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

    // ── Cột Chi tiết ──────────────────────────────────────
    // DRAFT: nút Sửa + nút Xóa (modal confirm)
    // Các trạng thái khác: nút Xem
    {
      key: "col_detail",
      title: "Chi tiết",
      align: "center",
      render: (r) => {
        const isDetailLoading = detailLoadingId === r.receivingId;
        return (
          <div className="flex items-center gap-1">
            <button onClick={() => onDetail(r)} disabled={isDetailLoading} className={BTN_GHOST}>
              {isDetailLoading
                ? <span className={`${ICO} animate-spin`}>progress_activity</span>
                : <span className={ICO}>{r.status === "DRAFT" ? "edit" : "visibility"}</span>
              }
              {r.status === "DRAFT" ? "Sửa" : "Xem"}
            </button>
            {r.status === "DRAFT" && onDelete && (
              <button
                onClick={() => onDelete(r)}
                className={`${BTN} bg-red-50 border-red-100 text-red-400 hover:text-red-600 hover:bg-red-100`}
                title="Xóa phiếu nháp"
              >
                <span className={ICO}>delete</span>
              </button>
            )}
          </div>
        );
      },
    },

    // ── Cột Action ────────────────────────────────────────
    //
    // FLOW ĐÚNG cho Keeper (inbound):
    //   DRAFT         → nút "Xác nhận nhận hàng" → SUBMITTED (Đang nhận hàng)
    //   SUBMITTED     → nút "Quét QR" (scan QR) → sau finalize → PENDING_COUNT (Chờ kiểm đếm)
    //   PENDING_COUNT → "Chờ kiểm đếm" (lock, QC đang scan)
    //   QC_APPROVED   → "Gen GRN"
    //   GRN_CREATED   → "Gửi Manager"
    //
    {
      key: "col_action",
      title: "Action",
      align: "center",
      render: (r) => {
        const isGrnLoading = loadingId === r.receivingId;
        const isSubmitLoading = submitLoadingId === r.receivingId;

        if (userRole === "KEEPER") {

          // DRAFT: nút Submit với modal xác nhận
          if (r.status === "DRAFT") {
            return (
              <button
                onClick={() => onSubmitConfirm(r)}
                disabled={isSubmitLoading}
                className={BTN_BLUE}
              >
                {isSubmitLoading
                  ? <span className={`${ICO} animate-spin`}>progress_activity</span>
                  : <span className={ICO}>send</span>
                }
                {isSubmitLoading ? "Đang xử lý..." : "Submit"}
              </button>
            );
          }

          // SUBMITTED hoặc KEEPER_RESCAN: Keeper được phép quét QR
          if (r.status === "SUBMITTED" || r.status === "KEEPER_RESCAN") {
            return (
              <button onClick={() => onScan(r)} className={r.status === "KEEPER_RESCAN"
                ? `${BTN} bg-orange-600 border-orange-600 text-white hover:bg-orange-700 font-semibold`
                : BTN_INDIGO}>
                <span className={ICO}>{r.status === "KEEPER_RESCAN" ? "refresh" : "qr_code_scanner"}</span>
                {r.status === "KEEPER_RESCAN" ? "Quét lại" : "Quét QR"}
              </button>
            );
          }

          // PENDING_COUNT: đang chờ QC kiểm đếm, không làm gì được
          if (r.status === "PENDING_COUNT") {
            return (
              <span className={`${BTN} bg-indigo-50 border-indigo-200 text-indigo-500 cursor-not-allowed opacity-70`}>
                <span className={ICO}>hourglass_top</span>
                Chờ kiểm đếm
              </span>
            );
          }

          if (r.status === "QC_APPROVED") {
            return (
              <button disabled={isGrnLoading} onClick={() => onGenerateGrn(r)} className={BTN_PURPLE}>
                <span className={ICO}>receipt_long</span>
                {isGrnLoading ? "..." : "Gen GRN"}
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

        // QC scan ở PENDING_COUNT / SUBMITTED / PENDING_INCIDENT
        if (userRole === "QC" && (
          r.status === "PENDING_COUNT" ||
          r.status === "SUBMITTED" ||
          r.status === "PENDING_INCIDENT"
        )) {
          return (
            <button onClick={() => onScan(r)}
              className={`${BTN} bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100`}>
              <span className={ICO}>
                {r.status === "PENDING_INCIDENT" ? "warning" : "verified"}
              </span>
              {r.status === "PENDING_INCIDENT" ? "Xử lý sự cố" : "QC Scan"}
            </button>
          );
        }

        return <span className="text-gray-200 text-xs">—</span>;
      },
    },
  ];
}
