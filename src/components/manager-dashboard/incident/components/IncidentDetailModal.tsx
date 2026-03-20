"use client";

import { useState, useEffect } from "react";
import { Modal, Spin } from "antd";
import toast from "react-hot-toast";
import { getIncidentDetail, resolveDiscrepancy } from "@/services/incidentService";
import type { Incident, IncidentItem } from "@/interfaces/incident";

interface Props {
  incident: Incident;
  isManager: boolean;
  onClose: () => void;
  onResolved: () => void;
}

const REASON_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  SHORTAGE:        { label: "Thiếu",       color: "text-red-700",    bg: "bg-red-50 border-red-200" },
  OVERAGE:         { label: "Thừa",        color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
  UNEXPECTED_ITEM: { label: "Ngoài phiếu", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
};

const ACTIONS_BY_REASON: Record<string, { value: string; label: string; icon: string }[]> = {
  SHORTAGE: [
    { value: "CLOSE_SHORT",   label: "Chốt thiếu",  icon: "check_circle" },
    { value: "WAIT_BACKORDER", label: "Chờ giao bù", icon: "schedule" },
  ],
  OVERAGE: [
    { value: "ACCEPT", label: "Nhập kho",  icon: "add_circle" },
    { value: "RETURN", label: "Trả NCC",   icon: "undo" },
  ],
  UNEXPECTED_ITEM: [
    { value: "ACCEPT", label: "Nhập kho",  icon: "add_circle" },
    { value: "RETURN", label: "Trả NCC",   icon: "undo" },
  ],
};

export default function IncidentDetailModal({ incident, isManager, onClose, onResolved }: Props) {
  const [detail, setDetail] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actions, setActions] = useState<Record<number, string>>({});
  const [note, setNote] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const d = await getIncidentDetail(incident.incidentId);
        setDetail(d);
        // Default action cho mỗi item
        const defaults: Record<number, string> = {};
        for (const item of d.items ?? []) {
          const available = ACTIONS_BY_REASON[item.reasonCode];
          if (available?.[0]) defaults[item.incidentItemId] = available[0].value;
        }
        setActions(defaults);
      } catch {
        toast.error("Không tải được chi tiết incident");
      } finally {
        setLoading(false);
      }
    })();
  }, [incident.incidentId]);

  const handleResolve = async () => {
    if (!detail?.items?.length) return;
    const itemResolutions = detail.items.map((item) => ({
      incidentItemId: item.incidentItemId,
      action: actions[item.incidentItemId] ?? "",
    }));
    if (itemResolutions.some((r) => !r.action)) {
      toast.error("Vui lòng chọn hành động cho tất cả SKU");
      return;
    }
    setSubmitting(true);
    try {
      await resolveDiscrepancy(incident.incidentId, itemResolutions, note || undefined);
      toast.success("Đã duyệt xử lý thành công!");
      onResolved();
    } catch {
      toast.error("Lỗi khi duyệt xử lý");
    } finally {
      setSubmitting(false);
    }
  };

  const items = detail?.items ?? [];
  const isResolved = detail?.status === "RESOLVED";
  const canResolve = isManager && detail?.status === "OPEN" && items.length > 0;

  return (
    <Modal
      open
      onCancel={onClose}
      footer={null}
      width={720}
      title={null}
      centered
      styles={{ body: { padding: 0 } }}
    >
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spin size="large" />
        </div>
      ) : (
        <div>
          {/* ── Header ── */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">report</span>
                  {detail?.incidentCode}
                </h2>
                <p className="text-xs text-gray-500 mt-1">{detail?.description}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={detail?.status ?? "OPEN"} />
                <TypeBadge type={detail?.incidentType ?? ""} />
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              <span>📋 Phiếu: <strong className="text-gray-700">{detail?.receivingCode ?? "—"}</strong></span>
              <span>👤 Báo cáo: <strong className="text-gray-700">{detail?.reportedByName ?? "—"}</strong></span>
              <span>🕐 {detail?.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}</span>
            </div>
          </div>

          {/* ── SKU Table ── */}
          <div className="px-6 py-4">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Chi tiết sản phẩm — {items.length} SKU
            </p>
            {items.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Không có dữ liệu chi tiết</p>
            ) : (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                {/* Table header */}
                <div
                  className="grid bg-gray-50 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100"
                  style={{ gridTemplateColumns: "1fr 4.5rem 4.5rem 7rem" + (canResolve ? " 10rem" : "") }}
                >
                  <span>SKU</span>
                  <span className="text-center">Dự kiến</span>
                  <span className="text-center">Thực nhận</span>
                  <span className="text-center">Loại</span>
                  {canResolve && <span className="text-center">Hành động</span>}
                </div>

                {/* Table body */}
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {items.map((item) => (
                    <SkuRow
                      key={item.incidentItemId}
                      item={item}
                      canResolve={canResolve}
                      selectedAction={actions[item.incidentItemId] ?? ""}
                      onActionChange={(action) =>
                        setActions((prev) => ({ ...prev, [item.incidentItemId]: action }))
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── Manager Resolution Footer ── */}
          {canResolve && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú của Manager (tùy chọn)..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                rows={2}
              />
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Đóng
                </button>
                <button
                  onClick={handleResolve}
                  disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">task_alt</span>
                      Xác nhận duyệt
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Non-Manager or already resolved → simple close ── */}
          {!canResolve && (
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Đóng
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/* ── Sub-components ── */

function SkuRow({
  item,
  canResolve,
  selectedAction,
  onActionChange,
}: {
  item: IncidentItem;
  canResolve: boolean;
  selectedAction: string;
  onActionChange: (action: string) => void;
}) {
  const reason = REASON_LABEL[item.reasonCode] ?? { label: item.reasonCode, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const diff = item.actualQty - item.expectedQty;
  const availableActions = ACTIONS_BY_REASON[item.reasonCode] ?? [];

  return (
    <div
      className="grid items-center px-4 py-3 hover:bg-gray-50/50 transition-colors"
      style={{ gridTemplateColumns: "1fr 4.5rem 4.5rem 7rem" + (canResolve ? " 10rem" : "") }}
    >
      {/* SKU info */}
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-800 font-mono truncate">{item.skuCode}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.skuName}</p>
      </div>

      {/* Expected */}
      <span className="text-center text-xs text-gray-500 tabular-nums">{item.expectedQty}</span>

      {/* Actual */}
      <span className={`text-center text-xs font-bold tabular-nums ${reason.color}`}>
        {item.actualQty}
      </span>

      {/* Reason badge */}
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${reason.bg} ${reason.color}`}>
          {item.reasonCode === "SHORTAGE" && "🔴"}
          {item.reasonCode === "OVERAGE" && "🟡"}
          {item.reasonCode === "UNEXPECTED_ITEM" && "⚠️"}
          {reason.label}
          <span className="font-mono">
            {diff > 0 ? `+${diff}` : diff < 0 ? `${diff}` : ""}
          </span>
        </span>
      </div>

      {/* Action selector (Manager only) */}
      {canResolve && (
        <div className="flex justify-center">
          <select
            value={selectedAction}
            onChange={(e) => onActionChange(e.target.value)}
            className="text-[11px] font-medium px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
          >
            {availableActions.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN:     { label: "Đang chờ",   cls: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Đã duyệt",  cls: "bg-green-50 text-green-700 border-green-200" },
    REJECTED: { label: "Từ chối",    cls: "bg-red-50 text-red-700 border-red-200" },
    RESOLVED: { label: "Đã xử lý",  cls: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SHORTAGE:        { label: "Thiếu hàng",    cls: "bg-red-50 text-red-600 border-red-200" },
    OVERAGE:         { label: "Thừa hàng",     cls: "bg-orange-50 text-orange-600 border-orange-200" },
    UNEXPECTED_ITEM: { label: "Ngoài phiếu",   cls: "bg-amber-50 text-amber-600 border-amber-200" },
    DAMAGE:          { label: "Hư hỏng",       cls: "bg-purple-50 text-purple-600 border-purple-200" },
  };
  const t = map[type] ?? { label: type, cls: "bg-gray-50 text-gray-600 border-gray-200" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${t.cls}`}>{t.label}</span>;
}
