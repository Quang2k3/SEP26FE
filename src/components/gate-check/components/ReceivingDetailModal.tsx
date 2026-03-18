'use client';

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import { fetchSuppliers, type Supplier } from '@/services/supplierService';
import { fetchWarehouses, type Warehouse } from '@/services/warehouseService';
import { searchSkusSimple, type SkuOption } from '@/services/skuService';
import { updateDraftReceivingOrder } from '@/services/receivingOrdersService';
import { getExpiryInfo, EXPIRY_STYLE, validateReceivingDates } from '@/utils/expiryUtils';
import type { ReceivingOrder, ReceivingItem } from '@/interfaces/receiving';
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
  mfgError?: string;
  expError?: string;
}

interface Props {
  open: boolean;
  receiving: ReceivingOrder | null;
  onClose: () => void;
  onRefresh: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white placeholder:text-gray-400 transition-all';
const readonlyCls = 'w-full px-3 py-2 text-sm border border-gray-100 rounded-xl bg-gray-50 text-gray-700 cursor-default select-text';

function validateDates(mfg: string, exp: string) {
  return validateReceivingDates(mfg, exp);
}

function makeItemFromReceivingItem(item: ReceivingItem): ItemRow {
  return {
    id: String(item.receivingItemId),
    skuId: item.skuId,
    skuCode: item.skuCode,
    skuName: item.skuName,
    expectedQty: String(item.expectedQty ?? ''),
    lotNumber: item.lotNumber ?? '',
    manufactureDate: item.manufactureDate ?? '',
    expiryDate: item.expiryDate ?? '',
  };
}

function makeEmptyItem(): ItemRow {
  return {
    id: Date.now().toString(),
    skuId: null,
    skuCode: '',
    skuName: '',
    expectedQty: '',
    lotNumber: '',
    manufactureDate: '',
    expiryDate: '',
  };
}

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

// ─── Portal Dropdown ──────────────────────────────────────────────────────────

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
    if (spaceBelow >= 120 || spaceBelow >= spaceAbove) {
      setStyle({ position: 'fixed', top: rect.bottom + 4, left: rect.left, width: rect.width, maxHeight: dropH, zIndex: 9999 });
    } else {
      setStyle({ position: 'fixed', bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width, maxHeight: dropH, zIndex: 9999 });
    }
  }, [open, anchorRef]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div style={style} className="bg-white rounded-xl border border-gray-200 shadow-2xl overflow-y-auto">
      {children}
    </div>,
    document.body
  );
}

// ─── SKU Combobox (edit mode only) ───────────────────────────────────────────

function SkuCombobox({ value, onSelect }: {
  value: { skuCode: string; skuName: string } | null;
  onSelect: (sku: SkuOption | null) => void;
}) {
  const [inputVal, setInputVal] = useState('');
  const [results, setResults] = useState<SkuOption[]>([]);
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const isConfirmed = useRef(false);

  useEffect(() => {
    if (!value) { if (!isConfirmed.current) setInputVal(''); }
    else setInputVal(`${value.skuCode} — ${value.skuName}`);
    isConfirmed.current = false;
  }, [value?.skuCode]);

  useEffect(() => { searchSkusSimple('').then(setResults).catch(() => {}); }, []);

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
      try { setResults(await searchSkusSimple(q)); } catch {}
      finally { setSearching(false); }
    }, 250);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">inventory_2</span>
        <input type="text" value={inputVal} placeholder="Tìm mã hoặc tên SKU..."
          className={`${inputCls} pl-8 ${value ? 'pr-8' : ''}`}
          onFocus={() => setOpen(true)} onChange={handleInput} autoComplete="off"
        />
        {value && (
          <button type="button" onClick={() => { isConfirmed.current = false; setInputVal(''); onSelect(null); }}
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
        ) : results.map(s => (
          <button key={s.skuCode} type="button"
            className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0 transition-colors ${value?.skuCode === s.skuCode ? 'bg-indigo-50' : ''}`}
            onMouseDown={e => {
              e.preventDefault();
              isConfirmed.current = true;
              setInputVal(`${s.skuCode} — ${s.skuName}`);
              setOpen(false);
              onSelect(s);
            }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-indigo-600">{s.skuCode}</span>
              {s.unit && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{s.unit}</span>}
            </div>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{s.skuName}</p>
          </button>
        ))}
      </DropdownPortal>
    </div>
  );
}

// ─── View-only item row ───────────────────────────────────────────────────────

function ViewItemRow({ item }: { item: ItemRow }) {
  const expiryInfo = item.expiryDate ? getExpiryInfo(item.expiryDate) : null;
  const eStyle = expiryInfo ? EXPIRY_STYLE[expiryInfo.level] : null;

  return (
    <div className="rounded-xl border overflow-hidden"
      style={{
        background: item.skuCode ? (eStyle ? undefined : '#fafbff') : 'white',
        borderColor: eStyle ? undefined : (item.skuCode ? '#e0e7ff' : '#f3f4f6'),
      }}>
      {expiryInfo && eStyle && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold ${eStyle.bg} ${eStyle.text} border-b ${eStyle.border}`}>
          <span className="material-symbols-outlined text-[13px]">{eStyle.icon}</span>
          <span>{expiryInfo.label}</span>
          {expiryInfo.action && <span className="ml-auto opacity-70 font-normal text-[10px]">{expiryInfo.action}</span>}
        </div>
      )}
      <div className="grid gap-2 items-center px-3 py-3"
        style={{ gridTemplateColumns: '2.8fr 0.8fr 1fr 1.1fr 1.2fr' }}>
        <div className="min-w-0">
          <p className="text-xs font-bold text-indigo-700 font-mono truncate">{item.skuCode}</p>
          <p className="text-[11px] text-gray-500 truncate">{item.skuName}</p>
        </div>
        <div className="text-center">
          <span className="text-sm font-bold text-gray-800">{item.expectedQty}</span>
        </div>
        <div className="text-xs text-gray-600">{item.lotNumber || <span className="text-gray-300">—</span>}</div>
        <div className="text-xs text-gray-600">{item.manufactureDate || <span className="text-gray-300">—</span>}</div>
        <div className={`text-xs font-medium ${eStyle ? eStyle.text : 'text-gray-600'}`}>
          {item.expiryDate || <span className="text-gray-300">—</span>}
        </div>
      </div>
    </div>
  );
}

// ─── Edit item row ────────────────────────────────────────────────────────────

function EditItemRow({ item, onUpdate, onSelectSku, onDelete, canDelete }: {
  item: ItemRow;
  onUpdate: (id: string, field: keyof ItemRow, val: string | number | null) => void;
  onSelectSku: (id: string, sku: SkuOption | null) => void;
  onDelete: (id: string) => void;
  canDelete: boolean;
}) {
  const expiryInfo = item.expiryDate ? getExpiryInfo(item.expiryDate) : null;
  const eStyle = expiryInfo ? EXPIRY_STYLE[expiryInfo.level] : null;

  return (
    <div className="rounded-xl border transition-colors overflow-hidden"
      style={{
        background: item.skuCode ? (eStyle ? undefined : '#fafbff') : 'white',
        borderColor: eStyle ? undefined : (item.skuCode ? '#e0e7ff' : '#f3f4f6'),
      }}>
      {expiryInfo && eStyle && (
        <div className={`flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold ${eStyle.bg} ${eStyle.text} border-b ${eStyle.border}`}>
          <span className="material-symbols-outlined text-[13px]">{eStyle.icon}</span>
          <span>{expiryInfo.label}</span>
          {expiryInfo.action && <span className="ml-auto opacity-70 font-normal text-[10px]">{expiryInfo.action}</span>}
        </div>
      )}
      <div className="grid gap-2 items-center px-3 py-3"
        style={{ gridTemplateColumns: '2.8fr 0.8fr 1fr 1.1fr 1.2fr 28px' }}>
        <SkuCombobox
          value={item.skuCode ? { skuCode: item.skuCode, skuName: item.skuName } : null}
          onSelect={sku => onSelectSku(item.id, sku)}
        />
        <input type="number" min="1" placeholder="SL"
          value={item.expectedQty}
          onChange={e => onUpdate(item.id, 'expectedQty', e.target.value)}
          className={`w-full px-2 py-2 text-sm border rounded-xl text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
            item.skuCode && (!item.expectedQty || Number(item.expectedQty) <= 0)
              ? 'border-red-300 bg-red-50 text-red-700' : 'border-gray-200 bg-white'}`}
        />
        <input type="text" placeholder="LOT-001" value={item.lotNumber}
          onChange={e => onUpdate(item.id, 'lotNumber', e.target.value)}
          className="w-full px-2 py-2 text-sm border border-gray-200 bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all"
        />
        <div>
          <input type="date" value={item.manufactureDate}
            max={item.expiryDate || new Date().toISOString().split('T')[0]}
            onChange={e => onUpdate(item.id, 'manufactureDate', e.target.value)}
            className={`w-full px-2 py-2 text-sm border bg-white rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
              item.mfgError ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
          />
          {item.mfgError && (
            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">error</span>{item.mfgError}
            </p>
          )}
        </div>
        <div>
          <input type="date" value={item.expiryDate}
            min={item.manufactureDate || new Date().toISOString().split('T')[0]}
            onChange={e => onUpdate(item.id, 'expiryDate', e.target.value)}
            className={`w-full px-2 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all ${
              eStyle ? `${eStyle.inputBorder} ${eStyle.inputBg}` : 'border-gray-200 bg-white'}`}
          />
          {item.expError && (
            <p className="text-[10px] text-red-500 mt-0.5 flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[11px]">error</span>{item.expError}
            </p>
          )}
        </div>
        <button type="button" onClick={() => onDelete(item.id)} disabled={!canDelete}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 disabled:opacity-20 transition-colors">
          <span className="material-symbols-outlined text-[16px]">delete</span>
        </button>
      </div>
    </div>
  );
}

// ─── Status badge map ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  DRAFT:            { label: 'Nháp',          cls: 'bg-gray-100 text-gray-600' },
  SUBMITTED:        { label: 'Đang nhận',     cls: 'bg-cyan-50 text-cyan-700' },
  PENDING_COUNT:    { label: 'Chờ kiểm đếm', cls: 'bg-indigo-50 text-indigo-700' },
  PENDING_INCIDENT: { label: 'Có sự cố',     cls: 'bg-yellow-50 text-yellow-700' },
  QC_APPROVED:      { label: 'QC Đạt',       cls: 'bg-purple-50 text-purple-700' },
  GRN_CREATED:      { label: 'Đã tạo GRN',   cls: 'bg-orange-50 text-orange-700' },
  PENDING_APPROVAL: { label: 'Chờ duyệt',    cls: 'bg-amber-50 text-amber-700' },
  GRN_APPROVED:     { label: 'Đã duyệt',     cls: 'bg-green-50 text-green-700' },
  GRN_REJECTED:     { label: 'Bị từ chối',   cls: 'bg-red-50 text-red-600' },
  POSTED:           { label: 'Đã nhập kho',  cls: 'bg-blue-50 text-blue-700' },
};

// ─── Main Modal ───────────────────────────────────────────────────────────────

export default function ReceivingDetailModal({ open, receiving, onClose, onRefresh }: Props) {
  // DRAFT → edit mode; tất cả status khác → view mode
  const isEditMode = receiving?.status === 'DRAFT';

  const [suppliers,      setSuppliers]      = useState<Supplier[]>([]);
  const [warehouses,     setWarehouses]     = useState<Warehouse[]>([]);
  const [loadingMeta,    setLoadingMeta]    = useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  // Edit-only state
  const [warehouseId,    setWarehouseId]    = useState<number | null>(null);
  const [sourceType,     setSourceType]     = useState('SUPPLIER');
  const [supplierCode,   setSupplierCode]   = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierOpen,   setSupplierOpen]   = useState(false);
  const [sourceRef,      setSourceRef]      = useState('');
  const [note,           setNote]           = useState('');
  const [items,          setItems]          = useState<ItemRow[]>([]);

  const supplierRef = useRef<HTMLDivElement>(null);

  // Fill state từ receiving mỗi khi modal mở với đơn mới
  useEffect(() => {
    if (!open || !receiving) return;

    // Fill items (cả hai mode)
    const filled = (receiving.items ?? []).map(makeItemFromReceivingItem);
    setItems(filled.length > 0 ? filled : [makeEmptyItem()]);

    if (!isEditMode) return; // View mode: dừng ở đây

    // Edit mode: load danh mục
    setLoadingMeta(true);
    Promise.all([fetchSuppliers(), fetchWarehouses()])
      .then(([s, w]) => { setSuppliers(s); setWarehouses(w); })
      .catch(() => {})
      .finally(() => setLoadingMeta(false));

    // Pre-fill header
    setWarehouseId(receiving.warehouseId ?? null);
    setSourceType(receiving.sourceType ?? 'SUPPLIER');
    setSourceRef(receiving.sourceReferenceCode ?? '');
    setNote(receiving.note ?? '');
    setSupplierCode('');   // sẽ map sau khi suppliers load
    setSupplierSearch('');
  }, [open, receiving?.receivingId]); // eslint-disable-line

  // Map supplierId → supplierCode sau khi suppliers load
  useEffect(() => {
    if (!isEditMode || !receiving || suppliers.length === 0) return;
    if (receiving.supplierId) {
      const found = suppliers.find(s => s.supplierId === receiving.supplierId);
      if (found) setSupplierCode(found.supplierCode);
    }
  }, [suppliers]); // eslint-disable-line

  // Đóng dropdown khi click ngoài
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (supplierRef.current && !supplierRef.current.contains(e.target as Node))
        setSupplierOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Item handlers ──────────────────────────────────────────────────────────
  const updateItem = useCallback((id: string, field: keyof ItemRow, val: string | number | null) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: val };
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
    setItems(prev => prev.map(i =>
      i.id === id
        ? { ...i, skuCode: sku?.skuCode ?? '', skuName: sku?.skuName ?? '', skuId: sku?.skuId ?? null }
        : i
    ));
  }, []);

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!receiving) return;
    if (!warehouseId)                               { toast.error('Chọn kho nhận hàng'); return; }
    if (sourceType === 'SUPPLIER' && !supplierCode) { toast.error('Chọn nhà cung cấp'); return; }

    const valid = items.filter(i => i.skuCode.trim());
    if (!valid.length) { toast.error('Thêm ít nhất 1 sản phẩm'); return; }

    const noQty = valid.find(i => !i.expectedQty || Number(i.expectedQty) <= 0);
    if (noQty) { toast.error(`Nhập số lượng cho: ${noQty.skuCode}`); return; }

    const hardDateError = valid.find(i =>
      (i.mfgError && !i.mfgError.startsWith('Lưu ý') && !i.mfgError.startsWith('Cảnh báo')) ||
      (i.expError && !i.expError.startsWith('Lưu ý') && !i.expError.startsWith('Cảnh báo'))
    );
    if (hardDateError) {
      toast.error(`Lỗi ngày cho ${hardDateError.skuCode}: ${hardDateError.mfgError || hardDateError.expError}`);
      return;
    }

    setSubmitting(true);
    try {
      await updateDraftReceivingOrder(receiving.receivingId, {
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
      toast.success('Đã lưu phiếu nháp');
      onRefresh();
      onClose();
    } catch { /* axios interceptor hiện toast */ }
    finally { setSubmitting(false); }
  };

  if (!open || !receiving) return null;

  const statusBadge = STATUS_LABELS[receiving.status] ?? { label: receiving.status, cls: 'bg-gray-100 text-gray-500' };
  const selectedSupplier = suppliers.find(s => s.supplierCode === supplierCode);
  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter(s =>
        s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()) ||
        s.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase()))
    : suppliers;
  const totalQty   = items.reduce((s, i) => s + (Number(i.expectedQty) || 0), 0);
  const validCount = items.filter(i => i.skuCode).length;

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col"
          style={{ maxHeight: '92vh' }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isEditMode ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                <span className={`material-symbols-outlined text-[20px] ${isEditMode ? 'text-amber-500' : 'text-indigo-500'}`}>
                  {isEditMode ? 'edit_note' : 'receipt_long'}
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-gray-900">
                    {isEditMode ? 'Sửa phiếu nhận hàng' : 'Chi tiết phiếu nhận hàng'}
                  </h3>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${statusBadge.cls}`}>
                    {statusBadge.label}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5 font-mono">{receiving.receivingCode}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* ── Body ───────────────────────────────────────────────────────── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

            {/* Row 1: Kho + Loại */}
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kho nhận hàng" required={isEditMode}>
                {isEditMode ? (
                  <select value={warehouseId ?? ''} onChange={e => setWarehouseId(e.target.value ? Number(e.target.value) : null)} className={inputCls}>
                    <option value="">-- Chọn kho --</option>
                    {warehouses.map(w => <option key={w.warehouseId} value={w.warehouseId}>{w.warehouseName} ({w.warehouseCode})</option>)}
                  </select>
                ) : (
                  <p className={readonlyCls}>{receiving.warehouseName || '—'}</p>
                )}
              </Field>
              <Field label="Loại nhập kho" required={isEditMode}>
                {isEditMode ? (
                  <select value={sourceType} onChange={e => { setSourceType(e.target.value); setSupplierCode(''); setSupplierSearch(''); }} className={inputCls}>
                    <option value="SUPPLIER">Nhập từ nhà cung cấp</option>
                    <option value="TRANSFER">Chuyển kho</option>
                    <option value="RETURN">Hàng trả về</option>
                  </select>
                ) : (
                  <p className={readonlyCls}>
                    {receiving.sourceType === 'SUPPLIER' ? 'Nhập từ nhà cung cấp'
                      : receiving.sourceType === 'TRANSFER' ? 'Chuyển kho'
                      : receiving.sourceType === 'RETURN'   ? 'Hàng trả về'
                      : receiving.sourceType}
                  </p>
                )}
              </Field>
            </div>

            {/* Row 2: NCC + Chứng từ */}
            <div className="grid grid-cols-2 gap-4">
              <Field
                label={(isEditMode ? sourceType : receiving.sourceType) === 'SUPPLIER' ? 'Nhà cung cấp' : 'Kho nguồn'}
                required={isEditMode && sourceType === 'SUPPLIER'}>
                {isEditMode ? (
                  sourceType === 'SUPPLIER' ? (
                    <div className="relative" ref={supplierRef as React.RefObject<HTMLDivElement>}>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-[15px] pointer-events-none">business</span>
                        <input type="text"
                          placeholder={loadingMeta ? 'Đang tải...' : 'Tìm nhà cung cấp...'}
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
                          ))}
                      </DropdownPortal>
                    </div>
                  ) : (
                    <input type="text" placeholder="Tên kho chuyển..." value={supplierCode}
                      onChange={e => setSupplierCode(e.target.value)} className={inputCls} />
                  )
                ) : (
                  <p className={readonlyCls}>{receiving.supplierName || '—'}</p>
                )}
              </Field>
              <Field label="Số chứng từ / PO">
                {isEditMode ? (
                  <input type="text" placeholder="VD: PO-2024-001" value={sourceRef}
                    onChange={e => setSourceRef(e.target.value)} className={inputCls} />
                ) : (
                  <p className={readonlyCls}>{receiving.sourceReferenceCode || '—'}</p>
                )}
              </Field>
            </div>

            {/* Ghi chú */}
            <Field label="Ghi chú">
              {isEditMode ? (
                <input type="text" placeholder="VD: Xe tải 29C-12345 giao lúc 10h"
                  value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
              ) : (
                <p className={readonlyCls}>{receiving.note || '—'}</p>
              )}
            </Field>

            {/* Thông tin bổ sung (view mode only) */}
            {!isEditMode && (
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Người tạo</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">{receiving.createdByName || '—'}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Ngày tạo</p>
                  <p className="text-xs font-medium text-gray-700 mt-0.5">
                    {new Date(receiving.createdAt).toLocaleString('vi-VN')}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400 uppercase tracking-wide">Số lượng</p>
                  <p className="text-xs font-bold text-gray-800 mt-0.5">
                    {receiving.totalExpectedQty ?? 0} dự kiến
                    {(receiving.totalQty ?? 0) !== (receiving.totalExpectedQty ?? 0) && (
                      <span className="ml-1 text-indigo-600">/ {receiving.totalQty ?? 0} thực nhận</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* ── Danh sách sản phẩm ─────────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    Danh sách sản phẩm {isEditMode && <span className="text-red-400 normal-case font-normal">*</span>}
                  </label>
                  {validCount > 0 && (
                    <span className="ml-2 text-[11px] text-indigo-500 font-medium">
                      {validCount} SKU · {totalQty} thùng
                    </span>
                  )}
                </div>
                {isEditMode && (
                  <button type="button" onClick={() => setItems(p => [...p, makeEmptyItem()])}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    Thêm dòng
                  </button>
                )}
              </div>

              {/* Column headers */}
              <div className="grid gap-2 px-3 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                style={{ gridTemplateColumns: isEditMode ? '2.8fr 0.8fr 1fr 1.1fr 1.2fr 28px' : '2.8fr 0.8fr 1fr 1.1fr 1.2fr' }}>
                <div>SKU</div>
                <div className="text-center">SL{isEditMode ? ' *' : ''}</div>
                <div>Số lô</div>
                <div>Ngày SX</div>
                <div>Hạn dùng</div>
                {isEditMode && <div />}
              </div>

              {/* Rows */}
              <div className="space-y-2">
                {items.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-6">Không có sản phẩm</p>
                ) : items.map(item =>
                  isEditMode ? (
                    <EditItemRow key={item.id} item={item}
                      onUpdate={updateItem}
                      onSelectSku={handleSelectSku}
                      onDelete={id => setItems(p => p.filter(i => i.id !== id))}
                      canDelete={items.length > 1}
                    />
                  ) : (
                    <ViewItemRow key={item.id} item={item} />
                  )
                )}
              </div>

              {/* Warning missing qty (edit only) */}
              {isEditMode && items.some(i => i.skuCode && (!i.expectedQty || Number(i.expectedQty) <= 0)) && (
                <p className="mt-2 text-xs text-red-500 flex items-center gap-1 px-1">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Có dòng chưa nhập số lượng
                </p>
              )}
            </div>
          </div>

          {/* ── Footer ─────────────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/50 rounded-b-2xl">
            <p className="text-xs text-gray-400 hidden sm:block">
              {isEditMode
                ? 'Chỉ phiếu ở trạng thái Nháp mới có thể chỉnh sửa'
                : `Chế độ xem · ${receiving.receivingCode}`}
            </p>
            <div className="flex items-center gap-2.5 ml-auto">
              <button onClick={onClose}
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
                {isEditMode ? 'Huỷ' : 'Đóng'}
              </button>
              {isEditMode && (
                <button onClick={handleSave} disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', boxShadow: '0 4px 14px rgba(245,158,11,0.3)' }}>
                  {submitting
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</>
                    : <><span className="material-symbols-outlined text-[16px]">save</span>Lưu thay đổi</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}
