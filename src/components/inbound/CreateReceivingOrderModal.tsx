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
  manufactureDate: string;
  expiryDate: string;
  /** Trọng lượng 1 thùng kg — tự điền khi chọn SKU */
  weightPerCartonKg: number | null;
  /** Số đơn vị/thùng — hiển thị gợi ý */
  unitsPerCarton: number | null;
  /** Hạn sử dụng tính theo ngày — tự tính HSD = SX + shelfLifeDays */
  shelfLifeDays: number | null;
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
  return { id: id ?? Date.now().toString(), skuId: null, skuCode: '', skuName: '',
           expectedQty: '', manufactureDate: '', expiryDate: '',
           weightPerCartonKg: null, unitsPerCarton: null, shelfLifeDays: null };
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
  // LOT là cấp phiếu — 1 phiếu nhận hàng = 1 LOT duy nhất cho tất cả SKU
  const [orderLotNumber,  setOrderLotNumber]  = useState('');
  const [orderLotError,   setOrderLotError]   = useState<string | undefined>(undefined);
  // LOT check state
  const [lotChecking, setLotChecking]   = useState(false);
  const lotTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [poChecking,  setPoChecking]    = useState(false);
  const [poError,     setPoError]       = useState<string | undefined>(undefined);
  const poTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supplierRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setLoadingSupplier(true);
    fetchSuppliers().then(setSuppliers).catch(() => toast.error('Không tải được nhà cung cấp')).finally(() => setLoadingSupplier(false));
    fetchWarehouses().then(ws => { setWarehouses(ws); if (ws.length === 1) setWarehouseId(ws[0].warehouseId); }).catch(() => {});
    setSourceType('SUPPLIER'); setSupplierCode(''); setSupplierSearch('');
    setWarehouseId(null); setSourceRef(''); setNote('');
    setItems([makeItem('1')]);
    setOrderLotNumber('');
    setOrderLotError(undefined);
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
      let updated = { ...i, [field]: val };

      // Auto-tính HSD khi nhập ngày SX
      // shelfLifeDays từ SKU, nếu null dùng fallback 1095 ngày (3 năm)
      if (field === 'manufactureDate' && val) {
        const days = i.shelfLifeDays ?? 1095;
        const mfgDate = new Date(String(val));
        if (!isNaN(mfgDate.getTime())) {
          const expiryDate = new Date(mfgDate);
          expiryDate.setDate(expiryDate.getDate() + days);
          updated = { ...updated, expiryDate: expiryDate.toISOString().split('T')[0] };
        }
      }

      // Re-validate dates
      if (field === 'manufactureDate' || field === 'expiryDate') {
        const mfg = field === 'manufactureDate' ? String(val ?? '') : i.manufactureDate;
        const exp = updated.expiryDate; // dùng updated vì có thể vừa auto-calc
        const { mfgError, expError } = validateDates(mfg, exp);
        return { ...updated, mfgError, expError };
      }
      return updated;
    }));
  }, []);

  // Check LOT trùng — debounce 400ms gọi API /v1/skus/lots/check
  const handleLotNumberChange = useCallback((val: string) => {
    setOrderLotNumber(val);
    setOrderLotError(undefined);
    if (lotTimerRef.current) clearTimeout(lotTimerRef.current);
    const lotVal = val.trim();
    if (!lotVal) { setLotChecking(false); return; }
    setLotChecking(true);
    lotTimerRef.current = setTimeout(async () => {
      try {
        const { default: api } = await import('@/config/axios');
        const r = await api.get('/skus/lots/check', { params: { lotNumber: lotVal } });
        const data = r.data?.data;
        if (data?.exists && data.matches?.length > 0) {
          const skuList = (data.matches as any[])
            .map((m: any) => `${m.skuCode}${m.expiryDate ? ` (HSD: ${m.expiryDate})` : ''}`)
            .join(', ');
          setOrderLotError(`LOT "${lotVal}" đã tồn tại cho: ${skuList}. Vui lòng dùng LOT khác.`);
        } else {
          setOrderLotError(undefined);
        }
      } catch {
        setOrderLotError(undefined); // Lỗi mạng → không block user
      } finally {
        setLotChecking(false);
      }
    }, 400);
  }, []);

  // Check số chứng từ / PO trùng — debounce 400ms gọi API /v1/grns/check-po
  const handlePoChange = useCallback((val: string) => {
    setSourceRef(val);
    setPoError(undefined);
    if (poTimerRef.current) clearTimeout(poTimerRef.current);
    const poVal = val.trim();
    if (!poVal) { setPoChecking(false); return; }
    setPoChecking(true);
    poTimerRef.current = setTimeout(async () => {
      try {
        const { default: api } = await import('@/config/axios');
        const r = await api.get('/grns/check-po', { params: { sourceReferenceCode: poVal } });
        const data = r.data?.data;
        if (data?.exists && data.orders?.length > 0) {
          const orderList = (data.orders as any[])
            .map((o: any) => `${o.receivingCode} (${o.status})`)
            .join(', ');
          setPoError(`Số chứng từ "${poVal}" đã được dùng trong: ${orderList}. Vui lòng kiểm tra lại.`);
        } else {
          setPoError(undefined);
        }
      } catch {
        setPoError(undefined);
      } finally {
        setPoChecking(false);
      }
    }, 400);
  }, []);

  const handleSelectSku = useCallback((id: string, sku: SkuOption | null) => {
    setItems(p => p.map(i => i.id === id
      ? {
          ...i,
          skuCode: sku?.skuCode ?? '',
          skuName: sku?.skuName ?? '',
          skuId: sku?.skuId ?? null,
          weightPerCartonKg: sku?.weightPerCartonKg ?? null,
          unitsPerCarton: sku?.unitsPerCarton ?? null,
          shelfLifeDays: sku?.shelfLifeDays ?? null,
        }
      : i
    ));
  }, []);

  // Bước 1: validate
  const handleSubmit = async () => {
    if (!warehouseId)                               { toast.error('Chọn kho nhận hàng'); return; }
    if (sourceType === 'SUPPLIER' && !supplierCode) { toast.error('Chọn nhà cung cấp'); return; }
    const valid = items.filter(i => i.skuCode.trim());
    if (!valid.length)                              { toast.error('Thêm ít nhất 1 sản phẩm'); return; }
    const noQty = valid.find(i => !i.expectedQty || Number(i.expectedQty) <= 0);
    if (noQty)                                      { toast.error(`Nhập số lượng cho: ${noQty.skuCode}`); return; }

    // Chặn nếu LOT phiếu bị trùng
    if (orderLotError) {
      toast.error(orderLotError);
      return;
    }

    // Cảnh báo PO trùng — vẫn cho tạo vì có thể nhập nhiều chuyến từ cùng 1 PO
    if (poError) {
      const confirmed = window.confirm(
        `⚠️ Số chứng từ đã được dùng trước đó.

${poError}

Bạn có chắc muốn tiếp tục tạo phiếu mới với số chứng từ này?`
      );
      if (!confirmed) return;
    }

    // Chặn hàng đã hết hạn HOẶC dưới 60 ngày
    const blockedItems = valid.filter(i => i.expiryDate && getExpiryInfo(i.expiryDate)?.level === 'expired');
    if (blockedItems.length > 0) {
      const details = blockedItems.map(i => {
        const info = getExpiryInfo(i.expiryDate);
        return `${i.skuCode} (${info?.label})`;
      }).join(', ');
      toast.error(`Không thể nhận: ${details}`);
      return;
    }

    const hardDateError = valid.find(i =>
      (i.mfgError && !i.mfgError.startsWith('Lưu ý')) ||
      (i.expError && !i.expError.startsWith('Lưu ý'))
    );
    if (hardDateError) {
      toast.error(`Lỗi ngày cho ${hardDateError.skuCode}: ${hardDateError.mfgError || hardDateError.expError}`);
      return;
    }

    await doSubmit(valid);
  };

  // Bước 2: gọi API
  const doSubmit = async (valid: ItemRow[]) => {
    const warnItems = valid.filter(i => i.expiryDate && getExpiryInfo(i.expiryDate)?.level === 'warn');
    if (warnItems.length > 0) {
      toast(`${warnItems.length} SKU còn 60–90 ngày HSD — sẽ ưu tiên FEFO khi xuất`, { icon: '⚠️' });
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
          // LOT là cấp phiếu — tất cả SKU trong phiếu dùng chung 1 LOT
          lotNumber: orderLotNumber.trim() || null,
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

  const selectedSupplier = suppliers.find(s => s.supplierCode === supplierCode);
  const filteredSuppliers = supplierSearch.trim()
    ? suppliers.filter(s => s.supplierName.toLowerCase().includes(supplierSearch.toLowerCase()) || s.supplierCode.toLowerCase().includes(supplierSearch.toLowerCase()))
    : suppliers;
  const totalQty = items.reduce((s, i) => s + (Number(i.expectedQty) || 0), 0);
  const validCount = items.filter(i => i.skuCode).length;

  if (!open) return null;

  return (
    <Portal>
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
                <div className="space-y-1.5">
                  <div className="relative">
                    <input type="text" placeholder="VD: PO-2024-001" value={sourceRef}
                      onChange={e => handlePoChange(e.target.value)}
                      className={`${inputCls} pr-9 ${
                        poError
                          ? 'border-orange-400 bg-orange-50 ring-1 ring-orange-300'
                          : sourceRef.trim() && !poChecking
                            ? 'border-emerald-400 bg-emerald-50/40'
                            : ''
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {poChecking ? (
                        <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin block" />
                      ) : poError ? (
                        <span className="material-symbols-outlined text-orange-500 text-[18px]">warning</span>
                      ) : sourceRef.trim() ? (
                        <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                      ) : null}
                    </div>
                  </div>
                  {poError && (
                    <div className="flex items-start gap-1.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
                      <span className="material-symbols-outlined text-orange-500 text-[14px] mt-0.5 flex-shrink-0">warning</span>
                      <p className="text-xs text-orange-700 leading-relaxed">{poError}</p>
                    </div>
                  )}
                </div>
              </Field>
            </div>

            {/* Ghi chú */}
            <Field label="Ghi chú">
              <input type="text" placeholder="VD: Xe tải 29C-12345 giao lúc 10h"
                value={note} onChange={e => setNote(e.target.value)} className={inputCls} />
            </Field>

            {/* Số lô — cấp phiếu: 1 phiếu = 1 LOT cho tất cả SKU */}
            <Field label="Số lô (LOT)">
              <div className="space-y-1.5">
                <div className="relative">
                  <input type="text" placeholder="VD: LOT-001"
                    value={orderLotNumber}
                    onChange={e => handleLotNumberChange(e.target.value)}
                    className={`${inputCls} pr-9 ${
                      orderLotError
                        ? 'border-red-400 bg-red-50 ring-1 ring-red-300'
                        : orderLotNumber.trim() && !lotChecking
                          ? 'border-emerald-400 bg-emerald-50/40'
                          : ''
                    }`}
                  />
                  {/* Icon trạng thái bên phải */}
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {lotChecking ? (
                      <span className="w-4 h-4 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin block" />
                    ) : orderLotError ? (
                      <span className="material-symbols-outlined text-red-500 text-[18px]">error</span>
                    ) : orderLotNumber.trim() ? (
                      <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
                    ) : null}
                  </div>
                </div>
                {orderLotError ? (
                  <div className="flex items-start gap-1.5 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                    <span className="material-symbols-outlined text-red-500 text-[14px] mt-0.5 flex-shrink-0">error</span>
                    <p className="text-xs text-red-600 leading-relaxed">{orderLotError}</p>
                  </div>
                ) : lotChecking ? (
                  <p className="text-xs text-indigo-500 flex items-center gap-1 px-1">
                    <span className="w-3 h-3 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin inline-block" />
                    Đang kiểm tra LOT...
                  </p>
                ) : orderLotNumber.trim() ? (
                  <p className="text-xs text-emerald-600 flex items-center gap-1 px-1">
                    <span className="material-symbols-outlined text-[13px]">check_circle</span>
                    LOT hợp lệ — áp dụng cho tất cả sản phẩm trong phiếu
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 px-1">
                    Để trống nếu chưa có số lô — hệ thống sẽ tự tạo khi nhập kho
                  </p>
                )}
              </div>
            </Field>

            {/* ── Sản phẩm ── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">
                    Danh sách sản phẩm <span className="text-red-400 normal-case font-normal">*</span>
                  </label>
                  {validCount > 0 && (() => {
                    // Tính tổng kg và gợi ý số BIN cần thiết
                    const totalKg = items
                      .filter(i => i.skuCode && i.weightPerCartonKg)
                      .reduce((s, i) => s + Number(i.expectedQty || 0) * (i.weightPerCartonKg ?? 0), 0);
                    // BIN T1 = 512kg, gợi ý theo tầng nặng nhất
                    const binsNeeded = totalKg > 0 ? Math.ceil(totalKg / 512) : null;
                    return (
                      <span className="ml-2 text-[11px] text-indigo-500 font-medium flex items-center gap-2">
                        {validCount} SKU · {totalQty} thùng
                        {totalKg > 0 && (
                          <>
                            <span className="text-gray-300">·</span>
                            <span className="font-bold text-indigo-600">
                              ≈ {totalKg % 1 === 0 ? totalKg : totalKg.toFixed(1)} kg tổng
                            </span>
                            {binsNeeded && (
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                                binsNeeded <= 1 ? 'bg-green-100 text-green-700' :
                                binsNeeded <= 3 ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                ~{binsNeeded} BIN T1
                              </span>
                            )}
                          </>
                        )}
                      </span>
                    );
                  })()}
                </div>
                <button type="button" onClick={() => setItems(p => [...p, makeItem()])}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-colors">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Thêm dòng
                </button>
              </div>

              {/* Column headers */}
              <div className="grid gap-2 px-3 mb-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                style={{ gridTemplateColumns: '2.4fr 0.7fr 0.8fr 1.1fr 1.3fr 28px' }}>
                <div>SKU</div>
                <div className="text-center">SL *</div>
                <div className="text-center text-indigo-400">≈ KG</div>
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
                      style={{ gridTemplateColumns: '2.4fr 0.7fr 0.8fr 1.1fr 1.3fr 28px' }}>

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

                    {/* KG tự tính = SL × weight_per_carton_kg */}
                    {(() => {
                      const qty = Number(item.expectedQty) || 0;
                      const w   = item.weightPerCartonKg;
                      if (!w || qty <= 0) return (
                        <div className="text-center text-[10px] text-gray-300">—</div>
                      );
                      const totalKg = qty * w;
                      // BIN T1 chứa max 512kg → cảnh báo nếu vượt
                      const binWarning = totalKg > 512;
                      return (
                        <div className="text-center">
                          <p className={`text-xs font-bold tabular-nums ${binWarning ? 'text-orange-600' : 'text-indigo-600'}`}>
                            {totalKg % 1 === 0 ? totalKg : totalKg.toFixed(1)} kg
                          </p>
                          {item.unitsPerCarton && (
                            <p className="text-[9px] text-gray-400 leading-tight">
                              {item.unitsPerCarton} {item.unit ?? 'đv'}/thùng
                            </p>
                          )}
                          {binWarning && (
                            <p className="text-[9px] text-orange-500 leading-tight">vượt 1 BIN</p>
                          )}
                        </div>
                      );
                    })()}

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
                const blocked    = validItems.filter(i => getExpiryInfo(i.expiryDate)?.level === 'expired');
                const warn       = validItems.filter(i => getExpiryInfo(i.expiryDate)?.level === 'warn');
                const noExpiry   = items.filter(i => i.skuCode && !i.expiryDate);
                if (!blocked.length && !warn.length && !noExpiry.length) return null;
                return (
                  <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-gray-400">event_busy</span>
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tổng hợp kiểm tra HSD</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {blocked.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-red-50">
                          <span className="material-symbols-outlined text-[15px] text-red-500">dangerous</span>
                          <span className="text-xs font-semibold text-red-700">{blocked.length} SKU KHÔNG ĐỦ HSD</span>
                          <span className="text-[10px] text-red-500 ml-auto">Dưới 60 ngày — không nhận</span>
                        </div>
                      )}
                      {warn.length > 0 && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-amber-50">
                          <span className="material-symbols-outlined text-[15px] text-amber-500">warning</span>
                          <span className="text-xs font-semibold text-amber-700">{warn.length} SKU HSD 60–90 ngày</span>
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