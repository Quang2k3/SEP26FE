'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/config/axios';
import { getStoredSession } from '@/services/authService';
import type { ApiResponse, PageResponse } from '@/interfaces/common';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryTree {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  description: string | null;
  active: boolean;
  mappedZoneCode: string | null;
  zoneMapped: boolean;
  children: CategoryTree[];
}

interface Sku {
  skuId: number;
  skuCode: string;
  skuName: string;
  barcode: string | null;
  weightG: number | null;
  imageUrl: string | null;
  categoryCode: string | null;
  categoryName: string | null;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchCategoryTree(warehouseId: number): Promise<CategoryTree[]> {
  const { data } = await api.get<ApiResponse<CategoryTree[]>>('/categories/tree', {
    params: { warehouseId }
  });
  return data.data ?? [];
}

async function fetchSkusByCategory(categoryCode: string): Promise<Sku[]> {
  // API /skus/search chỉ filter theo skuCode+skuName, không filter theo category
  // → load all rồi filter client-side theo categoryCode
  const { data } = await api.get<ApiResponse<PageResponse<Sku>>>('/skus/search', {
    params: { keyword: '', page: 0, size: 500 }
  });
  const all: Sku[] = data.data?.content ?? [];
  return all.filter(s => s.categoryCode === categoryCode);
}

async function apiMapToZone(categoryId: number): Promise<void> {
  await api.post(`/categories/${categoryId}/map-to-zone`);
}

// ─── SKU Panel ────────────────────────────────────────────────────────────────

function SkuPanel({ categoryCode, categoryName, onClose }: {
  categoryCode: string;
  categoryName: string;
  onClose: () => void;
}) {
  const [skus, setSkus]       = useState<Sku[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  useEffect(() => {
    setLoading(true);
    fetchSkusByCategory(categoryCode)
      .then(setSkus)
      .catch(() => toast.error('Không tải được SKU'))
      .finally(() => setLoading(false));
  }, [categoryCode]);

  const filtered = search.trim()
    ? skus.filter(s =>
        s.skuCode.toLowerCase().includes(search.toLowerCase()) ||
        s.skuName.toLowerCase().includes(search.toLowerCase())
      )
    : skus;

  return (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-indigo-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-600 text-[13px]">inventory_2</span>
          </div>
          <p className="text-sm font-bold text-gray-800">
            SKU trong <span className="text-indigo-600">{categoryCode}</span>
            <span className="font-normal text-gray-400 ml-1">— {categoryName}</span>
          </p>
          {!loading && (
            <span className="text-[11px] text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full font-semibold">
              {skus.length} SKU
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex items-center">
            <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-indigo-300 text-[14px] pointer-events-none">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm SKU..."
              className="pl-8 pr-7 py-1.5 text-xs border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 w-40 bg-white placeholder:text-gray-300 text-gray-700 transition-all" />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors">
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
          <button onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <span className="material-symbols-outlined text-[15px]">close</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <span className="material-symbols-outlined animate-spin text-indigo-300 text-[24px]">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-8 gap-1.5">
          <span className="material-symbols-outlined text-gray-200 text-[32px]">inventory_2</span>
          <p className="text-sm text-gray-400">
            {search ? 'Không tìm thấy SKU' : 'Category này chưa có SKU nào'}
          </p>
          {!search && (
            <p className="text-xs text-gray-400">Vào <strong>Gán SKU</strong> để gán SKU vào category này</p>
          )}
        </div>
      ) : (
        <div className="p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {filtered.map(sku => (
              <div key={sku.skuId}
                className="bg-white rounded-xl border border-gray-100 p-3 hover:border-indigo-200 hover:shadow-sm transition-all group">
                {/* Image or placeholder */}
                <div className="w-full h-14 rounded-lg bg-gray-50 flex items-center justify-center mb-2 overflow-hidden">
                  {sku.imageUrl ? (
                    <img src={sku.imageUrl} alt={sku.skuName}
                      className="w-full h-full object-contain" />
                  ) : (
                    <span className="material-symbols-outlined text-gray-200 text-[28px]">inventory_2</span>
                  )}
                </div>
                <p className="text-[11px] font-bold text-indigo-600 font-mono truncate">{sku.skuCode}</p>
                <p className="text-xs text-gray-700 font-medium truncate mt-0.5 leading-tight">{sku.skuName}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {sku.barcode && (
                    <span className="text-[10px] text-gray-400 font-mono">{sku.barcode}</span>
                  )}
                  {sku.weightG && (
                    <span className="text-[10px] text-gray-400">{sku.weightG}g</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tree Node ────────────────────────────────────────────────────────────────

function TreeNode({ node, depth, onMapped }: {
  node: CategoryTree;
  depth: number;
  onMapped: () => void;
}) {
  const [open,       setOpen]       = useState(depth < 1);
  const [showSkus,   setShowSkus]   = useState(false);
  const [mapping,    setMapping]    = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const handleMap = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMapping(true);
    try {
      await apiMapToZone(node.categoryId);
      toast.success(`Đã tạo zone Z-${node.categoryCode}`);
      onMapped();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Lỗi tạo zone');
    } finally { setMapping(false); }
  };

  const handleRowClick = () => {
    if (hasChildren) {
      setOpen(v => !v);
    } else {
      // Leaf category → toggle SKU panel
      setShowSkus(v => !v);
    }
  };

  const toggleSkus = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSkus(v => !v);
  };

  return (
    <div>
      {/* Row */}
      <div
        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors cursor-pointer hover:bg-gray-50
          ${!node.active ? 'opacity-50' : ''}
          ${showSkus ? 'bg-indigo-50/40' : ''}`}
        style={{ paddingLeft: `${12 + depth * 20}px` }}
        onClick={handleRowClick}
      >
        {/* Expand chevron (for categories with children) */}
        <span className={`material-symbols-outlined text-[14px] flex-shrink-0 transition-transform
          ${hasChildren ? 'text-gray-300' : 'invisible'}
          ${open ? 'rotate-90' : ''}`}>
          chevron_right
        </span>

        {/* Icon */}
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0
          ${depth === 0 ? 'bg-violet-100' : depth === 1 ? 'bg-indigo-50' : 'bg-gray-50'}`}>
          <span className={`material-symbols-outlined text-[13px]
            ${depth === 0 ? 'text-violet-600' : 'text-indigo-400'}`}>
            {depth === 0 ? 'folder' : hasChildren ? 'folder_open' : 'label'}
          </span>
        </div>

        {/* Code */}
        <span className="text-xs font-bold text-gray-500 font-mono w-16 flex-shrink-0">{node.categoryCode}</span>

        {/* Name */}
        <span className="text-sm text-gray-800 flex-1">{node.categoryName}</span>

        {/* SKU count button — always visible */}
        <button onClick={toggleSkus}
          className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 transition-colors
            ${showSkus
              ? 'bg-indigo-100 text-indigo-700'
              : 'bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'
            }`}
          title="Xem SKU">
          <span className="material-symbols-outlined text-[11px]">inventory_2</span>
          SKU
        </button>

        {/* Zone status */}
        {node.zoneMapped ? (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">
            <span className="material-symbols-outlined text-[11px]">check_circle</span>
            {node.mappedZoneCode}
          </span>
        ) : (
          <button onClick={handleMap} disabled={mapping || !node.active}
            className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded-full flex-shrink-0 transition-colors disabled:opacity-50">
            <span className={`material-symbols-outlined text-[11px] ${mapping ? 'animate-spin' : ''}`}>
              {mapping ? 'progress_activity' : 'link_off'}
            </span>
            Chưa có zone
          </button>
        )}

        {!node.active && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">Vô hiệu</span>
        )}
      </div>

      {/* SKU panel — show below this row */}
      {showSkus && (
        <div style={{ paddingLeft: `${12 + depth * 20 + 24}px`, paddingRight: '12px', paddingBottom: '8px' }}>
          <SkuPanel
            categoryCode={node.categoryCode}
            categoryName={node.categoryName}
            onClose={() => setShowSkus(false)}
          />
        </div>
      )}

      {/* Children */}
      {hasChildren && open && (
        <div>
          {node.children.map(child => (
            <TreeNode key={child.categoryId} node={child} depth={depth + 1} onMapped={onMapped} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoryTreePage() {
  const [tree,    setTree]    = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');

  const warehouseId = getStoredSession()?.user?.warehouseIds?.[0] ?? 0;

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try { setTree(await fetchCategoryTree(warehouseId)); }
    catch { toast.error('Không tải được cây category'); }
    finally { setLoading(false); }
  }, [warehouseId]);

  useEffect(() => { load(); }, [load]);

  // Filter tree by search
  const filterTree = (nodes: CategoryTree[], q: string): CategoryTree[] =>
    nodes.reduce<CategoryTree[]>((acc, n) => {
      const match = n.categoryCode.toLowerCase().includes(q) || n.categoryName.toLowerCase().includes(q);
      const filteredChildren = filterTree(n.children ?? [], q);
      if (match || filteredChildren.length > 0) {
        acc.push({ ...n, children: filteredChildren });
      }
      return acc;
    }, []);

  const displayTree = search.trim()
    ? filterTree(tree, search.toLowerCase())
    : tree;

  const mapped   = tree.reduce((s, c) => s + (c.zoneMapped ? 1 : 0), 0);
  const unmapped = tree.length - mapped;

  return (
    <div className="w-full font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Cây Category & SKU</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Click vào category để xem SKU bên trong · Nút <strong className="text-indigo-600">SKU</strong> để toggle danh sách
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">search</span>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm category..."
              className="pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 w-44 bg-white" />
          </div>
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
            <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      {!loading && tree.length > 0 && (
        <div className="flex gap-3 flex-wrap">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-[15px]">check_circle</span>
            <span className="text-sm font-semibold text-emerald-700">{mapped} đã có zone</span>
          </div>
          {unmapped > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-[15px]">warning</span>
              <span className="text-sm font-semibold text-amber-700">{unmapped} chưa có zone</span>
            </div>
          )}
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2">
            <span className="text-sm text-gray-500">
              Convention zone: <span className="font-mono font-bold text-indigo-600">Z-{'{categoryCode}'}</span>
            </span>
          </div>
        </div>
      )}

      {/* Tree */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          </div>
        ) : displayTree.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">account_tree</span>
            <p className="text-sm text-gray-400">{search ? 'Không tìm thấy category' : 'Chưa có category nào'}</p>
          </div>
        ) : (
          <div className="py-2 space-y-0.5 px-2">
            {displayTree.map(node => (
              <TreeNode key={node.categoryId} node={node} depth={0} onMapped={load} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
