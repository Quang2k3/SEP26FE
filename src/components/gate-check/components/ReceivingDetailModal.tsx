"use client";

import { useEffect, useRef, useState } from "react";
import { Select } from "antd";
import { Button } from "@/components/ui/Button";
import { fetchSuppliers, type Supplier } from "@/services/supplierService";
import { searchSkus, type SkuOption } from "@/services/skuService";
import {
  updateDraftReceivingOrder,
  type UpdateReceivingOrderPayload,
} from "@/services/receivingOrdersService";
import type { ReceivingOrder } from "@/interfaces/receiving";
import { STATUS_BADGE } from "./columns";
import toast from "react-hot-toast";

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

export default function ReceivingDetailModal({ open, receiving, onClose, onRefresh }: Props) {
  const isDraft = receiving?.status === "DRAFT";

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  // skuOptions gộp: SKU từ items hiện có + kết quả search
  const [skuOptions, setSkuOptions] = useState<SkuOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  const [sourceType, setSourceType] = useState("SUPPLIER");
  const [supplierCode, setSupplierCode] = useState("");
  const [sourceReferenceCode, setSourceReferenceCode] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const skuTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load khi mở modal
  useEffect(() => {
    if (!open || !receiving) return;

    // Fill form fields
    setSourceType(receiving.sourceType ?? "SUPPLIER");
    setSourceReferenceCode(receiving.sourceReferenceCode ?? "");
    setNote(receiving.note ?? "");

    // Convert receiving.items → ItemRow (giữ nguyên data, không reset)
    const rows: ItemRow[] = (receiving.items ?? []).map((item, i) => ({
      id: String(item.receivingItemId ?? i),
      skuCode: item.skuCode ?? "",
      skuName: item.skuName ?? "",
      expectedQty: String(item.expectedQty ?? ""),
      lotNumber: item.lotNumber ?? "",
      expiryDate: item.expiryDate ?? "",
      manufactureDate: item.manufactureDate ?? "",
    }));
    setItems(rows);

    if (!isDraft) return;

    // DRAFT: load suppliers + SKUs
    setLoadingData(true);
    Promise.all([
      fetchSuppliers(),
      searchSkus(), // load 50 SKU mặc định
    ])
      .then(([supplierList, skuList]) => {
        setSuppliers(supplierList);

        // Gộp SKU của items hiện có vào options để Select hiển thị đúng
        const existingSkus: SkuOption[] = rows
          .filter(r => r.skuCode)
          .map(r => ({
            skuId: 0,
            skuCode: r.skuCode,
            skuName: r.skuName,
            unit: null,
            barcode: null,
          }));

        // Merge: ưu tiên kết quả search, không trùng skuCode
        const merged = [...skuList];
        existingSkus.forEach(e => {
          if (!merged.find(s => s.skuCode === e.skuCode)) {
            merged.unshift(e); // thêm vào đầu nếu chưa có
          }
        });
        setSkuOptions(merged);

        // Resolve supplierCode từ supplierId
        if (receiving.supplierId) {
          const found = supplierList.find(s => s.supplierId === receiving.supplierId);
          setSupplierCode(found?.supplierCode ?? "");
        } else {
          setSupplierCode("");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingData(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, receiving?.receivingId]);

  // Debounce search SKU — giữ lại các SKU hiện có trong options
  const handleSkuSearch = (val: string) => {
    if (skuTimer.current) clearTimeout(skuTimer.current);
    skuTimer.current = setTimeout(async () => {
      try {
        const results = await searchSkus(val);
        setSkuOptions(prev => {
          // Giữ lại SKU đang được dùng trong items
          const usedCodes = new Set(items.map(i => i.skuCode).filter(Boolean));
          const usedSkus = prev.filter(s => usedCodes.has(s.skuCode));
          const merged = [...results];
          usedSkus.forEach(u => {
            if (!merged.find(s => s.skuCode === u.skuCode)) merged.unshift(u);
          });
          return merged;
        });
      } catch {}
    }, 350);
  };

  const handleSelectSku = (rowId: string, skuCode: string) => {
    const sku = skuOptions.find(s => s.skuCode === skuCode);
    setItems(prev => prev.map(i =>
      i.id === rowId ? { ...i, skuCode, skuName: sku?.skuName ?? "" } : i
    ));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: string) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const addItem = () => setItems(prev => [...prev, {
    id: `new_${Date.now()}`,
    skuCode: "", skuName: "", expectedQty: "",
    lotNumber: "", expiryDate: "", manufactureDate: "",
  }]);

  const removeItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSave = async () => {
    if (!receiving) return;
    const validItems = items.filter(i => i.skuCode.trim());
    if (validItems.length === 0) { toast.error("Vui lòng thêm ít nhất 1 sản phẩm"); return; }
    const bad = validItems.find(i => !i.expectedQty || Number(i.expectedQty) <= 0);
    if (bad) { toast.error(`Vui lòng nhập số lượng cho SKU: ${bad.skuCode}`); return; }

    setSaving(true);
    try {
      await updateDraftReceivingOrder(receiving.receivingId, {
        warehouseId: receiving.warehouseId,
        sourceType,
        supplierCode: supplierCode || null,
        sourceReferenceCode: sourceReferenceCode.trim() || null,
        note: note.trim() || null,
        items: validItems.map(i => ({
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
    } finally {
      setSaving(false);
    }
  };

  if (!open || !receiving) return null;

  const badge = STATUS_BADGE[receiving.status] ?? {
    label: receiving.status, className: "bg-gray-100 text-gray-600"
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">{receiving.receivingCode}</h3>
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${badge.className}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Tạo bởi <strong>{receiving.createdByName}</strong> · {new Date(receiving.createdAt).toLocaleString("vi-VN")}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

          {/* Thông tin chung — luôn hiện */}
          <div className="grid grid-cols-2 gap-3">
            {/* Kho — read only */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-500">Kho nhận hàng</label>
              <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                {receiving.warehouseName ?? "—"}
              </div>
            </div>

            {/* Loại nhập */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Loại nhập kho {isDraft && <span className="text-red-500">*</span>}
              </label>
              {isDraft ? (
                <select
                  value={sourceType}
                  onChange={e => setSourceType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SUPPLIER">Nhập từ nhà cung cấp</option>
                  <option value="TRANSFER">Chuyển kho</option>
                  <option value="RETURN">Hàng trả về</option>
                </select>
              ) : (
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  {receiving.sourceType}
                </div>
              )}
            </div>

            {/* Nhà cung cấp */}
            {(sourceType === "SUPPLIER" || receiving.supplierName) && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Nhà cung cấp</label>
                {isDraft ? (
                  <Select
                    showSearch
                    loading={loadingData}
                    placeholder="Chọn nhà cung cấp..."
                    style={{ width: "100%" }}
                    value={supplierCode || undefined}
                    onChange={val => setSupplierCode(val)}
                    filterOption={(input, option) =>
                      ((option?.label as string) ?? "").toLowerCase().includes(input.toLowerCase())
                    }
                    options={suppliers.map(s => ({
                      value: s.supplierCode,
                      label: `${s.supplierName} (${s.supplierCode})`,
                    }))}
                  />
                ) : (
                  <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                    {receiving.supplierName ?? "—"}
                  </div>
                )}
              </div>
            )}

            {/* Số chứng từ */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">Số chứng từ / PO</label>
              {isDraft ? (
                <input
                  type="text"
                  value={sourceReferenceCode}
                  onChange={e => setSourceReferenceCode(e.target.value)}
                  placeholder="VD: PO-2024-001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                  {receiving.sourceReferenceCode ?? "—"}
                </div>
              )}
            </div>

            {/* Ghi chú — full width */}
            <div className="col-span-2 space-y-1">
              <label className="text-xs font-medium text-gray-700">Ghi chú</label>
              {isDraft ? (
                <input
                  type="text"
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="VD: Xe tải 29C-12345 giao lúc 10h"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                receiving.note ? (
                  <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-700">
                    {receiving.note}
                  </div>
                ) : (
                  <div className="px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-400 italic">
                    Không có ghi chú
                  </div>
                )
              )}
            </div>
          </div>

          {/* ── Items ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                Danh sách sản phẩm
                <span className="ml-1.5 normal-case font-normal text-gray-400">
                  ({isDraft ? items.length : (receiving.items?.length ?? 0)} dòng)
                </span>
              </p>
              {isDraft && (
                <button
                  onClick={addItem}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  Thêm dòng
                </button>
              )}
            </div>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {/* ── DRAFT: editable table ── */}
              {isDraft ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-2 text-left text-gray-500 font-semibold w-[180px]">SKU</th>
                      <th className="px-2 py-2 text-center text-gray-500 font-semibold w-16">SL dự kiến</th>
                      <th className="px-2 py-2 text-center text-gray-500 font-semibold w-24">Số lô</th>
                      <th className="px-2 py-2 text-center text-gray-500 font-semibold w-28">HSD</th>
                      <th className="px-2 py-2 text-center text-gray-500 font-semibold w-28">NSX</th>
                      <th className="px-2 py-2 w-7" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {items.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        {/* SKU select — hiện đúng tên vì options đã có sẵn */}
                        <td className="px-2 py-1.5">
                          <Select
                            showSearch
                            placeholder="Chọn SKU..."
                            style={{ width: "100%" }}
                            size="small"
                            value={item.skuCode || undefined}
                            onSearch={handleSkuSearch}
                            onChange={val => handleSelectSku(item.id, val)}
                            filterOption={false}
                            options={skuOptions.map(s => ({
                              value: s.skuCode,
                              label: `${s.skuCode} — ${s.skuName}`,
                            }))}
                            optionRender={option => (
                              <div>
                                <span className="font-mono font-semibold text-gray-800">
                                  {(option.data as any).value}
                                </span>
                                <span className="text-gray-500 ml-2 text-[11px]">
                                  {(option.data as any).label?.split(" — ")[1]}
                                </span>
                              </div>
                            )}
                          />
                          {/* Hiện tên SKU bên dưới để dễ nhìn */}
                          {item.skuName && (
                            <p className="text-[10px] text-gray-400 mt-0.5 px-0.5 truncate">
                              {item.skuName}
                            </p>
                          )}
                        </td>
                        {/* SL dự kiến */}
                        <td className="px-2 py-1.5">
                          <input
                            type="number" min="1"
                            value={item.expectedQty}
                            onChange={e => updateItem(item.id, "expectedQty", e.target.value)}
                            className={`w-full px-2 py-1 text-xs border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                              !item.expectedQty || Number(item.expectedQty) <= 0
                                ? "border-red-300 bg-red-50"
                                : "border-gray-300"
                            }`}
                          />
                        </td>
                        {/* Số lô */}
                        <td className="px-2 py-1.5">
                          <input
                            type="text"
                            value={item.lotNumber}
                            onChange={e => updateItem(item.id, "lotNumber", e.target.value)}
                            placeholder="LOT..."
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        {/* HSD */}
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            value={item.expiryDate}
                            onChange={e => updateItem(item.id, "expiryDate", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        {/* NSX */}
                        <td className="px-2 py-1.5">
                          <input
                            type="date"
                            value={item.manufactureDate}
                            onChange={e => updateItem(item.id, "manufactureDate", e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </td>
                        {/* Xóa */}
                        <td className="px-1 py-1.5 text-center">
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={items.length <= 1}
                            className="text-gray-300 hover:text-red-500 disabled:opacity-20 transition-colors"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                /* ── Non-DRAFT: view only ── */
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">SKU</th>
                      <th className="px-3 py-2 text-left text-gray-500 font-semibold">Tên SP</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">SL dự kiến</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">SL thực nhận</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">Số lô</th>
                      <th className="px-3 py-2 text-center text-gray-500 font-semibold">HSD</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(receiving.items ?? []).map(item => (
                      <tr key={item.receivingItemId} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-semibold text-gray-900">{item.skuCode}</td>
                        <td className="px-3 py-2 text-gray-700">{item.skuName}</td>
                        <td className="px-3 py-2 text-center font-medium text-gray-900">{item.expectedQty}</td>
                        <td className="px-3 py-2 text-center">
                          {item.receivedQty > 0 ? (
                            <span className={`font-bold ${
                              item.receivedQty < item.expectedQty ? "text-red-600" :
                              item.receivedQty > item.expectedQty ? "text-orange-600" :
                              "text-green-600"
                            }`}>
                              {item.receivedQty}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center text-gray-500">{item.lotNumber ?? "—"}</td>
                        <td className="px-3 py-2 text-center text-gray-500">{item.expiryDate ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-2 px-5 py-3 border-t bg-gray-50/50 flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {isDraft ? "Huỷ" : "Đóng"}
          </Button>
          {isDraft && (
            <Button size="sm" isLoading={saving} onClick={handleSave}>
              <span className="material-symbols-outlined text-sm">save</span>
              Lưu thay đổi
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}