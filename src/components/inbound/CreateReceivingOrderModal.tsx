"use client";

import { useEffect, useState, useRef } from "react";
import { Select } from "antd";
import { Button } from "@/components/ui/Button";
import { fetchSuppliers, type Supplier } from "@/services/supplierService";
import { fetchWarehouses, type Warehouse } from "@/services/warehouseService";
import { searchSkus, type SkuOption } from "@/services/skuService";
import { createDraftReceivingOrder } from "@/services/receivingOrdersService";
import toast from "react-hot-toast";

interface ItemRow {
  id: string; // local key
  skuCode: string;
  skuName: string;
  expectedQty: string;
  lotNumber: string;
  expiryDate: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (receivingId: number) => void;
}

export default function CreateReceivingOrderModal({
  open,
  onClose,
  onCreated,
}: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [skus, setSkus] = useState<SkuOption[]>([]);
  const [skuSearch, setSkuSearch] = useState("");
  const [loadingSupplier, setLoadingSupplier] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [sourceType, setSourceType] = useState<string>("SUPPLIER");
  const [supplierCode, setSupplierCode] = useState<string>("");
  const [sourceReferenceCode, setSourceReferenceCode] = useState("");
  const [note, setNote] = useState("");
  const [items, setItems] = useState<ItemRow[]>([
    {
      id: "1",
      skuCode: "",
      skuName: "",
      expectedQty: "",
      lotNumber: "",
      expiryDate: "",
    },
  ]);

  const skuSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load suppliers khi mở modal
  useEffect(() => {
    if (!open) return;
    setLoadingSupplier(true);
    fetchSuppliers()
      .then(setSuppliers)
      .catch(() => toast.error("Không tải được danh sách nhà cung cấp"))
      .finally(() => setLoadingSupplier(false));
    fetchWarehouses()
      .then(setWarehouses)
      .catch(() => {});
    // Load SKU ban đầu
    searchSkus()
      .then(setSkus)
      .catch(() => {});

    // Reset form
    setSourceType("SUPPLIER");
    setSupplierCode("");
    setWarehouseId(null);
    setSourceReferenceCode("");
    setNote("");
    setItems([
      {
        id: "1",
        skuCode: "",
        skuName: "",
        expectedQty: "",
        lotNumber: "",
        expiryDate: "",
      },
    ]);
  }, [open]);

  // Debounce SKU search
  const handleSkuSearch = (val: string) => {
    setSkuSearch(val);
    if (skuSearchTimer.current) clearTimeout(skuSearchTimer.current);
    skuSearchTimer.current = setTimeout(() => {
      searchSkus(val)
        .then(setSkus)
        .catch(() => {});
    }, 350);
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        skuCode: "",
        skuName: "",
        expectedQty: "",
        lotNumber: "",
        expiryDate: "",
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const updateItem = (id: string, field: keyof ItemRow, value: string) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
    );
  };

  const handleSelectSku = (id: string, skuCode: string) => {
    const sku = skus.find((s) => s.skuCode === skuCode);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, skuCode, skuName: sku?.skuName ?? "" } : i,
      ),
    );
  };

  const handleSubmit = async () => {
    if (!warehouseId) {
      toast.error("Vui lòng chọn kho nhận hàng");
      return;
    }
    // Validate
    if (sourceType === "SUPPLIER" && !supplierCode) {
      toast.error("Vui lòng chọn nhà cung cấp");
      return;
    }

    const validItems = items.filter((i) => i.skuCode.trim());
    if (validItems.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 sản phẩm");
      return;
    }

    // Bắt buộc nhập số lượng dự kiến — nếu để 0 sẽ gây lệch → PENDING_INCIDENT
    const missingQty = validItems.find(
      (i) => !i.expectedQty || Number(i.expectedQty) <= 0,
    );
    if (missingQty) {
      toast.error(
        `Vui lòng nhập số lượng dự kiến cho SKU: ${missingQty.skuCode}`,
      );
      return;
    }

    setSubmitting(true);
    try {
      console.log("Creating order with payload:", {
        warehouseId,
        sourceType,
        supplierCode,
        items: validItems,
      });

      const result = await createDraftReceivingOrder({
        warehouseId: warehouseId!,
        sourceType,
        supplierCode: supplierCode || null,
        sourceReferenceCode: sourceReferenceCode.trim() || null,
        note: note.trim() || null,
        items: validItems.map((i) => ({
          skuCode: i.skuCode,
          expectedQty: i.expectedQty ? Number(i.expectedQty) : null,
          lotNumber: i.lotNumber.trim() || null,
          expiryDate: i.expiryDate || null,
        })),
      });

      toast.success(`Tạo phiếu thành công: ${result.receivingCode}`);
      onCreated(result.receivingId);
      onClose();
    } catch {
      // axios interceptor đã hiện toast lỗi
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Tạo phiếu nhận hàng
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Phiếu sẽ được tạo ở trạng thái DRAFT
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 text-gray-400"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Kho nhận hàng */}
          <div className="space-y-1 col-span-2">
            <label className="text-xs font-medium text-gray-700">
              Kho nhận hàng <span className="text-red-500">*</span>
            </label>
            <Select
              placeholder="Chọn kho nhận hàng..."
              style={{ width: "100%" }}
              value={warehouseId ?? undefined}
              onChange={(val) => setWarehouseId(val)}
              options={warehouses.map((w) => ({
                value: w.warehouseId,
                label: `${w.warehouseName} (${w.warehouseCode})`,
              }))}
            />
          </div>
          {/* Source Type */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Loại nhập kho <span className="text-red-500">*</span>
              </label>
              <select
                value={sourceType}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="SUPPLIER">Nhập từ nhà cung cấp</option>
                <option value="TRANSFER">Chuyển kho</option>
                <option value="RETURN">Hàng trả về</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Số chứng từ / PO
              </label>
              <input
                type="text"
                placeholder="VD: PO-2024-001"
                value={sourceReferenceCode}
                onChange={(e) => setSourceReferenceCode(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Supplier — chỉ hiện khi SUPPLIER */}
          {sourceType === "SUPPLIER" && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-700">
                Nhà cung cấp <span className="text-red-500">*</span>
              </label>
              <Select
                showSearch
                loading={loadingSupplier}
                placeholder="Chọn nhà cung cấp..."
                style={{ width: "100%" }}
                value={supplierCode || undefined}
                onChange={(val) => setSupplierCode(val)}
                filterOption={(input, option) =>
                  ((option?.label as string) ?? "")
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
                options={suppliers.map((s) => ({
                  value: s.supplierCode,
                  label: `${s.supplierName} (${s.supplierCode})`,
                }))}
              />
            </div>
          )}

          {/* Note */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-700">Ghi chú</label>
            <input
              type="text"
              placeholder="VD: Xe tải 29C-12345 giao hàng lúc 10h"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-700">
                Danh sách sản phẩm <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={addItem}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Thêm dòng
              </button>
            </div>

            {/* Header row */}
            <div className="grid grid-cols-12 gap-1.5 text-xs font-medium text-gray-500 px-1">
              <div className="col-span-4">SKU</div>
              <div className="col-span-2 text-center">Số lượng</div>
              <div className="col-span-2">Số lô</div>
              <div className="col-span-3">Hạn dùng</div>
              <div className="col-span-1" />
            </div>

            {/* Item rows */}
            {items.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-1.5 items-center"
              >
                {/* SKU select */}
                <div className="col-span-4">
                  <Select
                    showSearch
                    placeholder="Chọn SKU..."
                    style={{ width: "100%" }}
                    size="small"
                    value={item.skuCode || undefined}
                    onSearch={handleSkuSearch}
                    onChange={(val) => handleSelectSku(item.id, val)}
                    filterOption={false}
                    options={skus.map((s) => ({
                      value: s.skuCode,
                      label: `${s.skuCode} — ${s.skuName}`,
                    }))}
                  />
                </div>

                {/* Expected Qty */}
                <div className="col-span-2">
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="SL *"
                    value={item.expectedQty}
                    onChange={(e) =>
                      updateItem(item.id, "expectedQty", e.target.value)
                    }
                    className={`w-full px-2 py-1 text-xs border rounded text-center focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                      !item.expectedQty || Number(item.expectedQty) <= 0
                        ? "border-red-300 bg-red-50"
                        : "border-gray-300"
                    }`}
                  />
                </div>

                {/* Lot Number */}
                <div className="col-span-2">
                  <input
                    type="text"
                    placeholder="LOT..."
                    value={item.lotNumber}
                    onChange={(e) =>
                      updateItem(item.id, "lotNumber", e.target.value)
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Expiry Date */}
                <div className="col-span-3">
                  <input
                    type="date"
                    value={item.expiryDate}
                    onChange={(e) =>
                      updateItem(item.id, "expiryDate", e.target.value)
                    }
                    className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Remove */}
                <div className="col-span-1 flex justify-center">
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={items.length === 1}
                    className="text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">
                      delete
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Huỷ
          </Button>
          <Button size="sm" isLoading={submitting} onClick={handleSubmit}>
            Tạo phiếu
          </Button>
        </div>
      </div>
    </div>
  );
}
