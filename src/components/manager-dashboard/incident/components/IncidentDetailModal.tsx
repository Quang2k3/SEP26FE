"use client";

import { useState, useEffect } from "react";
import { Spin } from "antd";
import Portal from "@/components/ui/Portal";
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

// ─── Inbound incident actions (SHORTAGE/OVERAGE/DAMAGE — Gate Check flow) ───
// [develop] Đổi tên thành ACTIONS_BY_REASON, thêm DAMAGE, "Trả NCC" → "Hoàn hàng"
const ACTIONS_BY_REASON: Record<string, { value: string; label: string }[]> = {
  SHORTAGE: [
    { value: "CLOSE_SHORT",    label: "Chốt thiếu" },
    { value: "WAIT_BACKORDER", label: "Chờ giao bù" },
  ],
  OVERAGE: [
    { value: "ACCEPT", label: "Nhập kho" },
    { value: "RETURN", label: "Hoàn hàng" },
  ],
  UNEXPECTED_ITEM: [
    { value: "ACCEPT", label: "Nhập kho" },
    { value: "RETURN", label: "Hoàn hàng" },
  ],
  DAMAGE: [
    { value: "RETURN", label: "Hoàn hàng" },
    { value: "SCRAP",  label: "Huỷ bỏ" },
    { value: "ACCEPT", label: "Chấp nhận" },
  ],
};

// ─── [V20] Outbound damage actions ──────────────────────────────────────────
const OUTBOUND_DAMAGE_ACTIONS = [
  { value: "RETURN_SCRAP", label: "Trả/Huỷ hàng lỗi + Re-pick", color: "bg-red-600 hover:bg-red-700" },
  { value: "ACCEPT",       label: "Xuất luôn (chấp nhận lỗi)",  color: "bg-amber-600 hover:bg-amber-700" },
];

// ─── [V20] Outbound shortage actions ────────────────────────────────────────
const OUTBOUND_SHORTAGE_ACTIONS = [
  { value: "WAIT_BACKORDER", label: "Chờ nhập hàng bù (giữ đơn)",    color: "bg-amber-600 hover:bg-amber-700" },
  { value: "CLOSE_SHORT",    label: "Chốt thiếu + Re-Allocate ngay", color: "bg-blue-600 hover:bg-blue-700" },
];

// ─── [develop] Helpers ───────────────────────────────────────────────────────
function computeOverShort(item: IncidentItem) {
  const diff = item.actualQty - item.expectedQty;
  return { over: diff > 0 ? diff : 0, short: diff < 0 ? Math.abs(diff) : 0 };
}

function hasIssue(item: IncidentItem) {
  const { over, short } = computeOverShort(item);
  return over > 0 || short > 0 || item.damagedQty > 0;
}

function getRowBorderClass(item: IncidentItem) {
  if (item.damagedQty > 0) return "border-l-[3px] border-red-400";
  const { over, short } = computeOverShort(item);
  if (short > 0) return "border-l-[3px] border-orange-400";
  if (over > 0)  return "border-l-[3px] border-blue-400";
  return "";
}

/* ═══════════════════════════════════════════════════════════════════════════ */

export default function IncidentDetailModal({ incident, isManager, onClose, onResolved }: Props) {
  const [detail, setDetail]         = useState<Incident | null>(null);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actions, setActions]       = useState<Record<number, string>>({});
  const [note, setNote]             = useState("");

  // [V20] outbound single-action state
  const [outboundAction, setOutboundAction] = useState("");

  const isOutboundDamage   = incident.incidentType === "DAMAGE"   && incident.soId != null;
  const isOutboundShortage = incident.incidentType === "SHORTAGE" && incident.soId != null;
  const isOutboundIncident = isOutboundDamage || isOutboundShortage;

  useEffect(() => {
    (async () => {
      try {
        const d = await getIncidentDetail(incident.incidentId);
        setDetail(d);
        // [hoangthdev1] Phân tách default action cho inbound vs outbound
        if (!isOutboundIncident) {
          const defaults: Record<number, string> = {};
          for (const item of d.items ?? []) {
            const available = ACTIONS_BY_REASON[item.reasonCode];
            if (available?.[0]) defaults[item.incidentItemId] = available[0].value;
          }
          setActions(defaults);
        } else {
          // default outbound action
          if (isOutboundDamage)   setOutboundAction("RETURN_SCRAP");
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

  // ─── Xử lý inbound (SHORTAGE/OVERAGE/DAMAGE — gate check) ───────────────────
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
      setSubmitting(false);
    }
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
          ? "✅ Đã xử lý — SO chuyển APPROVED để re-allocate hàng thay thế"
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

  // ─── [develop] split items ────────────────────────────────────────────────────
  const allItems        = detail?.items ?? [];
  const orderItems      = allItems.filter((i) => i.reasonCode !== "UNEXPECTED_ITEM");
  const unexpectedItems = allItems.filter((i) => i.reasonCode === "UNEXPECTED_ITEM");

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spin size="large" />
            </div>
          ) : (
            <>
              {/* ── Header ── */}
              <div className="px-6 py-4 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-red-500 text-[20px]">report</span>
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-sm font-bold text-gray-900">{detail?.incidentCode}</h2>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{detail?.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={detail?.status ?? "OPEN"} />
                    <TypeBadge type={detail?.incidentType ?? ""} />
                    {detail?.soId && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                        SO #{detail.soId}
                      </span>
                    )}
                    <button onClick={onClose} className="ml-2 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                </div>
                <div className="flex gap-4 mt-3 text-xs text-gray-500">
                  {detail?.receivingCode && (
                    <span>📋 GRN: <strong className="text-gray-700">{detail.receivingCode}</strong></span>
                  )}
                  <span>👤 <strong className="text-gray-700">{detail?.reportedByName ?? "—"}</strong></span>
                  <span>🕐 {detail?.createdAt ? new Date(detail.createdAt).toLocaleString("vi-VN") : "—"}</span>
                </div>
              </div>

              {/* ── Body ── */}
              <div className="flex-1 overflow-y-auto px-6 py-4">

                {/* ── Main items table (orderItems) ── */}
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">
                  Chi tiết sản phẩm — {orderItems.length} SKU
                </p>

                {orderItems.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">Không có dữ liệu chi tiết</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-100">
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">SKU</th>
                          <th className="px-4 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">Tên sản phẩm</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">SL giấy tờ</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">SL thực tế</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Thừa</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Thiếu</th>
                          <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hàng hỏng</th>
                          {canResolve && !isOutboundIncident && (
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-gray-400 uppercase tracking-wide">Hành động</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {orderItems.map((item) => {
                          const { over, short }    = computeOverShort(item);
                          const itemHasIssue        = hasIssue(item);
                          const availableActions    = ACTIONS_BY_REASON[item.reasonCode] ?? [];
                          return (
                            <tr key={item.incidentItemId}
                              className={`hover:bg-gray-50/50 transition-colors ${getRowBorderClass(item)}`}>
                              <td className="px-4 py-3">
                                <p className="font-mono font-bold text-gray-800 text-xs">{item.skuCode}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs text-gray-600 truncate max-w-[160px]">{item.skuName}</p>
                                {item.note?.includes("photo:") && (
                                  <a href={item.note.split("photo:")[1].trim()} target="_blank" rel="noreferrer"
                                    className="text-[10px] text-blue-500 underline mt-0.5 block">
                                    📷 Xem ảnh hàng hỏng
                                  </a>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center text-xs text-gray-500 tabular-nums">{item.expectedQty}</td>
                              <td className={`px-4 py-3 text-center text-xs font-bold tabular-nums ${
                                item.actualQty !== item.expectedQty ? "text-orange-700" : "text-gray-700"
                              }`}>{item.actualQty}</td>
                              <td className="px-4 py-3 text-center text-xs tabular-nums">
                                {over > 0
                                  ? <span className="font-bold text-blue-600">+{over}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-xs tabular-nums">
                                {short > 0
                                  ? <span className="font-bold text-orange-600">{short}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              <td className="px-4 py-3 text-center text-xs tabular-nums">
                                {item.damagedQty > 0
                                  ? <span className="font-bold text-red-600">{item.damagedQty}</span>
                                  : <span className="text-gray-300">—</span>}
                              </td>
                              {canResolve && !isOutboundIncident && (
                                <td className="px-4 py-3 text-center">
                                  {itemHasIssue && availableActions.length > 0 ? (
                                    <select
                                      value={actions[item.incidentItemId] ?? ""}
                                      onChange={(e) =>
                                        setActions((prev) => ({ ...prev, [item.incidentItemId]: e.target.value }))
                                      }
                                      className="text-[11px] font-medium px-2 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                                    >
                                      {availableActions.map((a) => (
                                        <option key={a.value} value={a.value}>{a.label}</option>
                                      ))}
                                    </select>
                                  ) : (
                                    <span className="text-[11px] font-semibold text-green-600 flex items-center justify-center gap-1">
                                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                      Khớp
                                    </span>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* ── Unexpected items section ── */}
                {unexpectedItems.length > 0 && (
                  <div className="mt-5">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-3">
                      <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        ⚠️ Hàng ngoài phiếu — {unexpectedItems.length} SKU
                      </p>
                    </div>
                    <div className="border border-amber-100 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-amber-50 border-b border-amber-100">
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-amber-600 uppercase tracking-wide">SKU</th>
                            <th className="px-4 py-2.5 text-left text-[10px] font-bold text-amber-600 uppercase tracking-wide">Tên sản phẩm</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wide">SL thực tế</th>
                            <th className="px-4 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wide">Hàng hỏng</th>
                            {canResolve && (
                              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-amber-600 uppercase tracking-wide">Hành động</th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-amber-50">
                          {unexpectedItems.map((item) => (
                            <tr key={item.incidentItemId}
                              className="hover:bg-amber-50/30 transition-colors border-l-[3px] border-amber-400">
                              <td className="px-4 py-3">
                                <p className="font-mono font-bold text-amber-800 text-xs">{item.skuCode}</p>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs text-amber-700 truncate max-w-[160px]">{item.skuName}</p>
                              </td>
                              <td className="px-4 py-3 text-center text-xs font-bold text-amber-700 tabular-nums">
                                {item.actualQty}
                              </td>
                              <td className="px-4 py-3 text-center text-xs tabular-nums">
                                {item.damagedQty > 0
                                  ? <span className="font-bold text-red-600">{item.damagedQty}</span>
                                  : <span className="text-gray-300">0</span>}
                              </td>
                              {canResolve && (
                                <td className="px-4 py-3 text-center">
                                  <select
                                    value={actions[item.incidentItemId] ?? ""}
                                    onChange={(e) =>
                                      setActions((prev) => ({ ...prev, [item.incidentItemId]: e.target.value }))
                                    }
                                    className="text-[11px] font-medium px-2 py-1.5 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-200 cursor-pointer"
                                  >
                                    {(ACTIONS_BY_REASON["UNEXPECTED_ITEM"] ?? []).map((a) => (
                                      <option key={a.value} value={a.value}>{a.label}</option>
                                    ))}
                                  </select>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

              </div>{/* end body */}

              {/* ── [V20] Outbound DAMAGE resolution ── */}
              {canResolve && isOutboundDamage && (
                <div className="px-6 py-4 border-t border-gray-100 bg-red-50/30 space-y-3 flex-shrink-0">
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
                      <strong>RETURN_SCRAP:</strong> Hàng hỏng bị trừ tồn, chuyển vào khu hàng lỗi. SO chuyển <strong>APPROVED</strong> — Keeper re-allocate hàng thay thế.
                    </div>
                  )}
                  {outboundAction === "ACCEPT" && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-700">
                      <strong>ACCEPT:</strong> Chấp nhận xuất cả hàng lỗi. SO chuyển <strong>QC_SCAN</strong> → tiếp tục dispatch.
                    </div>
                  )}
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú của Manager (tùy chọn)..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
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

              {/* ── [V20] Outbound SHORTAGE resolution ── */}
              {canResolve && isOutboundShortage && (
                <div className="px-6 py-4 border-t border-gray-100 bg-amber-50/30 space-y-3 flex-shrink-0">
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
                      <strong>CLOSE_SHORT:</strong> Cắt số lượng về tồn hiện có. SO về <strong>APPROVED</strong> — Keeper Allocate lại ngay.
                    </div>
                  )}
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú của Manager (tùy chọn)..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
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

              {/* ── Inbound resolution footer ── */}
              {canResolve && !isOutboundIncident && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 space-y-3 flex-shrink-0">
                  <textarea value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="Ghi chú của Manager (tùy chọn)..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-200" rows={2} />
                  <div className="flex gap-3">
                    <button onClick={onClose}
                      className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                      Đóng
                    </button>
                    <button onClick={handleInboundResolve} disabled={submitting}
                      className="flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
                      style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                      {submitting && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                      {submitting ? "Đang xử lý..." : "Xác nhận duyệt"}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Non-Manager hoặc đã resolved → chỉ đóng ── */}
              {!canResolve && (
                <div className="px-6 py-3 border-t border-gray-100 flex justify-end flex-shrink-0">
                  <button onClick={onClose}
                    className="px-6 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                    Đóng
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}

/* ── Sub-components ── */

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    OPEN:      { label: "Đang chờ",  cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
    APPROVED:  { label: "Đã duyệt", cls: "bg-green-50 text-green-700 ring-1 ring-green-200" },
    REJECTED:  { label: "Từ chối",   cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
    RESOLVED:  { label: "Đã xử lý", cls: "bg-blue-50 text-blue-700 ring-1 ring-blue-200" },
    CANCELLED: { label: "Đã huỷ",   cls: "bg-gray-50 text-gray-500 ring-1 ring-gray-200" },
  };
  const s = map[status] ?? { label: status, cls: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span>;
}

function TypeBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    SHORTAGE:        { label: "Thiếu hàng",  cls: "bg-red-50 text-red-600 ring-1 ring-red-200" },
    OVERAGE:         { label: "Thừa hàng",   cls: "bg-orange-50 text-orange-600 ring-1 ring-orange-200" },
    UNEXPECTED_ITEM: { label: "Ngoài phiếu", cls: "bg-amber-50 text-amber-600 ring-1 ring-amber-200" },
    DAMAGE:          { label: "Hư hỏng",     cls: "bg-purple-50 text-purple-600 ring-1 ring-purple-200" },
    DISCREPANCY:     { label: "Tổng hợp",    cls: "bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200" },
  };
  const t = map[type] ?? { label: type, cls: "bg-gray-50 text-gray-600 ring-1 ring-gray-200" };
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.cls}`}>{t.label}</span>;
}