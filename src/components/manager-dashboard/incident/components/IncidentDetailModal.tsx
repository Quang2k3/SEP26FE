"use client";

import { useState, useEffect } from "react";
import { Modal, Spin } from "antd";
import toast from "react-hot-toast";
import { getIncidentDetail, resolveDiscrepancy } from "@/services/incidentService";
import { resolveOutboundDamage, resolveOutboundShortage } from "@/services/outboundService";
import type { Incident, IncidentItem } from "@/interfaces/incident";

interface Props {
  incident: Incident;
  isManager: boolean;
  onClose: () => void;
  onResolved: () => void;
}

// ─── Inbound incident actions (SHORTAGE/OVERAGE — Gate Check flow) ──────────
const INBOUND_ACTIONS: Record<string, { value: string; label: string }[]> = {
  SHORTAGE: [
    { value: "CLOSE_SHORT",   label: "Chốt thiếu" },
    { value: "WAIT_BACKORDER", label: "Chờ giao bù" },
  ],
  OVERAGE: [
    { value: "ACCEPT", label: "Nhập kho" },
    { value: "RETURN", label: "Trả NCC" },
  ],
  UNEXPECTED_ITEM: [
    { value: "ACCEPT", label: "Nhập kho" },
    { value: "RETURN", label: "Trả NCC" },
  ],
};

// ─── [V20] Outbound damage actions ──────────────────────────────────────────
const OUTBOUND_DAMAGE_ACTIONS = [
  { value: "RETURN_SCRAP", label: "Trả/Huỷ hàng lỗi + Re-pick", color: "bg-red-600 hover:bg-red-700" },
  { value: "ACCEPT",       label: "Xuất luôn (chấp nhận lỗi)", color: "bg-amber-600 hover:bg-amber-700" },
];

// ─── [V20] Outbound shortage actions ────────────────────────────────────────
const OUTBOUND_SHORTAGE_ACTIONS = [
  { value: "WAIT_BACKORDER", label: "Chờ nhập hàng bù (giữ đơn)", color: "bg-amber-600 hover:bg-amber-700" },
  { value: "CLOSE_SHORT",    label: "Chốt thiếu + Re-Allocate ngay", color: "bg-blue-600 hover:bg-blue-700" },
];

export default function IncidentDetailModal({ incident, isManager, onClose, onResolved }: Props) {
  const [detail, setDetail]     = useState<Incident | null>(null);
  const [loading, setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actions, setActions]   = useState<Record<number, string>>({});
  const [note, setNote]         = useState("");

  // [V20] outbound single-action state
  const [outboundAction, setOutboundAction] = useState("");

  const isOutboundDamage   = incident.incidentType === "DAMAGE" && incident.soId != null;
  const isOutboundShortage = incident.incidentType === "SHORTAGE" && incident.soId != null;
  const isOutboundIncident = isOutboundDamage || isOutboundShortage;

  useEffect(() => {
    (async () => {
      try {
        const d = await getIncidentDetail(incident.incidentId);
        setDetail(d);
        if (!isOutboundIncident) {
          const defaults: Record<number, string> = {};
          for (const item of d.items ?? []) {
            const available = INBOUND_ACTIONS[item.reasonCode];
            if (available?.[0]) defaults[item.incidentItemId] = available[0].value;
          }
          setActions(defaults);
        } else {
          // default outbound action
          if (isOutboundDamage) setOutboundAction("RETURN_SCRAP");
          if (isOutboundShortage) setOutboundAction("CLOSE_SHORT");
        }
      } catch {
        toast.error("Không tải được chi tiết incident");
      } finally {
        setLoading(false);
      }
    })();
  }, [incident.incidentId]);

  const isResolved = detail?.status === "RESOLVED";
  const canResolve = isManager && detail?.status === "OPEN";

  // ─── Xử lý inbound (SHORTAGE/OVERAGE) ──────────────────────────────────────
  const handleInboundResolve = async () => {
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
      setSubmitting(false); }
  };

  // ─── [V20] Xử lý outbound DAMAGE ────────────────────────────────────────────
  const handleOutboundDamageResolve = async () => {
    if (!outboundAction) { toast.error("Chọn hành động"); return; }
    setSubmitting(true);
    try {
      await resolveOutboundDamage(incident.incidentId, {
        action: outboundAction as "RETURN_SCRAP" | "ACCEPT",
        note: note || undefined,
      });
      toast.success(
        outboundAction === "RETURN_SCRAP"
          ? "✅ Đã xử lý — SO chuyển PICKING để re-pick hàng thay thế"
          : "✅ Chấp nhận xuất hàng lỗi — SO chuyển QC_SCAN"
      );
      onResolved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Lỗi khi xử lý");
    } finally { setSubmitting(false); }
  };

  // ─── [V20] Xử lý outbound SHORTAGE ──────────────────────────────────────────
  const handleOutboundShortageResolve = async () => {
    if (!outboundAction) { toast.error("Chọn hành động"); return; }
    setSubmitting(true);
    try {
      await resolveOutboundShortage(incident.incidentId, {
        action: outboundAction as "WAIT_BACKORDER" | "CLOSE_SHORT",
        note: note || undefined,
      });
      toast.success(
        outboundAction === "WAIT_BACKORDER"
          ? "✅ SO chuyển WAITING_STOCK — chờ nhập hàng bù"
          : "✅ Đã chốt thiếu — SO về APPROVED, Keeper có thể Allocate lại"
      );
      onResolved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Lỗi khi xử lý");
    } finally { setSubmitting(false); }
  };

  const items = detail?.items ?? [];

  return (
    <Modal open onCancel={onClose} footer={null} width={720} title={null} centered
      styles={{ body: { padding: 0 } }}>
      {loading ? (
        <div className="flex items-center justify-center py-16"><Spin size="large" /></div>
      ) : (
        <div>
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[20px] text-slate-500">report</span>
                  {detail?.incidentCode}
                </h2>
                <p className="text-xs text-gray-500 mt-1">{detail?.description?.slice(0, 120)}{(detail?.description?.length ?? 0) > 120 ? '…' : ''}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={detail?.status ?? "OPEN"} />
                <TypeBadge type={detail?.incidentType ?? ""} />
                {detail?.soId && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                    SO #{detail.soId}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-3 text-xs text-gray-500">
              {detail?.receivingCode && <span>📋 GRN: <strong className="text-gray-700">{detail.receivingCode}</strong></span>}
              <span>👤 <strong className="text-gray-700">{detail?.reportedByName ?? "—"}</strong></span>
              <span>🕐 {detail?.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}</span>
            </div>
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <div className="px-6 py-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
                Chi tiết sản phẩm — {items.length} SKU
              </p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="grid bg-gray-50 px-4 py-2 text-[10px] font-bold text-gray-400 uppercase tracking-wide border-b border-gray-100"
                  style={{ gridTemplateColumns: !isOutboundIncident && canResolve ? "1fr 4.5rem 4.5rem 7rem 10rem" : "1fr 4.5rem 4.5rem 7rem" }}>
                  <span>SKU</span>
                  <span className="text-center">Dự kiến</span>
                  <span className="text-center">Thực nhận</span>
                  <span className="text-center">Loại</span>
                  {!isOutboundIncident && canResolve && <span className="text-center">Hành động</span>}
                </div>
                <div className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
                  {items.map((item) => (
                    <SkuRow key={item.incidentItemId} item={item}
                      canResolve={canResolve && !isOutboundIncident}
                      selectedAction={actions[item.incidentItemId] ?? ""}
                      onActionChange={(action) =>
                        setActions((prev) => ({ ...prev, [item.incidentItemId]: action }))}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* [V20] Outbound DAMAGE resolution */}
          {canResolve && isOutboundDamage && (
            <div className="px-6 py-4 border-t border-gray-100 bg-red-50/30 space-y-3">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-red-500">warning</span>
                Xử lý hàng hỏng QC — chọn phương án:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OUTBOUND_DAMAGE_ACTIONS.map((a) => (
                  <button key={a.value} onClick={() => setOutboundAction(a.value)}
                    className={`py-2.5 px-3 text-sm font-semibold rounded-xl border-2 transition-all ${
                      outboundAction === a.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {outboundAction === "RETURN_SCRAP" && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700">
                  <strong>RETURN_SCRAP:</strong> Hàng hỏng sẽ bị trừ tồn. SO chuyển sang <strong>PICKING</strong> — Keeper re-pick hàng thay thế rồi QC lại.
                </div>
              )}
              {outboundAction === "ACCEPT" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                  <strong>ACCEPT:</strong> Chấp nhận xuất cả hàng lỗi. SO chuyển sang <strong>QC_SCAN</strong> → tiếp tục dispatch.
                </div>
              )}
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú của Manager (tùy chọn)..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  Đóng
                </button>
                <button onClick={handleOutboundDamageResolve} disabled={submitting || !outboundAction}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          )}

          {/* [V20] Outbound SHORTAGE resolution */}
          {canResolve && isOutboundShortage && (
            <div className="px-6 py-4 border-t border-gray-100 bg-amber-50/30 space-y-3">
              <p className="text-xs font-bold text-gray-700 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-amber-500">inventory</span>
                Xử lý thiếu hàng — chọn phương án:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {OUTBOUND_SHORTAGE_ACTIONS.map((a) => (
                  <button key={a.value} onClick={() => setOutboundAction(a.value)}
                    className={`py-2.5 px-3 text-sm font-semibold rounded-xl border-2 transition-all ${
                      outboundAction === a.value
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}>
                    {a.label}
                  </button>
                ))}
              </div>
              {outboundAction === "WAIT_BACKORDER" && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                  <strong>WAIT_BACKORDER:</strong> SO chuyển <strong>WAITING_STOCK</strong>. Khi hàng về, Keeper vào lệnh xuất → bấm Allocate lại.
                </div>
              )}
              {outboundAction === "CLOSE_SHORT" && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-700">
                  <strong>CLOSE_SHORT:</strong> Cắt số lượng về tồn kho hiện có. SO về <strong>APPROVED</strong> — Keeper Allocate lại ngay để tiếp tục xuất.
                </div>
              )}
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú của Manager (tùy chọn)..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  Đóng
                </button>
                <button onClick={handleOutboundShortageResolve} disabled={submitting || !outboundAction}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Đang xử lý..." : "Xác nhận"}
                </button>
              </div>
            </div>
          )}

          {/* Inbound resolution (giữ nguyên logic cũ) */}
          {canResolve && !isOutboundIncident && (
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3">
              <textarea value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Ghi chú của Manager (tùy chọn)..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                  Đóng
                </button>
                <button onClick={handleInboundResolve} disabled={submitting}
                  className="flex-1 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60">
                  {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Đang xử lý..." : "Xác nhận duyệt"}
                </button>
              </div>
            </div>
          )}

          {!canResolve && (
            <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={onClose}
                className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
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

function SkuRow({ item, canResolve, selectedAction, onActionChange }: {
  item: IncidentItem;
  canResolve: boolean;
  selectedAction: string;
  onActionChange: (action: string) => void;
}) {
  const reasonLabel: Record<string, { label: string; color: string; bg: string }> = {
    SHORTAGE:        { label: "Thiếu",       color: "text-red-700",    bg: "bg-red-50 border-red-200" },
    OVERAGE:         { label: "Thừa",        color: "text-orange-700", bg: "bg-orange-50 border-orange-200" },
    UNEXPECTED_ITEM: { label: "Ngoài phiếu", color: "text-amber-700",  bg: "bg-amber-50 border-amber-200" },
    DAMAGE:          { label: "Hư hỏng",     color: "text-purple-700", bg: "bg-purple-50 border-purple-200" },
  };
  const reason = reasonLabel[item.reasonCode] ?? { label: item.reasonCode, color: "text-gray-700", bg: "bg-gray-50 border-gray-200" };
  const diff   = item.actualQty - item.expectedQty;
  const availableActions = INBOUND_ACTIONS[item.reasonCode] ?? [];

  return (
    <div className="grid items-center px-4 py-3 hover:bg-gray-50/50"
      style={{ gridTemplateColumns: canResolve ? "1fr 4.5rem 4.5rem 7rem 10rem" : "1fr 4.5rem 4.5rem 7rem" }}>
      <div className="min-w-0">
        <p className="text-xs font-bold text-gray-800 font-mono truncate">{item.skuCode}</p>
        <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.skuName}</p>
        {item.note && item.note.includes('photo:') && (
          <a href={item.note.split('photo:')[1].trim()} target="_blank" rel="noreferrer"
            className="text-[10px] text-blue-500 underline mt-0.5 block">📷 Xem ảnh hàng hỏng</a>
        )}
      </div>
      <span className="text-center text-xs text-gray-500 tabular-nums">{item.expectedQty}</span>
      <span className={`text-center text-xs font-bold tabular-nums ${reason.color}`}>{item.actualQty}</span>
      <div className="flex justify-center">
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full border ${reason.bg} ${reason.color}`}>
          {reason.label}
          {diff !== 0 && <span className="font-mono">{diff > 0 ? `+${diff}` : `${diff}`}</span>}
        </span>
      </div>
      {canResolve && availableActions.length > 0 && (
        <div className="flex justify-center">
          <select value={selectedAction} onChange={(e) => onActionChange(e.target.value)}
            className="text-[11px] font-medium px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer">
            {availableActions.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN:     { label: "Đang chờ",  cls: "bg-amber-50 text-amber-700 border-amber-200" },
    APPROVED: { label: "Đã duyệt", cls: "bg-green-50 text-green-700 border-green-200" },
    REJECTED: { label: "Từ chối",   cls: "bg-red-50 text-red-700 border-red-200" },
    RESOLVED: { label: "Đã xử lý", cls: "bg-blue-50 text-blue-700 border-blue-200" },
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