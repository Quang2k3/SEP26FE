'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/config/axios';
import type { ApiResponse, PageResponse } from '@/interfaces/common';
import Pagination from '@/components/ui/Pagination';
import toast from 'react-hot-toast';
import Portal from '@/components/ui/Portal';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Sku {
  skuId: number;
  skuCode: string;
  skuName: string;
  categoryId: number | null;
  categoryCode: string | null;
  categoryName: string | null;
}

interface Category {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  active: boolean;
}

// ─── Assign Modal ─────────────────────────────────────────────────────────────

function AssignModal({ sku, categories, onClose, onSaved }: {
  sku: Sku;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [selectedCode, setSelectedCode] = useState(sku.categoryCode ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selectedCode) { toast.error('Chọn category'); return; }
    setSaving(true);
    try {
      await api.patch(`/skus/${sku.skuId}/assign-category`, { categoryCode: selectedCode });
      toast.success(`Đã gán ${sku.skuCode} → ${selectedCode}`);
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi gán category');
    } finally { setSaving(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Gán Category</h3>
              <p className="text-[11px] text-gray-400 mt-0.5 font-mono">{sku.skuCode} — {sku.skuName}</p>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-5">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
              Chọn Category <span className="text-red-400">*</span>
            </label>
            <select value={selectedCode} onChange={e => setSelectedCode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white">
              <option value="">— Bỏ gán category —</option>
              {categories.filter(c => c.active).map(cat => (
                <option key={cat.categoryId} value={cat.categoryCode}>
                  {cat.categoryCode} — {cat.categoryName}
                </option>
              ))}
            </select>
            {selectedCode && (
              <p className="text-[11px] text-indigo-500 mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">warehouse</span>
                Putaway sẽ gợi ý zone: <span className="font-mono font-bold">Z-{selectedCode}</span>
              </p>
            )}
          </div>
          <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2.5 bg-gray-50/50">
            <button onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
              Huỷ
            </button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl flex items-center gap-1.5 disabled:opacity-60 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
              {saving
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</>
                : <><span className="material-symbols-outlined text-[15px]">save</span>Lưu</>}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AssignSkuPage() {
  const [skus, setSkus]           = useState<Sku[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading]     = useState(false);
  const [keyword, setKeyword]     = useState('');
  const [filterCat, setFilterCat] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>('ALL');
  const [editSku, setEditSku]     = useState<Sku | null>(null);
  const [page, setPage]           = useState(0);
  const PAGE_SIZE = 10;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [skuRes, catRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<Sku>>>('/skus/search', { params: { keyword: '', page: 0, size: 500 } }),
        api.get<ApiResponse<any>>('/categories'),
      ]);
      setSkus(skuRes.data.data?.content ?? []);
      const cats = catRes.data.data?.content ?? catRes.data.data ?? [];
      setCategories(Array.isArray(cats) ? cats : []);
    } catch { toast.error('Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const displaySkus = useMemo(() => {
    let list = [...skus];
    if (filterCat === 'ASSIGNED')   list = list.filter(s => s.categoryId !== null);
    if (filterCat === 'UNASSIGNED') list = list.filter(s => s.categoryId === null);
    if (keyword.trim()) {
      const q = keyword.toLowerCase();
      list = list.filter(s =>
        s.skuCode.toLowerCase().includes(q) ||
        s.skuName.toLowerCase().includes(q) ||
        s.categoryCode?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [skus, filterCat, keyword]);

  const totalPages = Math.ceil(displaySkus.length / PAGE_SIZE);
  const pagedSkus  = displaySkus.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const stats = useMemo(() => ({
    total:      skus.length,
    assigned:   skus.filter(s => s.categoryId !== null).length,
    unassigned: skus.filter(s => s.categoryId === null).length,
  }), [skus]);

  return (
    <div className="w-full font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Gán Category cho SKU</h1>
          <p className="text-sm text-gray-500 mt-0.5">SKU chưa có category sẽ không được gợi ý putaway zone</p>
        </div>
        <button onClick={loadData} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
          <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng SKU',         val: stats.total,      color: 'text-gray-800',   bg: 'bg-white border-gray-200' },
          { label: 'Đã gán',           val: stats.assigned,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Chưa gán',         val: stats.unassigned, color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-0.5 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          <input value={keyword} onChange={e => { setKeyword(e.target.value); setPage(0); }}
            placeholder="Tìm mã SKU, tên, category..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([['ALL','Tất cả'],['ASSIGNED','Đã gán'],['UNASSIGNED','Chưa gán']] as const).map(([key, label]) => (
            <button key={key} onClick={() => { setFilterCat(key); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterCat === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          </div>
        ) : displaySkus.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">inventory_2</span>
            <p className="text-sm text-gray-400">{keyword ? 'Không tìm thấy SKU' : 'Không có SKU nào'}</p>
          </div>
        ) : (
          <>
            <div className="grid bg-gray-50 border-b border-gray-100"
              style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr' }}>
              {['Mã SKU', 'Tên sản phẩm', 'Category', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {pagedSkus.map(sku => (
                <div key={sku.skuId} className="grid items-center hover:bg-gray-50/60 transition-colors"
                  style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr' }}>
                  <div className="px-4 py-3.5">
                    <span className="text-sm font-bold text-gray-900 font-mono">{sku.skuCode}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-sm text-gray-700">{sku.skuName}</p>
                  </div>
                  <div className="px-4 py-3.5">
                    {sku.categoryCode ? (
                      <div>
                        <span className="text-sm font-semibold text-indigo-700">{sku.categoryCode}</span>
                        <p className="text-[11px] text-gray-400 mt-0.5">{sku.categoryName}</p>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-semibold">
                        Chưa gán
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3.5">
                    <button onClick={() => setEditSku(sku)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors">
                      <span className="material-symbols-outlined text-[13px]">edit</span>
                      {sku.categoryCode ? 'Đổi' : 'Gán'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination
              page={page} totalPages={totalPages}
              totalItems={displaySkus.length} pageSize={PAGE_SIZE}
              onPage={setPage}
            />
          </>
        )}
      </div>

      {editSku && (
        <AssignModal
          sku={editSku}
          categories={categories}
          onClose={() => setEditSku(null)}
          onSaved={loadData}
        />
      )}
    </div>
  );
}
