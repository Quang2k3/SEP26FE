"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchReceivingOrder } from "@/services/receivingOrdersService";
import { useRouter } from "next/navigation";
import { AdminPage } from "@/components/layout/AdminPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/Table";
import {
  fetchReceivingOrders,
  generateGrn,
  submitReceivingOrder,
} from "@/services/receivingOrdersService";
import { fetchGrnByReceivingId, submitGrnToManager } from "@/services/grnService";
import type { ReceivingOrder, ReceivingOrderPagePayload, ReceivingStatus } from "@/interfaces/receiving";
import { getReceivingColumns, STATUS_BADGE } from "./components/columns";
import GateCheckModal from "./components/GateCheckModal";
import GateCheckFilter from "./components/GateCheckFilter";
import CreateReceivingOrderModal from "@/components/inbound/CreateReceivingOrderModal";
import ReceivingDetailModal from "./components/ReceivingDetailModal";
import Portal from "@/components/ui/Portal";
import toast from "react-hot-toast";

type FilterStatus = ReceivingStatus | "ALL";

function getUserRole(): string {
  if (typeof window === "undefined") return "KEEPER";
  const session = JSON.parse(localStorage.getItem("auth_user") ?? "{}");
  const roles: string[] = session?.roleCodes ?? [];
  if (roles.includes("MANAGER")) return "MANAGER";
  if (roles.includes("QC")) return "QC";
  return "KEEPER";
}

// ── Submit Confirm Modal ─────────────────────────────────────────────────────
function SubmitConfirmModal({
  receiving, loading, onConfirm, onCancel,
}: {
  receiving: ReceivingOrder;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    // ✅ FIX: dùng Portal để thoát khỏi stacking context của header
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">send</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Xác nhận Submit phiếu</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Sau khi submit, phiếu chuyển sang <span className="font-medium text-indigo-600">Pending Count</span> và không thể chỉnh sửa.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mã phiếu</p>
                <p className="text-sm font-bold font-mono text-gray-900 mt-0.5">{receiving.receivingCode}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Draft</span>
                <span className="material-symbols-outlined text-[14px] text-gray-400">arrow_forward</span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium">Pending Count</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Kho nhận" value={receiving.warehouseName} />
              <InfoBox label="Nhà cung cấp" value={receiving.supplierName} />
              <InfoBox label="Số chứng từ" value={receiving.sourceReferenceCode} />
              <InfoBox label="Tổng SL dự kiến" value={String(receiving.totalExpectedQty ?? 0)} bold />
            </div>
            {(receiving.items?.length ?? 0) > 0 && (
              <ItemsPreview items={receiving.items!} />
            )}
            {receiving.note && (
              <NoteBox note={receiving.note} />
            )}
          </div>
          <ConfirmFooter
            loading={loading}
            onCancel={onCancel}
            onConfirm={onConfirm}
            confirmLabel="Xác nhận Submit"
            confirmIcon="send"
            confirmClass="bg-blue-600 hover:bg-blue-700"
          />
        </div>
      </div>
    </Portal>
  );
}

// ── Submit GRN to Manager Confirm Modal ──────────────────────────────────────
function SubmitGrnModal({
  receiving, loading, onConfirm, onCancel,
}: {
  receiving: ReceivingOrder;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-green-600 text-[20px]">send</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gửi GRN cho Manager duyệt</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Phiếu sẽ chuyển sang trạng thái <span className="font-medium text-amber-600">Chờ duyệt</span>.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mã phiếu</p>
                <p className="text-sm font-bold font-mono text-gray-900 mt-0.5">{receiving.receivingCode}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">GRN Created</span>
                <span className="material-symbols-outlined text-[14px] text-gray-400">arrow_forward</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium">Chờ duyệt</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Nhà cung cấp" value={receiving.supplierName} />
              <InfoBox label="Số chứng từ" value={receiving.sourceReferenceCode} />
            </div>
          </div>
          <ConfirmFooter
            loading={loading}
            onCancel={onCancel}
            onConfirm={onConfirm}
            confirmLabel="Gửi Manager"
            confirmIcon="send"
            confirmClass="bg-green-600 hover:bg-green-700"
          />
        </div>
      </div>
    </Portal>
  );
}

// ── Gen GRN Confirm Modal ────────────────────────────────────────────────────
function GenGrnConfirmModal({
  receiving, loading, onConfirm, onCancel,
}: {
  receiving: ReceivingOrder;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    // ✅ FIX: dùng Portal để thoát khỏi stacking context của header
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-purple-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-purple-600 text-[20px]">receipt_long</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Tạo phiếu GRN</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Xem lại thông tin trước khi tạo phiếu nhập kho chính thức.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-3">
            {/* Status transition */}
            <div className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mã phiếu nhận</p>
                <p className="text-sm font-bold font-mono text-gray-900 mt-0.5">{receiving.receivingCode}</p>
              </div>
              <div className="flex items-center gap-1 text-[11px]">
                <span className="px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 font-medium">QC Approved</span>
                <span className="material-symbols-outlined text-[14px] text-gray-400">arrow_forward</span>
                <span className="px-2 py-0.5 rounded-full bg-orange-50 text-orange-600 font-medium">GRN Created</span>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Kho nhận" value={receiving.warehouseName} />
              <InfoBox label="Nhà cung cấp" value={receiving.supplierName} />
              <InfoBox label="Số chứng từ" value={receiving.sourceReferenceCode} />
              <InfoBox label="Loại nhập" value={receiving.sourceType} />
              <InfoBox
                label="Tổng SL dự kiến"
                value={String(receiving.totalExpectedQty ?? 0)}
                bold
              />
              <InfoBox
                label="Tổng SL thực nhận"
                value={String(receiving.totalQty ?? 0)}
                bold
                highlight={
                  (receiving.totalQty ?? 0) < (receiving.totalExpectedQty ?? 0)
                    ? "red"
                    : (receiving.totalQty ?? 0) > (receiving.totalExpectedQty ?? 0)
                    ? "orange"
                    : "green"
                }
              />
            </div>

            {/* Items */}
            {(receiving.items?.length ?? 0) > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                    Chi tiết hàng hoá — {receiving.items!.length} SKU
                  </p>
                  <p className="text-[11px] text-gray-400">Dự kiến / Thực nhận</p>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-gray-50">
                  {receiving.items!.map(item => {
                    const diff = (item.receivedQty ?? 0) - item.expectedQty;
                    const hasReceived = (item.receivedQty ?? 0) > 0;
                    return (
                      <div key={item.receivingItemId}
                        className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[11px] font-semibold text-gray-800">{item.skuCode}</p>
                          <p className="text-[11px] text-gray-400 truncate">{item.skuName}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          <span className="text-[11px] text-gray-500">{item.expectedQty}</span>
                          <span className="material-symbols-outlined text-[12px] text-gray-300">arrow_forward</span>
                          <span className={`text-[11px] font-bold ${
                            !hasReceived ? "text-gray-300" :
                            diff < 0 ? "text-red-600" :
                            diff > 0 ? "text-orange-600" :
                            "text-green-600"
                          }`}>
                            {hasReceived ? item.receivedQty : "—"}
                          </span>
                          {hasReceived && diff !== 0 && (
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                              diff < 0
                                ? "bg-red-50 text-red-500"
                                : "bg-orange-50 text-orange-500"
                            }`}>
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {receiving.note && <NoteBox note={receiving.note} />}
          </div>

          <ConfirmFooter
            loading={loading}
            onCancel={onCancel}
            onConfirm={onConfirm}
            confirmLabel="Tạo GRN"
            confirmIcon="receipt_long"
            confirmClass="bg-purple-600 hover:bg-purple-700"
          />
        </div>
      </div>
    </Portal>
  );
}

// ── Shared sub-components ────────────────────────────────────────────────────
function InfoBox({
  label, value, bold, highlight,
}: {
  label: string;
  value?: string | null;
  bold?: boolean;
  highlight?: "red" | "orange" | "green";
}) {
  const valueClass = highlight === "red" ? "text-red-600" :
    highlight === "orange" ? "text-orange-600" :
    highlight === "green" ? "text-green-600" :
    "text-gray-800";
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
      <p className="text-[11px] text-gray-400">{label}</p>
      <p className={`text-xs mt-0.5 truncate ${bold ? "font-bold" : "font-medium"} ${valueClass}`}>
        {value ?? "—"}
      </p>
    </div>
  );
}

function ItemsPreview({ items }: { items: ReceivingOrder["items"] }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
          Danh sách hàng — {items.length} SKU
        </p>
      </div>
      <div className="max-h-32 overflow-y-auto divide-y divide-gray-50">
        {items.map(item => (
          <div key={item.receivingItemId}
            className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-mono text-[11px] font-semibold text-gray-700 shrink-0">{item.skuCode}</span>
              <span className="text-[11px] text-gray-400 truncate">{item.skuName}</span>
            </div>
            <span className="text-[11px] font-bold text-gray-900 shrink-0 ml-2">{item.expectedQty}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBox({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
      <span className="material-symbols-outlined text-gray-400 text-[15px] mt-0.5 flex-shrink-0">
        sticky_note_2
      </span>
      <p className="text-xs text-gray-600">{note}</p>
    </div>
  );
}

function ConfirmFooter({
  loading, onCancel, onConfirm, confirmLabel, confirmIcon, confirmClass,
}: {
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmIcon: string;
  confirmClass: string;
}) {
  return (
    <div className="flex gap-2 px-5 py-3.5 border-t border-gray-100">
      <button
        onClick={onCancel}
        disabled={loading}
        className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
      >
        Huỷ
      </button>
      <button
        onClick={onConfirm}
        disabled={loading}
        className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 ${confirmClass}`}
      >
        {loading
          ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
          : <span className="material-symbols-outlined text-[16px]">{confirmIcon}</span>
        }
        {loading ? "Đang xử lý..." : confirmLabel}
      </button>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function GateCheckContent() {
  const router = useRouter();
  const [userRole] = useState<string>(() => getUserRole());
  const [receivings, setReceivings] = useState<ReceivingOrderPagePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [submitLoadingId, setSubmitLoadingId] = useState<number | null>(null);
  const [grnLoadingId, setGrnLoadingId] = useState<number | null>(null);
  const [submitGrnLoadingId, setSubmitGrnLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [page, setPage] = useState(0);

  const [scanReceiving, setScanReceiving] = useState<ReceivingOrder | null>(null);
  const [detailReceiving, setDetailReceiving] = useState<ReceivingOrder | null>(null);
  const [submitConfirmReceiving, setSubmitConfirmReceiving] = useState<ReceivingOrder | null>(null);
  const [grnConfirmReceiving, setGrnConfirmReceiving] = useState<ReceivingOrder | null>(null);
  const [submitGrnReceiving, setSubmitGrnReceiving] = useState<ReceivingOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [grnDetailLoading, setGrnDetailLoading] = useState<number | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentPage = receivings?.page ?? 0;
  const pageSize = receivings?.size ?? 10;
  const totalPages = receivings?.totalPages ?? 0;
  const totalElements = receivings?.totalElements ?? 0;

  const loadReceivings = async (p = page) => {
    setLoading(true);
    try {
      const data = await fetchReceivingOrders({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        page: p,
        size: 10,
      });
      setReceivings(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadReceivings(page); }, [statusFilter, page]); // eslint-disable-line
  useEffect(() => { setPage(0); }, [statusFilter]);

  useEffect(() => {
    if (scanReceiving) {
      pollRef.current = setInterval(() => loadReceivings(page), 5000);
    } else {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [scanReceiving]); // eslint-disable-line

  const filteredReceivings = useMemo(() => {
    if (!receivings) return [];
    if (!search) return receivings.content;
    const q = search.toLowerCase();
    return receivings.content.filter(r =>
      r.receivingCode?.toLowerCase().includes(q) ||
      r.supplierName?.toLowerCase().includes(q) ||
      r.sourceReferenceCode?.toLowerCase().includes(q)
    );
  }, [receivings, search]);

  // Submit phiếu → Pending Count
  const handleSubmitConfirm = (r: ReceivingOrder) => setSubmitConfirmReceiving(r);
  const handleSubmitExecute = async () => {
    if (!submitConfirmReceiving) return;
    setSubmitLoadingId(submitConfirmReceiving.receivingId);
    try {
      await submitReceivingOrder(submitConfirmReceiving.receivingId);
      toast.success(`Đã submit ${submitConfirmReceiving.receivingCode} → Pending Count`);
      setSubmitConfirmReceiving(null);
      loadReceivings(page);
    } catch {
    } finally {
      setSubmitLoadingId(null);
    }
  };

  // Gen GRN
  const handleGrnConfirm = async (r: ReceivingOrder) => {
    setGrnDetailLoading(r.receivingId);
    try {
      const full = await fetchReceivingOrder(r.receivingId);
      setGrnConfirmReceiving(full);
    } catch {
      setGrnConfirmReceiving(r);
    } finally {
      setGrnDetailLoading(null);
    }
  };
  const handleGrnExecute = async () => {
    if (!grnConfirmReceiving) return;
    setGrnLoadingId(grnConfirmReceiving.receivingId);
    try {
      await generateGrn(grnConfirmReceiving.receivingId);
      toast.success(`Đã tạo GRN cho ${grnConfirmReceiving.receivingCode}`);
      setGrnConfirmReceiving(null);
      loadReceivings(page);
    } catch {
    } finally {
      setGrnLoadingId(null);
    }
  };

  // ✅ FIX: Gửi GRN cho Manager — handler đầy đủ, trước đây bị thiếu
  const handleSubmitGrn = (r: ReceivingOrder) => setSubmitGrnReceiving(r);
  const handleSubmitGrnExecute = async () => {
    if (!submitGrnReceiving) return;
    setSubmitGrnLoadingId(submitGrnReceiving.receivingId);
    try {
      // Lấy GRN của receiving order này rồi submit lên Manager
      const grn = await fetchGrnByReceivingId(submitGrnReceiving.receivingId);
      await submitGrnToManager(grn.grnId);
      toast.success(`Đã gửi ${submitGrnReceiving.receivingCode} cho Manager duyệt`);
      setSubmitGrnReceiving(null);
      loadReceivings(page);
    } catch (e: any) {
      const msg = e?.response?.data?.message ?? e?.message ?? "Lỗi không xác định";
      toast.error(`Lỗi gửi Manager: ${msg}`);
    } finally {
      setSubmitGrnLoadingId(null);
    }
  };

  const columns = getReceivingColumns({
    userRole,
    onDetail: r => setDetailReceiving(r),
    onSubmitConfirm: handleSubmitConfirm,
    onScan: r => setScanReceiving(r),
    onGenerateGrn: handleGrnConfirm,
    onSubmitGrn: handleSubmitGrn,   // ✅ FIX: truyền đúng handler
    onViewIncident: () => router.push("/manager-dashboard/incident"),
    loadingId: grnDetailLoading,
    submitLoadingId,
  });

  const canCreate = userRole === "KEEPER" || userRole === "MANAGER";

  return (
    <AdminPage
      title="Inbound"
      description="Manage inbound receipts: create, edit, submit, scan, QC, generate GRN."
      actions={
        canCreate ? (
          <Button
            size="sm"
            onClick={() => setShowCreateModal(true)}
            leftIcon={<span className="material-symbols-outlined text-sm">add</span>}
          >
            New Receipt
          </Button>
        ) : undefined
      }
    >
      <Card className="flex flex-col gap-3">
        <GateCheckFilter
          search={search}
          statusFilter={statusFilter}
          setSearch={setSearch}
          setStatusFilter={setStatusFilter}
          onSubmit={e => e.preventDefault()}
        />
      </Card>

      <Card className="overflow-hidden" padded={false}>
        <DataTable
          columns={columns}
          data={filteredReceivings}
          loading={loading}
          page={currentPage}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPrev={() => setPage(p => Math.max(0, p - 1))}
          onNext={() => setPage(p => Math.min(totalPages - 1, p + 1))}
        />
      </Card>

      {/* QR Scan */}
      {scanReceiving && (
        <GateCheckModal
          open={!!scanReceiving}
          receivingId={scanReceiving.receivingId}
          warehouseId={scanReceiving.warehouseId}
          onClose={() => { setScanReceiving(null); loadReceivings(0); }}
        />
      )}

      {/* Chi tiết / Edit */}
      <ReceivingDetailModal
        open={!!detailReceiving}
        receiving={detailReceiving}
        onClose={() => setDetailReceiving(null)}
        onRefresh={() => loadReceivings(page)}
      />

      {/* Submit phiếu confirm */}
      {submitConfirmReceiving && (
        <SubmitConfirmModal
          receiving={submitConfirmReceiving}
          loading={submitLoadingId === submitConfirmReceiving.receivingId}
          onConfirm={handleSubmitExecute}
          onCancel={() => setSubmitConfirmReceiving(null)}
        />
      )}

      {/* Gen GRN confirm */}
      {grnConfirmReceiving && (
        <GenGrnConfirmModal
          receiving={grnConfirmReceiving}
          loading={grnLoadingId === grnConfirmReceiving.receivingId}
          onConfirm={handleGrnExecute}
          onCancel={() => setGrnConfirmReceiving(null)}
        />
      )}

      {/* ✅ FIX: Gửi GRN cho Manager confirm modal */}
      {submitGrnReceiving && (
        <SubmitGrnModal
          receiving={submitGrnReceiving}
          loading={submitGrnLoadingId === submitGrnReceiving.receivingId}
          onConfirm={handleSubmitGrnExecute}
          onCancel={() => setSubmitGrnReceiving(null)}
        />
      )}

      {/* Tạo phiếu mới */}
      <CreateReceivingOrderModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); loadReceivings(0); }}
      />
    </AdminPage>
  );
}
