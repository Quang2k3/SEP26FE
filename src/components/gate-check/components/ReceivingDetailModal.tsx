"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "antd";
import { Button } from "@/components/ui/Button";
import { fetchSuppliers, type Supplier } from "@/services/supplierService";
import { searchSkus, type SkuOption } from "@/services/skuService";
import {
  fetchReceivingOrder,
  updateDraftReceivingOrder,
} from "@/services/receivingOrdersService";
import type { ReceivingOrder, ReceivingItem } from "@/interfaces/receiving";
import { STATUS_BADGE } from "./columns";
import toast from "react-hot-toast";
import Portal from '@/components/ui/Portal';

const ITEMS_PER_PAGE = 6;

interface ItemRow {
  id: string;
  skuCode: string;
  skuName: string;
  expectedQty: string;
  lotNumber: string;
  expiryDate: string;
  manufactureDate: string;
}

interface Props {
  open: boolean;
  receiving: ReceivingOrder | null;
  onClose: () => void;
  onRefresh: () => void;
}

/* ── Mini Pagination ── */
function MiniPagination({
  page, totalPages, totalItems, pageSize, onPrev, onNext,
}: {
  page: number; totalPages: number; totalItems: number; pageSize: number;
  onPrev: () => void; onNext: () => void;
}) {
  const from = totalItems === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalItems);
  return (
    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-t border-gray-200">
      <span className="text-xs text-gray-400">
        {totalItems === 0 ? "0 dòng" : `${from}–${to} / ${totalItems} dòng`}
      </span>
      <div className="flex items-center gap-1.5">
        <button onClick={onPrev} disabled={page === 0}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <span className="material-symbols-outlined text-[15px]">chevron_left</span>
        </button>
        <span className="text-xs font-semibold text-gray-600 min-w-[40px] text-center">
          {page + 1} / {Math.max(totalPages, 1)}
        </span>
        <button onClick={onNext} disabled={page >= totalPages - 1}
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <span className="material-symbols-outlined text-[15px]">chevron_right</span>
        </button>
      </div>
    </div>
  );
}

/* ── Read-only field ── */
function ReadField({ label, value, fullWidth }: { label: string; value?: string | null; fullWidth?: boolean }) {
  return (
    <div className={`space-y-1.5 ${fullWidth ? "col-span-2" : ""}`}>
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800 min-h-[38px]">
        {value ?? <span className="text-gray-400 italic">—</span>}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function ReceivingDetailModal({ open, receiving, onClose, onRefresh }: Props) {
  const isDraft = receiving?.status === "DRAFT";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [sourceType, setSourceType] = useState("SUPPLIER");
  const [supplierCode, setSupplierCode] = useState("");
  const [sourceReferenceCode, setSourceReferenceCode] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [detailItems, setDetailItems] = useState<ReceivingItem[]>([]);
  const [itemPage, setItemPage] = useState(0);

  const skuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open || !receiving) return;
    setItemPage(0);
    setSourceType(receiving.sourceType ?? "SUPPLIER");
    setSourceReferenceCode(receiving.sourceReferenceCode ?? "");
    setNote(receiving.note ?? "");

    setLoadingDetail(true);
    fetchReceivingOrder(receiving.receivingId)
      .then((full) => {
        const fullItems = full.items ?? [];
        if (isDraft) {
          const rows: ItemRow[] = fullItems.map((item, i) => ({
            id: String(item.receivingItemId ?? i),
            skuCode: item.skuCode ?? "",
            skuName: item.skuName ?? "",
            expectedQty: String(item.expectedQty ?? ""),
            lotNumber: item.lotNumber ?? "",
            expiryDate: item.expiryDate ?? "",
            manufactureDate: item.manufactureDate ?? "",
          }));
          setItems(rows.length > 0 ? rows : [emptyRow()]);

          setLoadingData(true);
          Promise.all([fetchSuppliers(), searchSkus()])
            .then(([supplierList, skuList]) => {
              setSuppliers(supplierList);
              const existingSkus: SkuOption[] = rows
                .filter((r) => r.skuCode)
                .map((r) => ({ skuId: 0, skuCode: r.skuCode, skuName: r.skuName, unit: null, barcode: null }));
              const merged = [...skuList];
              existingSkus.forEach((e) => {
                if (!merged.find((s) => s.skuCode === e.skuCode)) merged.unshift(e);
              });
              setSkuOptions(merged);
              if (full.supplierId) {
                const found = supplierList.find((s) => s.supplierId === full.supplierId);
                setSupplierCode(found?.supplierCode ?? "");
              } else {
                setSupplierCode("");
              }
            })
            .catch(() => {})
            .finally(() => setLoadingData(false));
        } else {
          setDetailItems(fullItems);
        }
      })
      .catch(() => { if (!isDraft) setDetailItems(receiving.items ?? []); })
      .finally(() => setLoadingDetail(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, receiving?.receivingId]);

  const emptyRow = (): ItemRow => ({
    id: `new_${Date.now()}_${Math.random()}`,
    skuCode: "", skuName: "", expectedQty: "",
    lotNumber: "", expiryDate: "", manufactureDate: "",
  });

  const handleSkuSearch = (val: string) => {
    if (skuTimer.current) clearTimeout(skuTimer.current);
    skuTimer.current = setTimeout(async () => {
      try {
        const results = await searchSkus(val);
        setSkuOptions((prev) => {
          const usedCodes = new Set(items.map((i) => i.skuCode).filter(Boolean));
          const usedSkus = prev.filter((s) => usedCodes.has(s.skuCode));
          const merged = [...results];
          usedSkus.forEach((u) => { if (!merged.find((s) => s.skuCode === u.skuCode)) merged.unshift(u); });
          return merged;
        });
      } catch {}
    }, 350);
  };

  const handleSelectSku = (rowId: string, skuCode: string) => {
    const sku = skuOptions.find((s) => s.skuCode === skuCode);
    setItems((prev) => prev.map((i) => i.id === rowId ? { ...i, skuCode, skuName: sku?.skuName ?? "" } : i));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: string) =>
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i));

  const addItem = () => setItems((prev) => [...prev, emptyRow()]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = async () => {
    if (!receiving) return;
    const validItems = items.filter((i) => i.skuCode.trim());
    if (validItems.length === 0) { toast.error("Vui lòng thêm ít nhất 1 sản phẩm"); return; }
    const bad = validItems.find((i) => !i.expectedQty || Number(i.expectedQty) <= 0);
    if (bad) { toast.error(`Vui lòng nhập số lượng cho SKU: ${bad.skuCode}`); return; }
    setSaving(true);
    try {
      await updateDraftReceivingOrder(receiving.receivingId, {
        warehouseId: receiving.warehouseId,
        sourceType,
        supplierCode: supplierCode || null,
        sourceReferenceCode: sourceReferenceCode.trim() || null,
        note: note.trim() || null,
        items: validItems.map((i) => ({
          skuCode: i.skuCode,
          expectedQty: Number(i.expectedQty),
          lotNumber: i.lotNumber.trim() || null,
          expiryDate: i.expiryDate || null,
          manufactureDate: i.manufactureDate || null,
        })),
      });
      toast.success("Đã lưu thay đổi");
      onRefresh();
    } catch {
    } finally { setSaving(false); }
  };

  if (!open || !receiving) return null;

  const badge = STATUS_BADGE[receiving.status] ?? { label: receiving.status, className: "bg-gray-100 text-gray-600" };
  const totalDetailPages = Math.ceil(detailItems.length / ITEMS_PER_PAGE);
  const pagedItems = detailItems.slice(itemPage * ITEMS_PER_PAGE, (itemPage + 1) * ITEMS_PER_PAGE);

  return (
    <Portal>
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      {/* Modal — wider for comfort */}
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col max-h-[94vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="material-symbols-outlined text-blue-600 text-[20px]">receipt_long</span>
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-gray-900 font-mono">{receiving.receivingCode}</h3>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${badge.className}`}>
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Tạo bởi <span className="font-medium text-gray-600">{receiving.createdByName}</span>
                {" · "}
                {new Date(receiving.createdAt).toLocaleString("vi-VN")}
              </p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

          {/* ── Section: Thông tin chung ── */}
          <div>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest mb-3">
              Thông tin chung
            </p>
            <div className="grid grid-cols-2 gap-4">

              {/* Kho nhận — always read-only */}
              <ReadField label="Kho nhận hàng" value={receiving.warehouseName} />

              {/* Loại nhập kho */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Loại nhập kho {isDraft && <span className="text-red-500 normal-case">*</span>}
                </label>
                {isDraft ? (
                  <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                    <option value="SUPPLIER">Nhập từ nhà cung cấp</option>
                    <option value="TRANSFER">Chuyển kho</option>
                    <option value="RETURN">Hàng trả về</option>
                  </select>
                ) : (
                  <div className="px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {receiving.sourceType}
                  </div>
                )}
              </div>

              {/* Nhà cung cấp */}
              {(sourceType === "SUPPLIER" || receiving.supplierName) && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Nhà cung cấp</label>
                  {isDraft ? (
                    <Select showSearch loading={loadingData}
                      placeholder="Tìm và chọn nhà cung cấp..."
                      style={{ width: "100%", height: 40 }}
                      value={supplierCode || undefined}
                      onChange={(val) => setSupplierCode(val)}
                      filterOption={(input, option) =>
                        ((option?.label as string) ?? "").toLowerCase().includes(input.toLowerCase())
                      }
                      options={suppliers.map((s) => ({
                        value: s.supplierCode,
                        label: `${s.supplierName} (${s.supplierCode})`,
                      }))}
                    />
                  ) : (
                    <ReadField label="" value={receiving.supplierName} />
                  )}
                </div>
              )}

              {/* Số chứng từ */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Số chứng từ / PO</label>
                {isDraft ? (
                  <input type="text" value={sourceReferenceCode}
                    onChange={(e) => setSourceReferenceCode(e.target.value)}
                    placeholder="VD: PO-2024-001"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-800">
                    {receiving.sourceReferenceCode ?? <span className="text-gray-400 italic">—</span>}
                  </div>
                )}
              </div>

              {/* Ghi chú — full width */}
              <div className="col-span-2 space-y-1.5">
                <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">Ghi chú</label>
                {isDraft ? (
                  <input type="text" value={note} onChange={(e) => setNote(e.target.value)}
                    placeholder="VD: Xe tải 29C-12345 giao lúc 10h"
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                ) : (
                  <div className="px-3.5 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-700 min-h-[40px]">
                    {receiving.note ?? <span className="text-gray-400 italic">Không có ghi chú</span>}
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-gray-100" />

          {/* ── Section: Danh sách sản phẩm ── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-widest">
                  Danh sách sản phẩm
                </p>
                <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {isDraft ? items.length : detailItems.length} dòng
                </span>
              </div>
              {isDraft && (
                <button onClick={addItem}
                  className="flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  Thêm dòng
                </button>
              )}
            </div>

            {/* Loading */}
            {loadingDetail ? (
              <div className="border border-gray-200 rounded-xl">
                <div className="py-12 flex flex-col items-center gap-3">
                  <span className="material-symbols-outlined text-[32px] animate-spin text-blue-400">progress_activity</span>
                  <span className="text-sm text-gray-400">Đang tải danh sách sản phẩm...</span>
                </div>
              </div>
            ) : isDraft ? (
              /* ──────────────────────────────────────────
                 DRAFT: card-based editable rows
              ────────────────────────────────────────── */
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id}
                    className="border border-gray-200 rounded-xl bg-white hover:border-blue-200 hover:shadow-sm transition-all">

                    {/* Row header */}
                    <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-t-xl border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500">Sản phẩm #{idx + 1}</span>
                      <button onClick={() => removeItem(item.id)} disabled={items.length <= 1}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 disabled:opacity-25 disabled:cursor-not-allowed transition-colors">
                        <span className="material-symbols-outlined text-[14px]">delete</span>
                        Xoá
                      </button>
                    </div>

                    {/* Row fields */}
                    <div className="px-4 py-3 space-y-3">

                      {/* SKU — full width */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-gray-500">SKU <span className="text-red-500">*</span></label>
                        <Select showSearch
                          placeholder="Tìm kiếm SKU theo mã hoặc tên..."
                          style={{ width: "100%", height: 40 }}
                          value={item.skuCode || undefined}
                          onSearch={handleSkuSearch}
                          onChange={(val) => handleSelectSku(item.id, val)}
                          filterOption={false}
                          options={skuOptions.map((s) => ({
                            value: s.skuCode,
                            label: `${s.skuCode} — ${s.skuName}`,
                          }))}
                          optionRender={(option) => (
                            <div className="py-0.5">
                              <span className="font-mono font-semibold text-gray-900 text-xs">
                                {(option.data as any).value}
                              </span>
                              <span className="text-gray-400 ml-2 text-xs">
                                {(option.data as any).label?.split(" — ")[1]}
                              </span>
                            </div>
                          )}
                        />
                        {item.skuName && (
                          <p className="text-xs text-blue-600 font-medium pl-1">↳ {item.skuName}</p>
                        )}
                      </div>

                      {/* Grid: SL + Lô + HSD + NSX */}
                      <div className="grid grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-500">
                            SL dự kiến <span className="text-red-500">*</span>
                          </label>
                          <input type="number" min="1"
                            value={item.expectedQty}
                            onChange={(e) => updateItem(item.id, "expectedQty", e.target.value)}
                            placeholder="0"
                            className={`w-full px-3 py-2.5 text-sm border rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                              !item.expectedQty || Number(item.expectedQty) <= 0
                                ? "border-red-300 bg-red-50 text-red-700"
                                : "border-gray-300"
                            }`}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-500">Số lô</label>
                          <input type="text" value={item.lotNumber}
                            onChange={(e) => updateItem(item.id, "lotNumber", e.target.value)}
                            placeholder="VD: LOT001"
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-500">HSD</label>
                          <input type="date" value={item.expiryDate}
                            onChange={(e) => updateItem(item.id, "expiryDate", e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs font-medium text-gray-500">NSX</label>
                          <input type="date" value={item.manufactureDate}
                            onChange={(e) => updateItem(item.id, "manufactureDate", e.target.value)}
                            className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
                        </div>
                      </div>

                    </div>
                  </div>
                ))}

                {/* Add button at bottom */}
                <button onClick={addItem}
                  className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm font-medium text-gray-400 hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  Thêm sản phẩm
                </button>
              </div>
            ) : (
              /* ──────────────────────────────────────────
                 Non-DRAFT: view-only table + pagination
              ────────────────────────────────────────── */
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Tên sản phẩm</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">SL dự kiến</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">SL thực nhận</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Số lô</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">HSD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center">
                          <span className="material-symbols-outlined text-[36px] text-gray-200 block mb-2">inventory_2</span>
                          <span className="text-sm text-gray-400">Không có sản phẩm nào</span>
                        </td>
                      </tr>
                    ) : (
                      pagedItems.map((item) => {
                        const diff = (item.receivedQty ?? 0) - item.expectedQty;
                        const hasReceived = (item.receivedQty ?? 0) > 0;
                        return (
                          <tr key={item.receivingItemId} className="hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-sm text-gray-900">{item.skuCode}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{item.skuName}</td>
                            <td className="px-4 py-3 text-center font-semibold text-gray-900">{item.expectedQty}</td>
                            <td className="px-4 py-3 text-center">
                              {hasReceived ? (
                                <span className={`inline-flex items-center gap-1 font-bold text-sm ${
                                  diff < 0 ? "text-red-600" : diff > 0 ? "text-orange-600" : "text-green-600"
                                }`}>
                                  {item.receivedQty}
                                  {diff !== 0 && (
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                                      diff < 0 ? "bg-red-50" : "bg-orange-50"
                                    }`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-gray-300 font-medium">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500 font-mono">
                              {item.lotNumber ?? <span className="text-gray-300">—</span>}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-gray-500">
                              {item.expiryDate ?? <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                {detailItems.length > ITEMS_PER_PAGE && (
                  <MiniPagination
                    page={itemPage} totalPages={totalDetailPages}
                    totalItems={detailItems.length} pageSize={ITEMS_PER_PAGE}
                    onPrev={() => setItemPage((p) => Math.max(0, p - 1))}
                    onNext={() => setItemPage((p) => Math.min(totalDetailPages - 1, p + 1))}
                  />
                )}
              </div>
            )}
          </div>

        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex-shrink-0 rounded-b-2xl">
          <div className="text-xs text-gray-400">
            {isDraft && "Thay đổi chưa được lưu sẽ bị mất khi đóng"}
          </div>
          <div className="flex gap-2.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {isDraft ? "Huỷ bỏ" : "Đóng"}
            </Button>
            {isDraft && (
              <Button size="sm" isLoading={saving} onClick={handleSave}>
                <span className="material-symbols-outlined text-[16px]">save</span>
                Lưu thay đổi
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
    </Portal>
  );
}
