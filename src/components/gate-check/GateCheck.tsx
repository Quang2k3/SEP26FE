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
  deleteReceivingOrder,
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

// ── Submit Confirm Modal (DRAFT → PENDING_RECEIPT) ───────────────────────────
function SubmitConfirmModal({
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
            <div className="w-9 h-9 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">send</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Xác nhận nhận hàng</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Sau khi xác nhận, phiếu chuyển sang{" "}
                <span className="font-medium text-cyan-600">Đang nhận hàng</span>{" "}
                và bạn có thể quét QR để kiểm đếm.
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
                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Nháp</span>
                <span className="material-symbols-outlined text-[14px] text-gray-400">arrow_forward</span>
                <span className="px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-600 font-medium">Đang nhận hàng</span>
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
            <div className="flex items-start gap-2 px-3 py-2.5 bg-blue-50 border border-blue-100 rounded-lg">
              <span className="material-symbols-outlined text-blue-400 text-[15px] mt-0.5 flex-shrink-0">
                info
              </span>
              <p className="text-xs text-blue-700">
                Sau khi xác nhận, bấm <strong>Quét QR</strong> để scan barcode hàng hoá trên điện thoại, rồi gửi cho QC kiểm đếm.
              </p>
            </div>
          </div>
          <ConfirmFooter
            loading={loading}
            onCancel={onCancel}
            onConfirm={onConfirm}
            confirmLabel="Xác nhận nhận hàng"
            confirmIcon="send"
            confirmClass="bg-blue-600 hover:bg-blue-700"
          />
        </div>
      </div>
    </Portal>
  );
}

// ── Delete Confirm Modal (DRAFT only) ────────────────────────────────────────
function DeleteConfirmModal({
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
            <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-red-500 text-[20px]">delete_forever</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">Xóa phiếu nháp</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Hành động này <span className="font-semibold text-red-500">không thể hoàn tác</span>.
              </p>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="bg-gray-50 rounded-lg px-4 py-3 border border-gray-100">
              <p className="text-[11px] text-gray-400 uppercase tracking-wide">Mã phiếu sẽ bị xóa</p>
              <p className="text-sm font-bold font-mono text-gray-900 mt-0.5">{receiving.receivingCode}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <InfoBox label="Kho nhận" value={receiving.warehouseName} />
              <InfoBox label="Nhà cung cấp" value={receiving.supplierName} />
              <InfoBox label="Tổng SL" value={String(receiving.totalExpectedQty ?? 0)} bold />
              <InfoBox label="Ngày tạo" value={new Date(receiving.createdAt).toLocaleDateString("vi-VN")} />
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-lg">
              <span className="material-symbols-outlined text-red-400 text-[15px] mt-0.5 flex-shrink-0">
                warning
              </span>
              <p className="text-xs text-red-700">
                Toàn bộ thông tin phiếu và danh sách hàng hoá sẽ bị xóa vĩnh viễn.
              </p>
            </div>
          </div>
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
              className="flex-1 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700"
            >
              {loading
                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[16px]">delete_forever</span>
              }
              {loading ? "Đang xóa..." : "Xóa phiếu"}
            </button>
          </div>
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

// ── PO Match helpers ─────────────────────────────────────────────────────────

interface POMatchLine {
  skuCode:      string;
  skuName:      string;
  expected:     number;
  received:     number;
  diff:         number;         // received - expected (âm = thiếu, dương = thừa)
  variance:     number;         // |diff| / expected * 100
  status:       'ok' | 'over' | 'under' | 'missing';
}

interface POMatchSummary {
  lines:           POMatchLine[];
  totalExpected:   number;
  totalReceived:   number;
  totalDiff:       number;
  overallVariance: number;      // |totalDiff| / totalExpected * 100
  needsReview:     boolean;     // overallVariance > 5%
  hasUnder:        boolean;
  hasOver:         boolean;
}

function getPOMatchData(receiving: ReceivingOrder): POMatchSummary {
  const items = receiving.items ?? [];
  const lines: POMatchLine[] = items.map(item => {
    const expected = item.expectedQty ?? 0;
    const received = item.receivedQty  ?? 0;
    const diff     = received - expected;
    const variance = expected > 0 ? Math.abs(diff) / expected * 100 : 0;
    const status: POMatchLine['status'] =
      received === 0   ? 'missing' :
      diff < 0         ? 'under'   :
      diff > 0         ? 'over'    : 'ok';
    return { skuCode: item.skuCode, skuName: item.skuName, expected, received, diff, variance, status };
  });

  const totalExpected   = lines.reduce((s, l) => s + l.expected, 0);
  const totalReceived   = lines.reduce((s, l) => s + l.received, 0);
  const totalDiff       = totalReceived - totalExpected;
  const overallVariance = totalExpected > 0 ? Math.abs(totalDiff) / totalExpected * 100 : 0;

  return {
    lines,
    totalExpected,
    totalReceived,
    totalDiff,
    overallVariance,
    needsReview: overallVariance > 5,
    hasUnder:    lines.some(l => l.status === 'under' || l.status === 'missing'),
    hasOver:     lines.some(l => l.status === 'over'),
  };
}

// Màu sắc theo mức variance
function varianceColor(v: number, status: POMatchLine['status']): string {
  if (status === 'ok')      return 'text-emerald-600';
  if (status === 'missing') return 'text-red-600';
  if (v > 10)               return status === 'under' ? 'text-red-600'    : 'text-orange-600';
  if (v > 5)                return status === 'under' ? 'text-orange-600' : 'text-amber-600';
  return 'text-amber-500';
}

function POMatchPanel({ match }: { match: POMatchSummary }) {
  return (
    <div className="rounded-xl border overflow-hidden"
      style={{ borderColor: match.needsReview ? '#fca5a5' : '#d1fae5' }}>

      {/* ── Tổng hợp header ── */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        match.needsReview ? 'bg-red-50' : 'bg-emerald-50'
      }`}>
        <div className="flex items-center gap-2">
          <span className={`material-symbols-outlined text-[18px] ${
            match.needsReview ? 'text-red-500' : 'text-emerald-500'
          }`}>
            {match.needsReview ? 'warning' : 'check_circle'}
          </span>
          <div>
            <p className={`text-xs font-bold ${match.needsReview ? 'text-red-800' : 'text-emerald-800'}`}>
              {match.needsReview ? 'Variance >5% — Cần Manager review' : 'Đối chiếu PO đạt'}
            </p>
            <p className={`text-[10px] mt-0.5 ${match.needsReview ? 'text-red-500' : 'text-emerald-500'}`}>
              Đặt {match.totalExpected} · Nhận {match.totalReceived} ·{' '}
              {match.totalDiff === 0 ? 'Khớp 100%'
                : match.totalDiff < 0 ? `Thiếu ${Math.abs(match.totalDiff)} hộp`
                : `Thừa ${match.totalDiff} hộp`}
            </p>
          </div>
        </div>
        {/* Variance badge */}
        <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${
          match.needsReview ? 'bg-red-100' : 'bg-emerald-100'
        }`}>
          <span className={`text-base font-extrabold tabular-nums ${
            match.needsReview ? 'text-red-700' : 'text-emerald-700'
          }`}>
            {match.overallVariance.toFixed(1)}%
          </span>
          <span className={`text-[9px] font-semibold ${
            match.needsReview ? 'text-red-500' : 'text-emerald-500'
          }`}>variance</span>
        </div>
      </div>

      {/* ── Bảng chi tiết từng SKU ── */}
      <div className="divide-y divide-gray-50 max-h-44 overflow-y-auto">
        {/* Header row */}
        <div className="grid px-3 py-1.5 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wide"
          style={{ gridTemplateColumns: '1fr 3rem 3rem 3rem 4.5rem' }}>
          <span>SKU</span>
          <span className="text-center">Đặt</span>
          <span className="text-center">Nhận</span>
          <span className="text-center">Lệch</span>
          <span className="text-center">Variance</span>
        </div>
        {match.lines.map(line => (
          <div key={line.skuCode}
            className={`grid items-center px-3 py-2.5 ${
              line.status !== 'ok' ? 'bg-red-50/30' : ''
            }`}
            style={{ gridTemplateColumns: '1fr 3rem 3rem 3rem 4.5rem' }}>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-gray-800 font-mono truncate">{line.skuCode}</p>
              <p className="text-[10px] text-gray-400 truncate">{line.skuName}</p>
            </div>
            <span className="text-center text-[11px] text-gray-500">{line.expected}</span>
            <span className={`text-center text-[11px] font-bold ${varianceColor(line.variance, line.status)}`}>
              {line.status === 'missing' ? '—' : line.received}
            </span>
            <span className={`text-center text-[11px] font-bold ${varianceColor(line.variance, line.status)}`}>
              {line.diff === 0 ? '—' : line.diff > 0 ? `+${line.diff}` : line.diff}
            </span>
            <div className="flex items-center justify-center gap-1">
              {line.status === 'ok' ? (
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">✓ Khớp</span>
              ) : line.status === 'missing' ? (
                <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">Chưa scan</span>
              ) : (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  line.variance > 5 ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50'
                }`}>
                  {line.variance.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── Warning khi cần Manager review ── */}
      {match.needsReview && (
        <div className="px-4 py-2.5 bg-red-50 border-t border-red-100 flex items-start gap-2">
          <span className="material-symbols-outlined text-red-400 text-[14px] mt-0.5 flex-shrink-0">info</span>
          <p className="text-[11px] text-red-600 leading-relaxed">
            Variance vượt 5% — GRN sẽ được gắn cờ <strong>cần Manager review</strong> trước khi nhập kho.
            Manager sẽ thấy cảnh báo này khi duyệt.
          </p>
        </div>
      )}
    </div>
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
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden">
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
          <div className="px-5 py-4 space-y-3">
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
            {(receiving.items?.length ?? 0) > 0 && (
              <POMatchPanel match={getPOMatchData(receiving)} />
            )}
            {receiving.note && <NoteBox note={receiving.note} />}
          </div>
          {/* Footer thông minh — hiển thị cảnh báo khi variance >5% */}
          {(() => {
            const match = getPOMatchData(receiving);
            return (
              <div className="px-5 py-4 border-t border-gray-100 space-y-3">
                {match.needsReview && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="material-symbols-outlined text-amber-500 text-[14px]">flag</span>
                    <p className="text-[11px] text-amber-700">
                      GRN này sẽ được gắn cờ <strong>cần Manager review</strong> do variance &gt;5%.
                    </p>
                  </div>
                )}
                <div className="flex gap-2.5">
                  <button onClick={onCancel} disabled={loading}
                    className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50">
                    Huỷ
                  </button>
                  <button onClick={onConfirm} disabled={loading}
                    className={`flex-1 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 ${
                      match.needsReview
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                    }`}>
                    {loading
                      ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Đang tạo...</>
                      : <><span className="material-symbols-outlined text-[16px]">receipt_long</span>
                         {match.needsReview ? 'Tạo GRN (cần review)' : 'Tạo GRN'}</>}
                  </button>
                </div>
              </div>
            );
          })()}
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
  const [deleteLoadingId, setDeleteLoadingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("ALL");
  const [page, setPage] = useState(0);

  const [scanReceiving, setScanReceiving] = useState<ReceivingOrder | null>(null);
  const [detailReceiving, setDetailReceiving] = useState<ReceivingOrder | null>(null);
  const [submitConfirmReceiving, setSubmitConfirmReceiving] = useState<ReceivingOrder | null>(null);
  const [deleteConfirmReceiving, setDeleteConfirmReceiving] = useState<ReceivingOrder | null>(null);
  const [grnConfirmReceiving, setGrnConfirmReceiving] = useState<ReceivingOrder | null>(null);
  const [submitGrnReceiving, setSubmitGrnReceiving] = useState<ReceivingOrder | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [grnDetailLoading, setGrnDetailLoading] = useState<number | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);

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
    } catch {
      // silent — polling sẽ thử lại sau 5s
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

  // ── Xác nhận phiếu DRAFT → PENDING_RECEIPT ───────────────────────────────────────
  const handleSubmitConfirm = (r: ReceivingOrder) => setSubmitConfirmReceiving(r);
  const handleSubmitExecute = async () => {
    if (!submitConfirmReceiving) return;
    setSubmitLoadingId(submitConfirmReceiving.receivingId);
    try {
      await submitReceivingOrder(submitConfirmReceiving.receivingId);
      toast.success(`Đã submit ${submitConfirmReceiving.receivingCode} → Đã submit (sẵn sàng quét QR)`);
      setSubmitConfirmReceiving(null);
      loadReceivings(page);
    } catch {
      // axios interceptor đã hiện toast lỗi
    } finally {
      setSubmitLoadingId(null);
    }
  };

  // ── Xóa phiếu DRAFT ──────────────────────────────────────────────────────
  const handleDeleteConfirm = (r: ReceivingOrder) => setDeleteConfirmReceiving(r);
  const handleDeleteExecute = async () => {
    if (!deleteConfirmReceiving) return;
    setDeleteLoadingId(deleteConfirmReceiving.receivingId);
    try {
      await deleteReceivingOrder(deleteConfirmReceiving.receivingId);
      toast.success(`Đã xóa phiếu ${deleteConfirmReceiving.receivingCode}`);
      setDeleteConfirmReceiving(null);
      loadReceivings(page);
    } catch {
      // axios interceptor đã hiện toast lỗi
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // ── Mở chi tiết / sửa — fetch full data (có items) trước khi mở modal ────
  const handleOpenDetail = async (r: ReceivingOrder) => {
    setDetailLoadingId(r.receivingId);
    try {
      const full = await fetchReceivingOrder(r.receivingId);
      setDetailReceiving(full);
    } catch {
      setDetailReceiving(r); // fallback
    } finally {
      setDetailLoadingId(null);
    }
  };

  // ── Gen GRN ───────────────────────────────────────────────────────────────
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
      // axios interceptor đã hiện toast lỗi
    } finally {
      setGrnLoadingId(null);
    }
  };

  // ── Gửi GRN cho Manager ───────────────────────────────────────────────────
  const handleSubmitGrn = (r: ReceivingOrder) => setSubmitGrnReceiving(r);
  const handleSubmitGrnExecute = async () => {
    if (!submitGrnReceiving) return;
    setSubmitGrnLoadingId(submitGrnReceiving.receivingId);
    try {
      const grn = await fetchGrnByReceivingId(submitGrnReceiving.receivingId);
      await submitGrnToManager(grn.grnId);
      toast.success(`Đã gửi ${submitGrnReceiving.receivingCode} cho Manager duyệt`);
      setSubmitGrnReceiving(null);
      loadReceivings(page);
    } catch {
      // axios interceptor đã hiện toast lỗi
    } finally {
      setSubmitGrnLoadingId(null);
    }
  };

  const columns = getReceivingColumns({
    userRole,
    onDetail: handleOpenDetail,
    onSubmitConfirm: handleSubmitConfirm,
    onScan: r => setScanReceiving(r),
    onGenerateGrn: handleGrnConfirm,
    onSubmitGrn: handleSubmitGrn,
    onViewIncident: () => router.push("/manager-dashboard/incident"),
    onDelete: handleDeleteConfirm,
    loadingId: grnDetailLoading,
    detailLoadingId,
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

      {/* QR Scan — chỉ mở được khi status = PENDING_RECEIPT (Keeper) hoặc PENDING_COUNT/PENDING_RECEIPT (QC) */}
      {scanReceiving && (
        <GateCheckModal
          open={!!scanReceiving}
          receivingId={scanReceiving.receivingId}
          userRole={userRole}
          onClose={() => { setScanReceiving(null); loadReceivings(page); }}
          onFinalized={() => loadReceivings(page)}
        />
      )}

      {/* Chi tiết / Edit */}
      <ReceivingDetailModal
        open={!!detailReceiving}
        receiving={detailReceiving}
        onClose={() => setDetailReceiving(null)}
        onRefresh={() => loadReceivings(page)}
      />

      {/* Xác nhận phiếu (DRAFT → PENDING_RECEIPT) */}
      {submitConfirmReceiving && (
        <SubmitConfirmModal
          receiving={submitConfirmReceiving}
          loading={submitLoadingId === submitConfirmReceiving.receivingId}
          onConfirm={handleSubmitExecute}
          onCancel={() => setSubmitConfirmReceiving(null)}
        />
      )}

      {/* Xóa phiếu confirm (DRAFT only) */}
      {deleteConfirmReceiving && (
        <DeleteConfirmModal
          receiving={deleteConfirmReceiving}
          loading={deleteLoadingId === deleteConfirmReceiving.receivingId}
          onConfirm={handleDeleteExecute}
          onCancel={() => setDeleteConfirmReceiving(null)}
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

      {/* Gửi GRN cho Manager confirm modal */}
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
