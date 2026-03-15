'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import api from '@/config/axios';
import { getStoredSession } from '@/services/authService';
import type { ApiResponse } from '@/interfaces/common';
import { useConfirm } from '@/components/ui/ModalProvider';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  parentCategoryId: number | null;
  parentCategoryName: string | null;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiFetchCategories(): Promise<Category[]> {
  const { data } = await api.get<ApiResponse<any>>('/categories');
  const raw = data.data?.content ?? data.data ?? [];
  return Array.isArray(raw) ? raw : [];
}

async function apiCreateCategory(categoryCode: string, categoryName: string, description: string): Promise<Category> {
  const { data } = await api.post<ApiResponse<Category>>('/categories', { categoryCode, categoryName, description: description || null });
  return data.data;
}

async function apiUpdateCategory(categoryId: number, categoryName: string, description: string): Promise<Category> {
  const { data } = await api.put<ApiResponse<Category>>(`/categories/${categoryId}`, { categoryName, description: description || null });
  return data.data;
}

async function apiDeactivateCategory(categoryId: number): Promise<void> {
  await api.patch(`/categories/${categoryId}/deactivate`);
}

async function apiMapToZone(categoryId: number): Promise<void> {
  await api.post(`/categories/${categoryId}/map-to-zone`);
}

// ─── Category Modal ───────────────────────────────────────────────────────────

function CategoryModal({ cat, onClose, onSaved }: {
  cat: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = cat !== null;
  const [code,   setCode]   = useState(cat?.categoryCode ?? '');
  const [name,   setName]   = useState(cat?.categoryName ?? '');
  const [desc,   setDesc]   = useState(cat?.description ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!code.trim()) { toast.error('Nhập mã category'); return; }
    if (!name.trim()) { toast.error('Nhập tên category'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiUpdateCategory(cat.categoryId, name.trim(), desc.trim());
        toast.success(`Đã cập nhật ${cat.categoryCode}`);
      } else {
        await apiCreateCategory(code.trim().toUpperCase(), name.trim(), desc.trim());
        toast.success(`Đã tạo category ${code.toUpperCase()}`);
      }
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi lưu category');
    } finally { setSaving(false); }
  };

  const inputCls = 'w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white';

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: 'rgba(17,24,39,0.55)', backdropFilter: 'blur(6px)' }}
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isEdit ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                <span className={`material-symbols-outlined text-[18px] ${isEdit ? 'text-amber-500' : 'text-indigo-500'}`}>
                  {isEdit ? 'edit' : 'add_box'}
                </span>
              </div>
              <h3 className="text-sm font-bold text-gray-900">{isEdit ? `Sửa ${cat.categoryCode}` : 'Tạo category mới'}</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã Category {!isEdit && <span className="text-red-400">*</span>}
              </label>
              <input value={code} onChange={e => setCode(e.target.value)} disabled={isEdit}
                placeholder="VD: HC"
                className={`${inputCls} font-mono ${isEdit ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} />
              {!isEdit && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Zone tương ứng sẽ là <span className="font-mono font-semibold text-indigo-500">Z-{code.toUpperCase() || '{CODE}'}</span>
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Tên Category <span className="text-red-400">*</span>
              </label>
              <input value={name} onChange={e => setName(e.target.value)}
                placeholder="VD: Household Care"
                className={inputCls} />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Mô tả</label>
              <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
                placeholder="Mô tả ngắn về category này..."
                className={`${inputCls} resize-none`} />
            </div>
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
                : <><span className="material-symbols-outlined text-[15px]">save</span>{isEdit ? 'Lưu thay đổi' : 'Tạo category'}</>}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function CategoryContent() {
  const confirm   = useConfirm();
  const isManager = getStoredSession()?.user?.roleCodes?.includes('MANAGER') ?? false;

  const [categories,   setCategories]   = useState<Category[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editCat,      setEditCat]      = useState<Category | null | undefined>(undefined);
  const [mappingId,    setMappingId]    = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiFetchCategories();
      setCategories(list);
    } catch { toast.error('Không tải được categories'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayCats = useMemo(() => {
    let list = [...categories];
    if (filterActive === 'ACTIVE')   list = list.filter(c => c.active);
    if (filterActive === 'INACTIVE') list = list.filter(c => !c.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.categoryCode.toLowerCase().includes(q) ||
        c.categoryName.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [categories, filterActive, search]);

  const handleDeactivate = (cat: Category) => {
    confirm({
      title: `Vô hiệu hóa ${cat.categoryCode}?`,
      description: 'SKU thuộc category này sẽ không được gợi ý putaway nữa.',
      variant: 'danger', icon: 'block', confirmText: 'Vô hiệu hóa',
      onConfirm: async () => {
        try {
          await apiDeactivateCategory(cat.categoryId);
          toast.success(`Đã vô hiệu hóa ${cat.categoryCode}`);
          load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
      },
    });
  };

  const handleMapToZone = async (cat: Category) => {
    setMappingId(cat.categoryId);
    try {
      await apiMapToZone(cat.categoryId);
      toast.success(`Đã map ${cat.categoryCode} → Zone Z-${cat.categoryCode}`);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi map zone');
    } finally { setMappingId(null); }
  };

  const stats = useMemo(() => ({
    total:    categories.length,
    active:   categories.filter(c => c.active).length,
    inactive: categories.filter(c => !c.active).length,
  }), [categories]);

  return (
    <div className="w-full font-sans space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Quản lý Category</h1>
          <p className="text-sm text-gray-500 mt-0.5">Phân loại sản phẩm · Mapping với zone để tự động gợi ý putaway</p>
        </div>
        {isManager && (
          <button onClick={() => setEditCat(null)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Tạo Category
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng',         val: stats.total,    color: 'text-gray-800',   bg: 'bg-white border-gray-200' },
          { label: 'Hoạt động',    val: stats.active,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Vô hiệu',      val: stats.inactive, color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã, tên, mô tả..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([['ALL','Tất cả'],['ACTIVE','Hoạt động'],['INACTIVE','Vô hiệu']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setFilterActive(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterActive === key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 bg-white rounded-xl hover:bg-indigo-50 disabled:opacity-50 transition-colors">
          <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          </div>
        ) : displayCats.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">category</span>
            <p className="text-sm text-gray-400">{search ? 'Không tìm thấy kết quả' : 'Chưa có category nào'}</p>
          </div>
        ) : (
          <>
            <div className="grid bg-gray-50 border-b border-gray-100"
              style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr auto' }}>
              {['Mã', 'Tên Category', 'Mô tả', 'Trạng thái', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {displayCats.map(cat => (
                <div key={cat.categoryId} className="grid items-center hover:bg-gray-50/60 transition-colors"
                  style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr auto' }}>

                  <div className="px-4 py-3.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-violet-500 text-[14px]">category</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 font-mono">{cat.categoryCode}</p>
                      {cat.parentCategoryName && (
                        <p className="text-[10px] text-gray-400">{cat.parentCategoryName}</p>
                      )}
                    </div>
                  </div>

                  <div className="px-4 py-3.5">
                    <p className="text-sm text-gray-700">{cat.categoryName}</p>
                    <p className="text-[11px] text-indigo-500 mt-0.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[11px]">warehouse</span>
                      Zone: <span className="font-mono font-semibold">Z-{cat.categoryCode}</span>
                    </p>
                  </div>

                  <div className="px-4 py-3.5">
                    <p className="text-xs text-gray-500 line-clamp-2">{cat.description || '—'}</p>
                  </div>

                  <div className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      cat.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${cat.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {cat.active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </div>

                  <div className="px-4 py-3.5 flex items-center gap-1">
                    {isManager && (
                      <>
                        <button onClick={() => setEditCat(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Sửa">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button onClick={() => handleMapToZone(cat)} disabled={mappingId === cat.categoryId}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-50" title="Map sang Zone">
                          <span className={`material-symbols-outlined text-[15px] ${mappingId === cat.categoryId ? 'animate-spin' : ''}`}>
                            {mappingId === cat.categoryId ? 'progress_activity' : 'link'}
                          </span>
                        </button>
                        {cat.active && (
                          <button onClick={() => handleDeactivate(cat)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Vô hiệu hóa">
                            <span className="material-symbols-outlined text-[15px]">block</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-400">{displayCats.length} / {categories.length} categories</p>
            </div>
          </>
        )}
      </div>

      {editCat !== undefined && (
        <CategoryModal cat={editCat} onClose={() => setEditCat(undefined)} onSaved={load} />
      )}
    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span></div>}>
      <CategoryContent />
    </Suspense>
  );
}
