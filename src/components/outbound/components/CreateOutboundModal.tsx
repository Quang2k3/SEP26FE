'use client';

import { useState, useEffect, useRef } from 'react';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';
import { createOutbound, updateSalesOrder, updateTransfer } from '@/services/outboundService';
import { fetchCustomers, createCustomer, type Customer } from '@/services/customerService';
import { searchSkus, type SkuDetail } from '@/services/skuService';
import { fetchWarehouses, type Warehouse } from '@/services/warehouseService';
import type { OutboundType, OutboundItemRequest } from '@/interfaces/outbound';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  // Edit mode: truyền vào để sửa đơn DRAFT
  editItem?: import('@/interfaces/outbound').OutboundOrder | null;
}

// ─── Shared Combobox ──────────────────────────────────────────────────────────
interface ComboboxProps<T> {
  value: string;
  displayText: string;
  placeholder: string;
  icon: string;
  items: T[];
  getKey: (item: T) => string;
  getLabel: (item: T) => string;
  getSublabel: (item: T) => string;
  onSelect: (item: T) => void;
  onClear: () => void;
  // optional: cho phép "Tạo mới" khi không tìm thấy
  onCreateNew?: (query: string) => void;
  createNewLabel?: string;
}

function Combobox<T>({
  value, displayText, placeholder, icon,
  items, getKey, getLabel, getSublabel,
  onSelect, onClear,
  onCreateNew, createNewLabel,
}: ComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { if (!value) setQuery(''); }, [value]);

  const filtered = query.trim()
    ? items.filter(item =>
        getLabel(item).toLowerCase().includes(query.toLowerCase()) ||
        getSublabel(item).toLowerCase().includes(query.toLowerCase())
      )
    : items;

  // Kiểm tra query có khớp chính xác item nào không
  const exactMatch = query.trim() && items.some(item =>
    getLabel(item).toLowerCase() === query.trim().toLowerCase()
  );

  const handleSelect = (item: T) => {
    onSelect(item);
    setQuery('');
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className={`flex items-center gap-2 w-full px-3 py-2 bg-white border rounded-xl transition-all ${
        open ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'
      }`}>
        <span className="material-symbols-outlined text-gray-400 text-[16px] flex-shrink-0">{icon}</span>
        <input
          className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-400 min-w-0"
          placeholder={placeholder}
          value={value ? displayText : query}
          readOnly={!!value}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onClick={() => { if (value) return; setOpen(true); }}
        />
        {value ? (
          <button type="button"
            onClick={e => { e.stopPropagation(); onClear(); setQuery(''); setOpen(false); }}
            className="text-gray-300 hover:text-gray-500 flex-shrink-0">
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        ) : (
          <span className="material-symbols-outlined text-gray-400 text-[16px] flex-shrink-0 cursor-pointer"
            onClick={() => setOpen(o => !o)}>
            expand_more
          </span>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
          {filtered.length === 0 && !onCreateNew && (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">Không tìm thấy kết quả</p>
          )}

          {filtered.slice(0, 30).map(item => (
            <button key={getKey(item)} type="button" onMouseDown={() => handleSelect(item)}
              className={`w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between border-b border-gray-50 last:border-0 ${
                value === getKey(item) ? 'bg-indigo-50' : ''
              }`}>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{getLabel(item)}</p>
                <p className="text-xs text-gray-400 truncate">{getSublabel(item)}</p>
              </div>
              {value === getKey(item) && (
                <span className="material-symbols-outlined text-indigo-500 text-[16px] flex-shrink-0 ml-2">check</span>
              )}
            </button>
          ))}

          {/* Tạo mới — chỉ hiện khi có query + không trùng chính xác */}
          {onCreateNew && query.trim() && !exactMatch && (
            <button type="button"
              onMouseDown={() => { onCreateNew(query.trim()); setOpen(false); }}
              className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors flex items-center gap-2 border-t border-gray-100 text-indigo-600">
              <span className="material-symbols-outlined text-[15px]">person_add</span>
              <span className="text-sm">
                {createNewLabel ?? 'Tạo mới:'} <strong>"{query.trim()}"</strong>
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Create Customer Mini-Form ────────────────────────────────────────────────
function CreateCustomerForm({
  initialName,
  onCreated,
  onCancel,
}: {
  initialName: string;
  onCreated: (customer: Customer) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Vui lòng nhập tên khách hàng.'); return; }
    try {
      setLoading(true);
      const customer = await createCustomer({ customerName: name.trim(), phone: phone || undefined, email: email || undefined });
      toast.success(`Đã tạo khách hàng: ${customer.customerName} (${customer.customerCode})`);
      onCreated(customer);
    } catch { } finally { setLoading(false); }
  };

  return (
    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-indigo-700 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-[14px]">person_add</span>
          Tạo khách hàng mới
        </p>
        <button type="button" onClick={onCancel} className="text-indigo-400 hover:text-indigo-600">
          <span className="material-symbols-outlined text-[15px]">close</span>
        </button>
      </div>

      <div className="space-y-2">
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">
            Tên khách hàng <span className="text-red-500">*</span>
          </label>
          <input value={name} onChange={e => setName(e.target.value)}
            placeholder="Nhập tên đầy đủ..."
            className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Số điện thoại</label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="0901..."
              className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Email</label>
            <input value={email} onChange={e => setEmail(e.target.value)}
              type="email" placeholder="email@..."
              className="w-full px-3 py-2 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <p className="text-[10px] text-indigo-500 flex-1">
          Mã khách hàng sẽ được hệ thống tự tạo (CUST-YYYYMMDD-XXXX)
        </p>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs text-indigo-600 bg-white border border-indigo-200 rounded-lg hover:bg-indigo-50">
          Huỷ
        </button>
        <button type="button" onClick={handleCreate} disabled={loading || !name.trim()}
          className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 flex items-center gap-1 disabled:opacity-60">
          {loading && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {loading ? 'Đang tạo...' : 'Tạo & chọn'}
        </button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface ItemRow {
  skuId: string;
  skuCode: string;
  skuName: string;
  unit: string | null;
  brand: string | null;
  quantity: string;
  note: string;
}

const EMPTY_ROW = (): ItemRow => ({
  skuId: '', skuCode: '', skuName: '', unit: null, brand: null, quantity: '', note: '',
});

export default function CreateOutboundModal({ open, onClose, onCreated, editItem }: Props) {
  const isEdit = !!editItem;
  const orderType: OutboundType = 'SALES_ORDER'; // Chỉ còn Sales Order
  const [customerCode, setCustomerCode] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [items, setItems] = useState<ItemRow[]>([EMPTY_ROW()]);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [allSkus, setAllSkus] = useState<SkuDetail[]>([]);

  // State tạo khách hàng mới inline
  const [showCreateCustomer, setShowCreateCustomer] = useState(false);
  const [newCustomerInitialName, setNewCustomerInitialName] = useState('');

  useEffect(() => {
    if (!open) return;
    if (editItem) {
      // Edit mode: pre-fill đầy đủ từ đơn hiện tại
      // customerCode + customerName từ BE (đã thêm vào OutboundResponse)
      setCustomerCode(editItem.customerCode ?? '');
      setCustomerName(editItem.customerName ?? '');
      // deliveryDate: LocalDate từ BE dạng 'YYYY-MM-DD'
      setDeliveryDate(
        editItem.deliveryDate
          ? String(editItem.deliveryDate).split('T')[0]
          : ''
      );
      // destinationWarehouseCode từ BE
      setNote(editItem.note ?? '');
      setItems(
        editItem.items?.length
          ? editItem.items.map(i => ({
              skuId: String(i.skuId),
              skuCode: i.skuCode,
              skuName: i.skuName,
              unit: null, brand: null,
              quantity: String(i.requestedQty),
              note: i.note ?? '',
            }))
          : [EMPTY_ROW()]
      );
    } else {
      ('SALES_ORDER');
      setCustomerCode(''); setCustomerName('');
      setDeliveryDate('');
      setItems([EMPTY_ROW()]); setNote('');
    }
    setShowCreateCustomer(false);
    fetchCustomers().then(setCustomers).catch(() => {});
    fetchWarehouses().then(setWarehouses).catch(() => {});
    searchSkus('', 0, 200).then(r => setAllSkus(r.content)).catch(() => {});
  }, [open, editItem]);

  if (!open) return null;

  const addItem = () => setItems(p => [...p, EMPTY_ROW()]);
  const removeItem = (idx: number) => setItems(p => p.filter((_, i) => i !== idx));

  const selectSku = (idx: number, sku: SkuDetail) => {
    setItems(p => p.map((row, i) => i !== idx ? row : {
      ...row, skuId: String(sku.skuId), skuCode: sku.skuCode,
      skuName: sku.skuName, unit: sku.unit, brand: sku.brand,
    }));
  };

  const clearSku = (idx: number) => setItems(p => p.map((row, i) => i !== idx ? row : EMPTY_ROW()));
  const updateField = (idx: number, field: 'quantity' | 'note', val: string) =>
    setItems(p => p.map((row, i) => i !== idx ? row : { ...row, [field]: val }));

  // Callback khi tạo khách hàng mới thành công
  const handleCustomerCreated = (customer: Customer) => {
    setCustomers(prev => [...prev, customer]);  // thêm vào list
    setCustomerCode(customer.customerCode);
    setCustomerName(customer.customerName);
    setShowCreateCustomer(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedItems: OutboundItemRequest[] = items
      .filter(i => i.skuId && i.quantity)
      .map(i => ({ skuId: parseInt(i.skuId, 10), quantity: parseFloat(i.quantity), note: i.note || undefined }));

    if (parsedItems.length === 0) { toast.error('Vui lòng thêm ít nhất 1 SKU.'); return; }
    if (orderType === 'SALES_ORDER' && !customerCode) { toast.error('Vui lòng chọn khách hàng.'); return; }

    try {
      setLoading(true);
      if (isEdit && editItem) {
        // Edit mode: gọi update API
        const payload = {
          customerCode: customerCode || undefined,
          deliveryDate: deliveryDate ? deliveryDate : undefined,
          items: parsedItems,
          note: note || undefined,
        };
        if (true) {
          await updateSalesOrder(editItem.documentId, payload);
        } else {
          await updateTransfer(editItem.documentId, payload);
        }
        toast.success('Cập nhật lệnh xuất kho thành công!');
      } else {
        const result = await createOutbound({
          orderType,
          customerCode: customerCode,
          deliveryDate: deliveryDate ? deliveryDate : undefined,
          items: parsedItems,
          note: note || undefined,
        });
        if (result?.stockWarnings?.length) {
          const w = result.stockWarnings.map(w => `${w.skuCode}: còn ${w.availableQty}`).join(', ');
          toast(`⚠️ Thiếu hàng: ${w}`, { icon: '⚠️', duration: 5000 });
        } else {
          toast.success('Tạo lệnh xuất kho thành công!');
        }
      }
      onCreated(); onClose();
    } catch (err: unknown) {
      // Interceptor đã toast lỗi 4xx/5xx — chỉ toast nếu chưa được xử lý
      if (!(err as any)?._toastedByInterceptor) {
        const msg = (err as any)?.response?.data?.message ?? (err as any)?.message ?? 'Thao tác thất bại.';
        if (!(err as any)?._toastedByInterceptor) {
        toast.error(msg, { duration: 6000 });
        }
      }
    } finally { setLoading(false); }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-gray-100">

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                <span className="material-symbols-outlined text-indigo-600 text-[20px]">outbound</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">{isEdit ? 'Sửa lệnh xuất kho' : 'Tạo lệnh xuất kho'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{isEdit ? `Đang sửa: ${editItem?.documentCode}` : 'Tạo Sales Order hoặc Internal Transfer'}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {/* Body */}
          <form id="create-ob-form" onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">

            
            {/* Customer / Warehouse */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Khách hàng <span className="text-red-500">*</span>
                  </label>

                  {showCreateCustomer ? (
                    <CreateCustomerForm
                      initialName={newCustomerInitialName}
                      onCreated={handleCustomerCreated}
                      onCancel={() => setShowCreateCustomer(false)}
                    />
                  ) : (
                    <Combobox<Customer>
                      value={customerCode}
                      displayText={`${customerName} (${customerCode})`}
                      placeholder="Tìm tên hoặc mã khách hàng..."
                      icon="person"
                      items={customers}
                      getKey={c => c.customerCode}
                      getLabel={c => c.customerName}
                      getSublabel={c => [c.customerCode, c.phone].filter(Boolean).join(' · ')}
                      onSelect={c => { setCustomerCode(c.customerCode); setCustomerName(c.customerName); }}
                      onClear={() => { setCustomerCode(''); setCustomerName(''); }}
                      onCreateNew={name => { setNewCustomerInitialName(name); setShowCreateCustomer(true); }}
                      createNewLabel="Tạo khách hàng mới:"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">
                    Ngày giao hàng <span className="text-red-500">*</span>
                  </label>
                  <input required type="date" min={today} value={deliveryDate}
                    onChange={e => setDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
            

            {/* SKU list */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-600">
                  Danh sách sản phẩm <span className="text-red-500">*</span>
                </label>
                <button type="button" onClick={addItem}
                  className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800">
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  Thêm SKU
                </button>
              </div>
              <div className="space-y-2">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                    <div className="flex gap-2 items-start">
                      <div className="flex-1 min-w-0">
                        <Combobox<SkuDetail>
                          value={item.skuId}
                          displayText={`${item.skuName} (${item.skuCode})`}
                          placeholder="Tìm mã hoặc tên sản phẩm..."
                          icon="inventory_2"
                          items={allSkus}
                          getKey={s => String(s.skuId)}
                          getLabel={s => s.skuName}
                          getSublabel={s => [s.skuCode, s.unit, s.brand].filter(Boolean).join(' · ')}
                          onSelect={s => selectSku(idx, s)}
                          onClear={() => clearSku(idx)}
                        />
                      </div>
                      <div className="w-28 flex-shrink-0">
                        <input required={!!item.skuId} type="number" min={1} step="any"
                          placeholder="Số lượng" value={item.quantity}
                          onChange={e => updateField(idx, 'quantity', e.target.value)}
                          className="w-full px-2.5 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white" />
                        {item.unit && item.skuId && (
                          <p className="text-[10px] text-gray-400 mt-0.5 px-1">{item.unit}</p>
                        )}
                      </div>
                      {items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)}
                          className="p-2 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      )}
                    </div>
                    {item.skuId && (
                      <input type="text" placeholder="Ghi chú dòng (tuỳ chọn)"
                        value={item.note} onChange={e => updateField(idx, 'note', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-300 bg-white" />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Ghi chú đơn hàng</label>
              <textarea rows={2} placeholder="Ghi chú thêm (không bắt buộc)..."
                value={note} onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
          </form>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 flex-shrink-0">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Huỷ
            </button>
            <button type="submit" form="create-ob-form" disabled={loading}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[16px]">outbound</span>
              }
              {loading ? (isEdit ? 'Đang cập nhật...' : 'Đang tạo...') : (isEdit ? 'Lưu thay đổi' : 'Tạo lệnh xuất')}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}