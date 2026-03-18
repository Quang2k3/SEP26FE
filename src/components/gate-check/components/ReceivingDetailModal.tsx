'use client';

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { fetchSuppliers, type Supplier } from '@/services/supplierService';
import { fetchWarehouses, type Warehouse } from '@/services/warehouseService';
import { searchSkusSimple, type SkuOption } from '@/services/skuService';
import { createDraftReceivingOrder } from '@/services/receivingOrdersService';
import toast from 'react-hot-toast';
import Portal from '@/components/ui/Portal';
import { createPortal } from 'react-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemRow {
  id: string;
  skuId: number | null;
  skuCode: string;
  skuName: string;
  expectedQty: string;
  lotNumber: string;
  manufactureDate: string;
  expiryDate: string;
  // validation
  mfgError?: string;
  expError?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: (receivingId: number) => void;
}

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-gray-400 transition-all';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
        {label}{required && <span className="text-red-400 ml-1 normal-case font-normal">*</span>}
      </label>
      {children}
    </div>
  );
}

// ─── Expiry helpers (từ expiryUtils) ─────────────────────────────────────────
import { getExpiryInfo, EXPIRY_STYLE, validateReceivingDates } from '@/utils/expiryUtils';

function validateDates(manufactureDate: string, expiryDate: string) {
  return validateReceivingDates(manufactureDate, expiryDate);
}

// ─── Portal Dropdown ─────────────────────────────────────────────────────────
// Render dropdown vào document.body → thoát khỏi overflow:hidden của modal

function DropdownPortal({ anchorRef, open, children }: {
  anchorRef: React.RefObject<HTMLElement>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [style, setStyle] = useState<React.CSSProperties>({});

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const dropH = Math.min(220, Math.max(spaceBelow, spaceAbove) - 8);

    // Hiện bên dưới nếu còn chỗ, ngược lại hiện bên trên
    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      setStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: dropH,
        zIndex: 9999,
      });
    } else {
      setStyle({
        position: 'fixed',
        bottom: window.innerHeight - rect.top + 4,
        left: rect.left,
        width: rect.width,
        maxHeight: dropH,
        zIndex: 9999,
      });
    }
  }, [open, anchorRef]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div style={style}
      className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

// ─── SKU Search Combobox ──────────────────────────────────────────────────────

function SkuCombobox({ value, onSelect }: {
  value: { skuCode: string; skuName: string } | null;
  onSelect: (sku: SkuOption | null) => void;
}) {
  const [inputVal,  setInputVal]  = useState('');
  const [results,   setResults]   = useState<SkuOption[]>([]);
  const [open,      setOpen]      = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef     = useRef<HTMLDivElement>(null);
  const isConfirmed = useRef(false);

  useEffect(() => {
    if (!value) { if (!isConfirmed.current) setInputVal(''); }
    else setInputVal(`${value.skuCode} — ${value.skuName}`);
    isConfirmed.current = false;
  }, [value?.skuCode]);

  useEffect(() => {
    searchSkusSimple('').then(setResults).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        if (!isConfirmed.current && value) setInputVal(`${value.skuCode} — ${value.skuName}`);
      }
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [value]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setInputVal(q);
    isConfirmed.current = false;
    setOpen(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      try { setResults(await searchSkusSimple(q)); }
      catch { }
      finally { setSearching(false); }
    }, 250);
  };

  const handleSelect = (sku: SkuOption) => {
    isConfirmed.current = true;
    setInputVal(`${sku.skuCode} — ${sku.skuName}`);
    setOpen(false);
    onSelect(sku);
  };

  const handleClear = () => {
    isConfirmed.current = false;
    setInputVal('');
    onSelect(null);
    searchSkusSimple('').then(setResults).catch(() => {});
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">inventory_2</span>
        <input type="text" value={inputVal} placeholder="Tìm mã hoặc tên SKU..."
          className={`${inputCls} pl-8 ${value ? 'pr-8' : ''}`}
          onFocus={() => setOpen(true)}
          onChange={handleInput}
          autoComplete="off"
        />
        {value && (
          <button type="button" onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors">
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        )}
      </div>

      <DropdownPortal anchorRef={wrapRef as React.RefObject<HTMLElement>} open={open}>
        {searching ? (
          <div className="flex items-center justify-center py-4 gap-2 text-xs text-gray-400">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[16px]">progress_activity</span>
            Đang tìm...
          </div>
        ) : results.length === 0 ? (
          <div className="px-3 py-3 text-xs text-gray-400 text-center">Không tìm thấy SKU</div>
        ) : (
          results.map(s => (
            <button key={s.skuCode} type="button"
              className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors ${value?.skuCode === s.skuCode ? 'bg-indigo-50' : ''}`}
              onMouseDown={e => { e.preventDefault(); handleSelect(s); }}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-600">{s.skuCode}</span>
                {s.unit && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{s.unit}</span>}
              </div>
              <p className="text-xs text-gray-600 mt-0.5 truncate">{s.skuName}</p>
            </button>
          ))
        )}
      </DropdownPortal>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
// ─── Main Modal ───────────────────────────────────────────────────────────────

function makeItem(id?: string): ItemRow {
  return { id: id ?? Date.now().toString(), skuId: null, skuCode: '', skuName: '', expectedQty: '', lotNumber: '', manufactureDate: '', expiryDate: '' };
}

export default function CreateReceivingOrderModal({ open, onClose, onCreated }: Props) {
  const [suppliers,       setSuppliers]       = useState<Supplier[]>([]);
  const [warehouses,      setWarehouses]       = useState<Warehouse[]>([]);
  const [loadingSupplier, setLoadingSupplier]  = useState(false);
  const [warehouseId,     setWarehouseId]      = useState<number | null>(null);
  const [submitting,      setSubmitting]       = useState(false);
  const [sourceType,      setSourceType]       = useState('SUPPLIER');
  const [supplierCode,    setSupplierCode]     = useState('');
  const [supplierSearch,  setSupplierSearch]   = useState('');
  const [supplierOpen,    setSupplierOpen]     = useState(false);
  const [sourceRef,       setSourceRef]        = useState('');
  const [note,            setNote]             = useState('');
  const [items,           setItems]            = useState<ItemRow[]>([makeItem('1')]);
  const supplierRef = useRef<HTMLDivElement>(null);

  // State cho modal xác nhận quarantine
  const [quarantineModal, setQuarantineModal] = useState<{
    open: boolean;
    items: ItemRow[];
    onConfirm: (goQuarantine: boolean) => void;
  }>({ open: false, items: [], onConfirm: () => {} });

  useEffect(() => {
    if (!open) return;
    setLoadingSupplier(true);
    fetchSuppliers().then(setSuppliers).catch(() => toast.error('Không tải được nhà cung cấp')).finally(() => setLoadingSupplier(false));
    fetchWarehouses().then(ws => { setWarehouses(ws); if (ws.length === 1) setWarehouseId(ws[0].warehouseId); }).catch(() => {});
    setSourceType('SUPPLIER'); setSupplierCode(''); setSupplierSearch('');
    setWarehouseId(null); setSourceRef(''); setNote('');
    setItems([makeItem('1')]);
  }, [open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node)) setSupplierOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const updateItem = useCallback((id: string, field: keyof ItemRow, val: string | number | null) => {
    setItems(p => p.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: val };
      // Re-validate dates whenever either date field changes
      if (field === 'manufactureDate' || field === 'expiryDate') {
        const mfg = field === 'manufactureDate' ? String(val ?? '') : i.manufactureDate;
        const exp = field === 'expiryDate'      ? String(val ?? '') : i.expiryDate;
        const { mfgError, expError } = validateDates(mfg, exp);
        return { ...updated, mfgError, expError };
      }
      return updated;
    }));
  }, []);

  const handleSelectSku = useCallback((id: string, sku: SkuOption | null) => {
    setItems(p => p.map(i => i.id === id ? { ...i, skuCode: sku?.skuCode ?? '', skuName: sku?.skuName ?? '', skuId: sku?.skuId ?? null } : i));
  }, []);

  // pendingSubmit: lưu valid items đang chờ user xác nhận quarantine
  const [pendingValidItems, setPendingValidItems] = useState<ItemRow[] | null>(null);

  // Bước 1: validate + hiện modal nếu cần
  const handleSubmit = async () => {
    if (!warehouseId)                               { toast.error('Chọn kho nhận hàng'); return; }
    if (sourceType === 'SUPPLIER' && !supplierCode) { toast.error('Chọn nhà cung cấp'); return; }
    const valid = items.filter(i => i.skuCode.trim());
    if (!valid.length)                              { toast.error('Thêm ít nhất 1 sản phẩm'); return; }
    const noQty = valid.find(i => !i.expectedQty || Number(i.expectedQty) <= 0);
    if (noQty)                                      { toast.error(`Nhập số lượng cho: ${noQty.skuCode}`); return; }

    // Chặn hàng đã hết hạn
    const expiredItems = valid.filter(i => i.expiryDate && getExpiryInfo(i.expiryDate)?.level === 'expired');
    if (expiredItems.length > 0) {
      toast.error(`${expiredItems.length} SKU đã hết hạn — không thể nhập kho: ${expiredItems.map(i => i.skuCode).join(', ')}`);
      return;
    }

    const hardDateError = valid.find(i =>
      (i.mfgError && !i.mfgError.startsWith('Cảnh báo') && !i.mfgError.startsWith('Lưu ý')) ||
      (i.expError && !i.expError.startsWith('Cảnh báo') && !i.expError.startsWith('Lưu ý'))
    );
    if (hardDateError) {
      toast.error(`Lỗi ngày cho SKU ${hardDateError.skuCode}: ${hardDateError.mfgError || hardDateError.expError}`);
      return;
    }

    // Có hàng cần cách ly → mở modal xác nhận
    const quarantineItems = valid.filter(i => i.expiryDate && getExpiryInfo(i.expiryDate)?.level === 'quarantine');
    if (quarantineItems.length > 0) {
      setPendingValidItems(valid);
      setQuarantineModal({ open: true, items: quarantineItems, onConfirm: () => {} });
      return;
    }

    // Không cần xác nhận → submit thẳng
    await doSubmit(valid);
  };

  // Bước 2: thực sự gọi API
  const doSubmit = async (valid: ItemRow[]) => {
    // Cảnh báo nhẹ <90 ngày
    const warnItems = valid.filter(i => i.expiryDate && getExpiryInfo(i.expiryDate)?.level === 'warn');
    if (warnItems.length > 0) {
      toast(`${warnItems.length} SKU sắp hết hạn — sẽ ưu tiên FEFO khi xuất`, { icon: '⚠️' });
    }

    setSubmitting(true);
    try {
      const result = await createDraftReceivingOrder({
        warehouseId: warehouseId!,
        sourceType,
        supplierCode: supplierCode || null,
        sourceReferenceCode: sourceRef.trim() || null,
        note: note.trim() || null,
        items: valid.map(i => ({
          skuCode: i.skuCode,
          expectedQty: Number(i.expectedQty),
          lotNumber: i.lotNumber.trim() || null,
          manufactureDate: i.manufactureDate || null,
          expiryDate: i.expiryDate || null,
        })),
      });
      toast.success(`Tạo phiếu thành công: ${result.receivingCode}`);
      onCreated(result.receivingId);
      onClose();
    } catch { /* axios interceptor hiện toast lỗi */ }
    finally { setSubmitting(false); }
  };

  // Handler khi user chọn trong QuarantineConfirmModal
  const handleQuarantineChoice = (choice: 'edit' | 'proceed') => {
    setQuarantineModal(m => ({ ...m, open: false }));
    if (choice === 'edit') {
      // Đóng modal → user tự sửa lại HSD
      setPendingValidItems(null);
      return;
    }
    // proceed → submit với items đã validate
    if (pendingValidItems) {
      setPendingValidItems(null);
      doSubmit(pendingValidItems);
    }
  };

  const selectedSupplier = suppliers.find(s => s.supplierCode === supplierCode);
  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter(s => s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()) || s.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase()))
    : suppliers;
  const totalQty = items.reduce((s, i) => s + (Number(i.expectedQty) || 0), 0);
  const validCount = items.filter(i => i.skuCode).length;

  if (!open) return null;

  return (
    <Portal>
      {/* ── QuarantineConfirmModal ── */}
      {quarantineModal.open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          style={{ background: 'rgba(17,24,39,0.65)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-orange-100 overflow-hidden"
            style={{ animation: 'slideUp .2s ease-out' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-5 py-4 bg-orange-50 border-b border-orange-100">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-orange-500 text-[22px]">lock_clock</span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Phát hiện hàng sắp hết hạn</h3>
                <p className="text-[11px] text-orange-600 mt-0.5">
                  {quarantineModal.items.length} SKU có HSD dưới 30 ngày
                </p>
              </div>
            </div>

            {/* SKU list */}
            <div className="px-5 py-4 space-y-2">
              {quarantineModal.items.map(item => {
                const info = getExpiryInfo(item.expiryDate);
                return (
                  <div key={item.id}
                    className="flex items-center justify-between px-3 py-2.5 bg-orange-50 border border-orange-200 rounded-xl">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{item.skuCode}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5 truncate max-w-[200px]">{item.skuName}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-orange-600">{item.expiryDate}</p>
                      <p className="text-[10px] text-orange-500">{info?.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Info box */}
            <div className="mx-5 mb-4 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[15px] mt-0.5 flex-shrink-0">info</span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Nếu HSD nhập <strong>đúng</strong>, hàng sẽ được đánh dấu cần cách ly kiểm tra.
                Nếu nhập <strong>nhầm</strong>, bấm "Sửa lại" để điều chỉnh.
              </p>
            </div>

            {/* Actions */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleQuarantineChoice('edit')}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-gray-700 bg-white border-2 border-gray-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all active:scale-95">
                  <span className="material-symbols-outlined text-[16px]">edit</span>
                  Sửa lại HSD
                </button>
                <button
                  onClick={() => handleQuarantineChoice('proceed')}
                  className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold text-white rounded-xl transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#f97316,#ea580c)' }}>
                  <span className="material-symbols-outlined text-[16px]">lock</span>
                  Xác nhận cách ly
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
          style={{ maxHeight: '92vh' }}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">add_box</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">Tạo phiếu nhận hàng</h3>
                <p className="text-xs text-gray-400 mt-0.5">Phiếu sẽ ở trạng thái <span className="font-semibold text-indigo-500">DRAFT</span> sau khi tạo</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Row 1 */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kho nhận hàng" required>
                <select value={warehouseId ?? ''} onChange={e => setWarehouseId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                  <option value="">-- Chọn kho --</option>
                  {warehouses.map(w => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName} ({w.warehouseCode})</option>)}
                </select>
              </Field>
              <Field label="Loại nhập kho" required>
                <select value={sourceType} onChange={e => { setSourceType(e.target.value); setSupplierCode(''); setSupplierSearch(''); }} className={inputCls}>
                  <option value="SUPPLIER">Nhập từ nhà cung cấp</option>
                  <option value="TRANSFER">Chuyển kho</option>
                  <option value="RETURN">Hàng trả về</option>
                </select>
              </Field>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-2 gap-4">
              {sourceType === 'SUPPLIER' ? (
                <Field label="Nhà cung cấp" required>
                  <div className="relative" ref={supplierRef as React.RefObject<HTMLDivElement>}>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">business</span>
                      <input type="text"
                        placeholder={loadingSupplier ? 'Đang tải...' : 'Tìm nhà cung cấp...'}
                        value={selectedSupplier ? `${selectedSupplier.supplierName} (${selectedSupplier.supplierCode})` : supplierSearch}
                        className={`${inputCls} pl-8 ${supplierCode ? 'pr-8' : ''}`}
                        onFocus={() => { setSupplierSearch(''); setSupplierOpen(true); }}
                        onChange={e => { setSupplierSearch(e.target.value); setSupplierCode(''); setSupplierOpen(true); }}
                      />
                      {supplierCode && (
                        <button type="button" onClick={() => { setSupplierCode(''); setSupplierSearch(''); }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-red-400 transition-colors">
                          <span className="material-symbols-outlined text-[15px]">close</span>
                        </button>
                      )}
                    </div>
                    <DropdownPortal anchorRef={supplierRef as React.RefObject<HTMLElement>} open={supplierOpen}>
                      {filteredSuppliers.length === 0
                        ? <p className="px-3 py-3 text-xs text-gray-400 text-center">Không tìm thấy</p>
                        : filteredSuppliers.map(s => (
                          <button key={s.supplierCode} type="button"
                            className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors"
                            onMouseDown={e => { e.preventDefault(); setSupplierCode(s.supplierCode); setSupplierSearch(''); setSupplierOpen(false); }}>
                            <p className="text-sm font-semibold text-gray-800">{s.supplierName}</p>
                            <p className="text-xs text-gray-400">{s.supplierCode}</p>
                          </button>
                        ))
                      }
                    </DropdownPortal>
                  </div>
                </Field>
              ) : (
                <Field label="Kho nguồn">
                  <input type="text" placeholder="Tên kho chuyển..." value={supplierCode}
                    onChange={e => setSupplierCode(e.target.value)} className={inputCls} />
                </Field>
              )}
              <Field label="Số chứng từ / PO">
                <input type="text" placeholder="VD: PO-2024-001" value={sourceRef}
                  onChange={e => setSourceRef(e.target.value)} className={inputCls} />
              </Field>
            </div>

            {/* Ghi chú */}
            <Field label="Ghi chú">
              <input type="text" placeholder="VD: Xe tải 29C-12345 giao lúc 10h"
                value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
            </Field>

            {/* ── Sản phẩm ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    Danh sách sản phẩm <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  {validCount > 0 && (
                    <span className="ml-2 text-[11px] text-indigo-500 font-medium">
                      {validCount} SKU · {totalQty} thùng
                    </span>
                  )}
                </div>
                <button type="button" onClick={() => setItems(p => [...p, makeItem()])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Thêm dòng
                </button>
              </div>

              {/* Column headers */}
              <div className="grid gap-2 px-3 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                style={{ gridTemplateColumns: '2.8fr 0.8fr 1fr 1.1fr 1.2fr 28px' }}>
                <div>SKU</div>
                <div className="text-center">SL *</div>
                <div>Số lô</div>
                <div>Ngày SX</div>
                <div>Hạn dùng *</div>
                <div />
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {items.map((item, idx) => {
                  const expiryInfo = item.expiryDate ? getExpiryInfo(item.expiryDate) : null;
                  const eStyle = expiryInfo ? EXPIRY_STYLE[expiryInfo.level] : null;
                  return (
                  <div key={item.id}
                    className="rounded-xl border transition-colors overflow-hidden"
                    style={{
                      background: item.skuCode ? (eStyle ? undefined : '#fafbff') : 'white',
                      borderColor: eStyle ? undefined : (item.skuCode ? '#e0e7ff' : '#f3f4f6'),
                    }}>

                    {/* ExpiryBanner — hiện khi có thông tin HSD */}
                    {expiryInfo && eStyle && (
                      <div className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold ${eStyle.bg} ${eStyle.text} border-b ${eStyle.border}`}>
                        <span className="material-symbols-outlined text-[13px]">{eStyle.icon}</span>
                        <span>{expiryInfo.label}</span>
                        {expiryInfo.action && (
                          <span className="ml-auto opacity-70 font-normal text-[10px]">{expiryInfo.action}</span>
                        )}
                      </div>
                    )}

                    <div className="grid gap-2 items-center px-3 py-3"
                      style={{ gridTemplateColumns: '2.8fr 0.8fr 1fr 1.1fr 1.2fr 28px' }}>

                    {/* SKU combobox */}
                    <SkuCombobox
                      value={item.skuCode ? { skuCode: item.skuCode, skuName: item.skuName } : null}
                      onSelect={sku => handleSelectSku(item.id, sku)}
                    />

                    {/* Qty */}
                    <input type="number" min="1" placeholder="SL"
                      value={item.expectedQty}
                      onChange={e => updateItem(item.id, 'expectedQty', e.target.value)}
                      className={`w-full px-2 py-2 text-sm border rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
                        item.skuCode && (!item.expectedQty || Number(item.expectedQty) <= 0)
                          ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white'}`}
                    />

                    {/* Lot */}
                    <input type="text" placeholder="LOT-001"
                      value={item.lotNumber}
                      onChange={e => updateItem(item.id, 'lotNumber', e.target.value)}
                      className="w-full px-2 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
                    />

                    {/* Manufacture date */}
                    <div>
                      <input type="date"
                        value={item.manufactureDate}
                        max={item.expiryDate || new Date().toISOString().split('T')[0]}
                        onChange={e => updateItem(item.id, 'manufactureDate', e.target.value)}
                        className={`w-full px-2 py-2 text-sm border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
                          item.mfgError ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                      {item.mfgError && (
                        <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">error</span>
                          {item.mfgError}
                        </p>
                      )}
                    </div>

                    {/* Expiry date — với styling theo mức độ */}
                    <div>
                      <input type="date"
                        value={item.expiryDate}
                        min={item.manufactureDate || new Date().toISOString().split('T')[0]}
                        onChange={e => updateItem(item.id, 'expiryDate', e.target.value)}
                        className={`w-full px-2 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
                          eStyle
                            ? `${eStyle.inputBorder} ${eStyle.inputBg}`
                            : 'border-gray-200 bg-white'
                        }`}
                      />
                      {!item.expiryDate && item.skuCode && (
                        <p className="text-[10px] text-amber-500 mt-0.5 flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">info</span>
                          Nên nhập HSD cho hóa chất
                        </p>
                      )}
                    </div>

                    {/* Delete */}
                    <button type="button" onClick={() => setItems(p => p.filter(i => i.id !== item.id))}
                      disabled={items.length === 1}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors">
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Warning — missing qty */}
              {items.some(i => i.skuCode && (!i.expectedQty || Number(i.expectedQty) <= 0)) && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1 px-1">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Có dòng chưa nhập số lượng
                </p>
              )}

              {/* Expiry summary panel */}
              {(() => {
                const validItems = items.filter(i => i.skuCode && i.expiryDate);
                const expired    = validItems.filter(i => getExpiryInfo(i.expiryDate)?.level === 'expired');
                const quarantine = validItems.filter(i => getExpiryInfo(i.expiryDate)?.level === 'quarantine');
                const warn       = validItems.filter(i => getExpiryInfo(i.expiryDate)?.level === 'warn');
                const noExpiry   = items.filter(i => i.skuCode && !i.expiryDate);
                if (!expired.length && !quarantine.length && !warn.length && !noExpiry.length) return null;
                return (
                  <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-gray-400">event_busy</span>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tổng hợp kiểm tra HSD</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {expired.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50">
                          <span className="material-symbols-outlined text-[15px] text-red-500">dangerous</span>
                          <span className="text-xs font-semibold text-red-700">{expired.length} SKU ĐÃ HẾT HẠN</span>
                          <span className="text-[10px] text-red-500 ml-auto">Không được nhập kho</span>
                        </div>
                      )}
                      {quarantine.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-orange-50">
                          <span className="material-symbols-outlined text-[15px] text-orange-500">lock</span>
                          <span className="text-xs font-semibold text-orange-700">{quarantine.length} SKU HSD &lt;30 ngày</span>
                          <span className="text-[10px] text-orange-500 ml-auto">Đề xuất cách ly</span>
                        </div>
                      )}
                      {warn.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50">
                          <span className="material-symbols-outlined text-[15px] text-amber-500">warning</span>
                          <span className="text-xs font-semibold text-amber-700">{warn.length} SKU HSD &lt;90 ngày</span>
                          <span className="text-[10px] text-amber-500 ml-auto">Ưu tiên FEFO khi xuất</span>
                        </div>
                      )}
                      {noExpiry.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50">
                          <span className="material-symbols-outlined text-[15px] text-gray-400">info</span>
                          <span className="text-xs text-gray-500">{noExpiry.length} SKU chưa nhập HSD</span>
                          <span className="text-[10px] text-gray-400 ml-auto">Nên nhập cho hóa chất</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
            <p className="text-xs text-gray-400 hidden sm:block">
              Sau khi tạo, scan hàng để chuyển trạng thái
            </p>
            <div className="flex items-center gap-2.5 ml-auto">
              <button onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                Huỷ
              </button>
              <button onClick={handleSubmit} disabled={submitting}
                className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.3)' }}>
                {submitting
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tạo...</>
                  : <><span className="material-symbols-outlined text-[16px]">add_box</span>Tạo phiếu</>}
              </button>
            </div>
          </div>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </Portal>
  );
}
