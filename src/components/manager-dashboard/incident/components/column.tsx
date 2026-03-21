import { Column } from "@/components/ui/Table";
import type { Incident } from "@/interfaces/incident";
import { Button, Space } from "antd";

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  SHORTAGE:        { label: "Thiếu",       cls: "bg-red-50 text-red-600 border-red-200" },
  OVERAGE:         { label: "Thừa",        cls: "bg-orange-50 text-orange-600 border-orange-200" },
  UNEXPECTED_ITEM: { label: "Ngoài phiếu", cls: "bg-amber-50 text-amber-600 border-amber-200" },
  DAMAGE:          { label: "Hư hỏng",     cls: "bg-purple-50 text-purple-600 border-purple-200" },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  OPEN:      { label: "Đang chờ",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED:  { label: "Đã duyệt",  cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED:  { label: "Từ chối",    cls: "bg-red-50 text-red-700 border-red-200" },
  RESOLVED:  { label: "Đã xử lý",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  // [BUG-FIX] Trạng thái CANCELLED: tự động huỷ khi Manager xử lý incident trùng lặp
  CANCELLED: { label: "Đã huỷ",    cls: "bg-gray-50 text-gray-500 border-gray-200" },
};

export function getIncidentColumns(
  onDetail: (incident: Incident) => void,
  onApprove: (incident: Incident) => void,
  onReject: (incident: Incident) => void,
  isManager: boolean,
): Column<Incident>[] {
  return [
    {
      key: "incidentCode",
      title: "Mã sự cố",
      render: (r) => (
        <button
          onClick={() => onDetail(r)}
          className="font-mono font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer bg-transparent border-none p-0 text-left"
        >
          {r.incidentCode}
        </button>
      ),
    },
    {
      key: "receivingCode",
      title: "Phiếu nhận",
      render: (r) => (
        <span className="text-xs font-medium text-gray-600">{r.receivingCode ?? "—"}</span>
      ),
    },
    {
      key: "incidentType",
      title: "Loại",
      align: "center",
      render: (r) => {
        const badge = TYPE_BADGE[r.incidentType] ?? { label: r.incidentType, cls: "bg-gray-50 text-gray-600 border-gray-200" };
        return (
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.cls}`}>
            {badge.label}
          </span>
        );
      },
    },
    {
      key: "description",
      title: "Mô tả",
      render: (r) => (
        <span className="text-xs text-gray-600 line-clamp-2">{r.description}</span>
      ),
    },
    {
      key: "status",
      title: "Trạng thái",
      align: "center",
      render: (r) => {
        const badge = STATUS_BADGE[r.status] ?? { label: r.status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
        return (
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${badge.cls}`}>
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
        <span className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleString("vi-VN")}</span>
      ),
    },
    {
      key: "action",
      title: "Thao tác",
      align: "center",
      render: (r) => {
        const disabled = r.status !== "OPEN";

        return (
          <Space>
            <Button
              size="small"
              onClick={() => onDetail(r)}
              className="!text-blue-600 !border-blue-200 hover:!bg-blue-50"
            >
              Chi tiết
            </Button>

            {isManager && !disabled && (
              <>
                <Button
                  type="primary"
                  size="small"
                  disabled={disabled}
                  onClick={() => onApprove(r)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Duyệt
                </Button>

                <Button danger size="small" disabled={disabled} onClick={() => onReject(r)}>
                  Từ chối
                </Button>
              </>
            )}
          </Space>
        );
      },
    },
  ];
}