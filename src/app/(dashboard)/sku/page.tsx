'use client';

import { useEffect, useState, useCallback } from 'react';
import { AdminPage } from '@/components/layout/AdminPage';
import { DataTable } from '@/components/ui/Table';
import { Button } from '@/components/ui/Button';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';
import {
  searchSkus,
  getSkuThreshold,
  updateSkuThreshold,
  type SkuDetail,
  type SkuThreshold,
} from '@/services/skuService';
import type { Column } from '@/components/ui/Table';

// ─── Threshold Modal ──────────────────────────────────────────────────────────
function ThresholdModal({
  sku,
  onClose,
  onSaved,
}: {
  sku: SkuDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [threshold, setThreshold] = useState<SkuThreshold | null>(null);
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getSkuThreshold(sku.skuId)
      .then((t) => {
        setThreshold(t);
        setMinQty(String(t.minQty ?? ''));
        setMaxQty(String(t.maxQty ?? ''));
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [sku.skuId]);

  const handleSave = async () => {
    const min = parseFloat(minQty);
    const max = parseFloat(maxQty);
    if (isNaN(min) || isNaN(max) || min < 0 || max < 0) {
      toast.error('Ngưỡng tồn kho phải là số dương.');
      return;
    }
    if (max < min) {
      toast.error('maxQty phải ≥ minQty.');
      return;
    }
    try {
      setLoading(true);
      await updateSkuThreshold(sku.skuId, min, max);
      toast.success('Cập nhật ngưỡng tồn kho thành công!');
      onSaved();
      onClose();
    } catch {
      // interceptor toast
    } finally {
      setLoading(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Ngưỡng tồn kho</h2>
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{sku.skuCode} — {sku.skuName}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          {fetching ? (
            <div className="px-6 py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Min Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={minQty}
                    onChange={(e) => setMinQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <p className="text-[10px] text-gray-400">Cảnh báo khi tồn &lt; min</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">
                    Max Qty <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={maxQty}
                    onChange={(e) => setMaxQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <p className="text-[10px] text-gray-400">Giới hạn nhập thêm khi &gt; max</p>
                </div>
              </div>

              {threshold && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 text-xs text-gray-500">
                  Hiện tại: min = <strong>{threshold.minQty ?? '—'}</strong>, max = <strong>{threshold.maxQty ?? '—'}</strong>
                </div>
              )}
            </div>
          )}

          <div className="px-6 pb-5 flex justify-end gap-3">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
              Huỷ
            </button>
            <button
              onClick={handleSave}
              disabled={loading || fetching}
              className="px-5 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : null}
              {loading ? 'Đang lưu...' : 'Lưu ngưỡng'}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SkuPage() {
  const [skus, setSkus] = useState<SkuDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedSku, setSelectedSku] = useState<SkuDetail | null>(null);
  const PAGE_SIZE = 20;

  const load = useCallback(async (p = 0, kw = keyword) => {
    setLoading(true);
    try {
      const res = await searchSkus(kw || undefined, p, PAGE_SIZE);
      setSkus(res.content);
      setTotalPages(res.totalPages);
      setTotalElements(res.totalElements);
      setPage(p);
    } catch {
      // interceptor toast
    } finally {
      setLoading(false);
    }
  }, [keyword]);

  useEffect(() => { load(0); }, []);

  const columns: Column<SkuDetail>[] = [
    {
      key: 'skuCode',
      title: 'Mã SKU',
      render: (row) => (
        <span className="font-mono text-xs font-bold text-indigo-600">{row.skuCode}</span>
      ),
    },
    {
      key: 'skuName',
      title: 'Tên SKU',
      render: (row) => <span className="text-sm text-gray-800">{row.skuName}</span>,
    },
    {
      key: 'brand',
      title: 'Thương hiệu',
      render: (row) => <span className="text-sm text-gray-500">{row.brand ?? '—'}</span>,
    },
    {
      key: 'unit',
      title: 'Đơn vị',
      render: (row) => <span className="text-sm text-gray-500">{row.unit ?? '—'}</span>,
    },
    {
      key: 'active',
      title: 'Trạng thái',
      render: (row) => (
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
          row.active
            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
            : 'bg-gray-100 text-gray-500 ring-1 ring-gray-200'
        }`}>
          {row.active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      title: 'Ngưỡng tồn',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); setSelectedSku(row); }}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 mx-auto"
        >
          <span className="material-symbols-outlined text-[14px]">tune</span>
          Cấu hình
        </button>
      ),
    },
  ];

  return (
    <AdminPage
      title="Quản lý SKU"
      description="Tra cứu mặt hàng và cấu hình ngưỡng tồn kho."
    >
      {/* Search */}
      <div className="flex gap-3 items-center">
        <div className="flex flex-1 max-w-md items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-400 shadow-sm">
          <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          <input
            className="w-full bg-transparent border-none p-0 text-sm text-gray-800 focus:outline-none placeholder-gray-400"
            placeholder="Tìm mã SKU, tên sản phẩm..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load(0, keyword)}
          />
        </div>
        <Button size="sm" onClick={() => load(0, keyword)}>
          Tìm kiếm
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={skus}
        loading={loading}
        emptyText="Không tìm thấy SKU nào."
        page={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={PAGE_SIZE}
        onPrev={() => load(page - 1)}
        onNext={() => load(page + 1)}
      />

      {selectedSku && (
        <ThresholdModal
          sku={selectedSku}
          onClose={() => setSelectedSku(null)}
          onSaved={() => load(page)}
        />
      )}
    </AdminPage>
  );
}
