'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/config/axios';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import type { ApiResponse, PageResponse } from '@/interfaces/common';
import type { BinOccupancyResponse, BinInventoryItem } from '@/services/putawayService';
import toast from 'react-hot-toast';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetchBins(params: {
  zoneId?: number;
  occupancyStatus?: string;
  page?: number;
  size?: number;
}): Promise<{ content: BinOccupancyResponse[]; totalElements: number }> {
  const { data } = await api.get<ApiResponse<PageResponse<BinOccupancyResponse>>>(
    '/bins/occupancy', { params: { ...params, size: params.size ?? 200 } }
  );
  return { content: data.data?.content ?? [], totalElements: data.data?.totalElements ?? 0 };
}

async function apiFetchBinDetail(locationId: number): Promise<BinOccupancyResponse | null> {
  try {
    const { data } = await api.get<ApiResponse<BinOccupancyResponse>>(`/bins/${locationId}/occupancy`);
    return data.data ?? null;
  } catch { return null; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function usagePct(bin: BinOccupancyResponse): number {
  const max = Number(bin.maxWeightKg);
  if (!max) return Number(bin.occupiedQty) > 0 ? 50 : 0;
  return Math.min(100, Math.round(((Number(bin.occupiedQty) + Number(bin.reservedQty)) / max) * 100));
}

const STATUS = {
  EMPTY:   { label: 'Trống',     dot: 'bg-gray-300',    badge: 'bg-gray-100 text-gray-500',   row: 'hover:bg-gray-50',     bar: '#94a3b8' },
  PARTIAL: { label: 'Đang dùng', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700',  row: 'hover:bg-amber-50/40', bar: '#f59e0b' },
  FULL:    { label: 'Đầy',       dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700',      row: 'hover:bg-red-50/40',   bar: '#ef4444' },
} as const;

// ─── Bin Detail Sidebar ───────────────────────────────────────────────────────

function BinDetailSidebar({
  bin, onClose,
}: { bin: BinOccupancyResponse; onClose: () => void }) {
  const [detail, setDetail] = useState<BinOccupancyResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetchBinDetail(bin.locationId).then(d => {
      setDetail(d);
      setLoading(false);
    });
  }, [bin.locationId]);

  const cfg  = STATUS[bin.occupancyStatus];
  const pct  = usagePct(bin);
  const items: BinInventoryItem[] = detail?.inventoryItems ?? [];

  return (
    <aside className="w-80 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-indigo-500 text-[18px]">inventory</span>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{bin.locationCode}</p>
            <p className="text-[11px] text-gray-400">
              {bin.grandParentLocationCode && `${bin.grandParentLocationCode} › `}
              {bin.parentLocationCode ?? '—'}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Status + usage */}
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            <span className="text-sm font-extrabold text-gray-700 tabular-nums">{pct}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, background: cfg.bar }} />
          </div>
          <div className="grid grid-cols-3 gap-1.5 pt-0.5">
            {[
              { label: 'Tối đa', val: bin.maxWeightKg ? `${Number(bin.maxWeightKg)}` : '∞' },
              { label: 'Đã dùng', val: Number(bin.occupiedQty).toFixed(0) },
              { label: 'Còn lại', val: bin.availableQty != null ? Number(bin.availableQty).toFixed(0) : '—' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-white rounded-lg p-2 text-center border border-gray-100">
                <p className="text-[9px] text-gray-400 font-medium">{label}</p>
                <p className="text-xs font-extrabold text-gray-800 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {bin.isStaging && (
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">local_shipping</span>Staging
            </span>
          )}
          {bin.isPickingFace && (
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">hand_gesture</span>Picking Face
            </span>
          )}
          {!bin.active && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">Vô hiệu</span>
          )}
          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
            {bin.zoneCode}
          </span>
        </div>

        {/* Inventory items */}
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[11px]">inventory_2</span>
            Hàng trong BIN
          </p>

          {loading ? (
            <div className="flex justify-center py-8">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[24px]">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-1.5 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <span className="material-symbols-outlined text-gray-300 text-[28px]">inbox</span>
              <p className="text-xs text-gray-400">BIN trống</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((inv, i) => (
                <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-indigo-600">{inv.skuCode}</p>
                      <p className="text-xs text-gray-700 font-medium truncate mt-0.5">{inv.skuName}</p>
                      {inv.lotNumber && (
                        <p className="text-[10px] text-gray-400 mt-1">
                          Lô: <span className="font-semibold">{inv.lotNumber}</span>
                          {inv.expiryDate && (
                            <span className="ml-1.5">HSD: {new Date(inv.expiryDate).toLocaleDateString('vi-VN')}</span>
                          )}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-gray-800">{Number(inv.quantity).toFixed(0)}</p>
                      <p className="text-[9px] text-gray-400">tồn kho</p>
                      {Number(inv.reservedQty) > 0 && (
                        <p className="text-[10px] text-amber-600 font-semibold">
                          -{Number(inv.reservedQty).toFixed(0)} reserved
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

type FilterStatus = 'ALL' | 'EMPTY' | 'PARTIAL' | 'FULL';

export default function BinOccupancyPage() {
  const [zones, setZones]               = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [bins, setBins]                 = useState<BinOccupancyResponse[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [selectedBin, setSelectedBin]   = useState<BinOccupancyResponse | null>(null);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [searchTerm, setSearchTerm]     = useState('');
  const [sortBy, setSortBy]             = useState<'code' | 'usage' | 'status'>('code');

  // ── Load zones ──
  useEffect(() => {
    fetchZones({ activeOnly: true })
      .then(z => {
        setZones(z);
        if (z.length > 0) loadBins(z[0]);
      })
      .catch(() => toast.error('Không tải được zone'))
      .finally(() => setLoadingZones(false));
  }, []);

  const loadBins = useCallback(async (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedBin(null);
    setLoading(true);
    try {
      const { content } = await apiFetchBins({ zoneId: zone.zoneId, size: 500 });
      setBins(content);
    } catch { toast.error('Không tải được bins'); }
    finally { setLoading(false); }
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const total   = bins.length;
    const empty   = bins.filter(b => b.occupancyStatus === 'EMPTY').length;
    const partial = bins.filter(b => b.occupancyStatus === 'PARTIAL').length;
    const full    = bins.filter(b => b.occupancyStatus === 'FULL').length;
    const totalCap = bins.reduce((s, b) => s + Number(b.maxWeightKg ?? 0), 0);
    const totalUsed = bins.reduce((s, b) => s + Number(b.occupiedQty ?? 0), 0);
    const avgPct = totalCap > 0 ? Math.round((totalUsed / totalCap) * 100) : 0;
    return { total, empty, partial, full, avgPct };
  }, [bins]);

  // ── Filter + search + sort ──
  const displayBins = useMemo(() => {
    let list = [...bins];
    if (filterStatus !== 'ALL') list = list.filter(b => b.occupancyStatus === filterStatus);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b =>
        b.locationCode.toLowerCase().includes(q) ||
        b.parentLocationCode?.toLowerCase().includes(q) ||
        b.grandParentLocationCode?.toLowerCase().includes(q) ||
        b.zoneCode.toLowerCase().includes(q)
      );
    }
    list.sort((a, b) => {
      if (sortBy === 'code')   return a.locationCode.localeCompare(b.locationCode);
      if (sortBy === 'status') return a.occupancyStatus.localeCompare(b.occupancyStatus);
      if (sortBy === 'usage')  return usagePct(b) - usagePct(a);
      return 0;
    });
    return list;
  }, [bins, filterStatus, searchTerm, sortBy]);

  const STATUS_FILTERS: { key: FilterStatus; label: string; count: number; cls: string }[] = [
    { key: 'ALL',     label: 'Tất cả',    count: stats.total,   cls: 'bg-gray-800 text-white' },
    { key: 'EMPTY',   label: 'Trống',     count: stats.empty,   cls: 'bg-gray-100 text-gray-700' },
    { key: 'PARTIAL', label: 'Đang dùng', count: stats.partial, cls: 'bg-amber-100 text-amber-700' },
    { key: 'FULL',    label: 'Đầy',       count: stats.full,    cls: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="w-full h-full font-sans flex flex-col gap-4">

      {/* ── Page header ── */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Bin Occupancy</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tình trạng chiếm dụng từng ô bin trong kho</p>
      </div>

      {/* ── Zone selector ── */}
      {loadingZones ? (
        <div className="flex gap-2">
          {[1,2,3].map(i => <div key={i} className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2 flex-shrink-0">
          {zones.map(z => (
            <button key={z.zoneId}
              onClick={() => loadBins(z)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                ${selectedZone?.zoneId === z.zoneId
                  ? 'bg-gray-900 border-gray-900 text-white shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                }`}>
              <span className="material-symbols-outlined text-[15px]">warehouse</span>
              {z.zoneCode}
            </button>
          ))}
        </div>
      )}

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 flex-shrink-0">
        {[
          { label: 'Tổng BIN',    val: stats.total,   sub: 'bins',          color: 'text-gray-800',   bg: 'bg-white border-gray-200' },
          { label: 'Trống',       val: stats.empty,   sub: 'bins',          color: 'text-gray-600',   bg: 'bg-white border-gray-200' },
          { label: 'Đang dùng',   val: stats.partial, sub: 'bins',          color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200' },
          { label: 'Đầy',         val: stats.full,    sub: 'bins',          color: 'text-red-700',    bg: 'bg-red-50 border-red-200' },
          { label: 'Trung bình',  val: `${stats.avgPct}%`, sub: 'chiếm dụng', color: stats.avgPct >= 80 ? 'text-red-700' : stats.avgPct >= 50 ? 'text-amber-700' : 'text-emerald-700', bg: 'bg-white border-gray-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-0.5 tabular-nums ${s.color}`}>{s.val}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3 flex-shrink-0">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Tìm BIN, kệ, dãy..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-1.5 bg-gray-100 rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button key={f.key}
              onClick={() => setFilterStatus(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5
                ${filterStatus === f.key ? f.cls + ' shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
              <span className="tabular-nums opacity-70">{f.count}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
          className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 text-gray-600">
          <option value="code">Sắp xếp: Mã BIN</option>
          <option value="usage">Sắp xếp: % Chiếm dụng</option>
          <option value="status">Sắp xếp: Trạng thái</option>
        </select>

        <button onClick={() => selectedZone && loadBins(selectedZone)}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 bg-white rounded-xl hover:bg-indigo-50 transition-colors disabled:opacity-50">
          <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          Làm mới
        </button>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* Table */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
            </div>
          ) : displayBins.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2">
              <span className="material-symbols-outlined text-gray-200 text-[48px]">grid_off</span>
              <p className="text-sm text-gray-400">Không có kết quả</p>
            </div>
          ) : (
            <div className="overflow-y-auto">
              {/* Table header */}
              <div className="sticky top-0 bg-gray-50 border-b border-gray-100 grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr] gap-0 z-10">
                {['Mã BIN', 'Zone', 'Kệ / Dãy', 'Chiếm dụng', 'Trạng thái', 'Còn lại'].map(h => (
                  <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-gray-50">
                {displayBins.map(bin => {
                  const cfg  = STATUS[bin.occupancyStatus];
                  const pct  = usagePct(bin);
                  const isSelected = selectedBin?.locationId === bin.locationId;

                  return (
                    <div key={bin.locationId}
                      onClick={() => setSelectedBin(prev => prev?.locationId === bin.locationId ? null : bin)}
                      className={`grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr] gap-0 cursor-pointer transition-colors
                        ${isSelected ? 'bg-indigo-50' : cfg.row}`}>

                      {/* Bin code */}
                      <div className="px-4 py-3 flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <span className="text-sm font-bold text-gray-900">{bin.locationCode}</span>
                        {bin.isStaging && (
                          <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">STG</span>
                        )}
                      </div>

                      {/* Zone */}
                      <div className="px-4 py-3 flex items-center">
                        <span className="text-xs text-gray-500">{bin.zoneCode}</span>
                      </div>

                      {/* Rack / Aisle */}
                      <div className="px-4 py-3 flex items-center">
                        <span className="text-xs text-gray-500">
                          {[bin.grandParentLocationCode, bin.parentLocationCode].filter(Boolean).join(' / ') || '—'}
                        </span>
                      </div>

                      {/* Usage bar */}
                      <div className="px-4 py-3 flex items-center gap-2.5">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: cfg.bar }} />
                        </div>
                        <span className="text-xs font-bold text-gray-700 tabular-nums w-9 text-right">{pct}%</span>
                      </div>

                      {/* Status badge */}
                      <div className="px-4 py-3 flex items-center">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${cfg.badge}`}>
                          {cfg.label}
                        </span>
                      </div>

                      {/* Available */}
                      <div className="px-4 py-3 flex items-center">
                        <span className="text-xs font-semibold text-gray-700 tabular-nums">
                          {bin.availableQty != null ? Number(bin.availableQty).toFixed(0) : '—'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer count */}
              <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  Hiển thị {displayBins.length} / {bins.length} bins
                  {searchTerm && ` · tìm kiếm "${searchTerm}"`}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Detail sidebar ── */}
        {selectedBin && (
          <BinDetailSidebar
            bin={selectedBin}
            onClose={() => setSelectedBin(null)}
          />
        )}
      </div>
    </div>
  );
}
