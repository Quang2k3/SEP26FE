'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import api from '@/config/axios';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import type { ApiResponse, PageResponse } from '@/interfaces/common';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BinInventoryItem {
  skuId: number;
  skuCode: string;
  skuName: string;
  lotId: number | null;
  lotNumber: string | null;
  expiryDate: string | null;
  quantity: number;
  reservedQty: number;
}

interface BinDetail {
  locationId: number;
  locationCode: string;
  zoneId: number;
  zoneCode: string;
  parentLocationId: number | null;
  parentLocationCode: string | null;      // RACK
  grandParentLocationId: number | null;
  grandParentLocationCode: string | null; // AISLE
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  occupiedQty: number;
  reservedQty: number;
  availableQty: number | null;
  occupancyStatus: 'EMPTY' | 'PARTIAL' | 'FULL';
  isPickingFace: boolean;
  isStaging: boolean;
  active: boolean;
  inventoryItems?: BinInventoryItem[];
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchBinsInZone(zoneId: number): Promise<BinDetail[]> {
  const { data } = await api.get<ApiResponse<PageResponse<BinDetail>>>(
    '/bins/occupancy', { params: { zoneId, size: 500 } }
  );
  return data.data?.content ?? [];
}

async function fetchBinDetail(locationId: number): Promise<BinDetail | null> {
  try {
    const { data } = await api.get<ApiResponse<BinDetail>>(`/bins/${locationId}/occupancy`);
    return data.data ?? null;
  } catch { return null; }
}

// ─── Occupancy helpers ────────────────────────────────────────────────────────

function pct(occupied: number, reserved: number, max: number | null): number {
  if (!max || max === 0) return occupied > 0 ? 60 : 0;
  return Math.min(100, Math.round(((occupied + reserved) / max) * 100));
}

const STATUS_CONFIG = {
  EMPTY:   { label: 'Trống',     bg: 'bg-slate-50',    border: 'border-slate-200',  text: 'text-slate-400',  fill: '#e2e8f0', bar: '#94a3b8' },
  PARTIAL: { label: 'Đang dùng', bg: 'bg-amber-50',    border: 'border-amber-300',  text: 'text-amber-700',  fill: '#fef3c7', bar: '#f59e0b' },
  FULL:    { label: 'Đầy',       bg: 'bg-red-50',      border: 'border-red-400',    text: 'text-red-700',    fill: '#fee2e2', bar: '#ef4444' },
} as const;

// ─── Stats bar ────────────────────────────────────────────────────────────────

function ZoneStats({ bins }: { bins: BinDetail[] }) {
  const total   = bins.length;
  const empty   = bins.filter(b => b.occupancyStatus === 'EMPTY').length;
  const partial = bins.filter(b => b.occupancyStatus === 'PARTIAL').length;
  const full    = bins.filter(b => b.occupancyStatus === 'FULL').length;
  const pctUsed = total ? Math.round(((partial + full) / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {[
        { label: 'Tổng BIN',   val: total,   color: 'text-slate-700',  bg: 'bg-slate-50  border-slate-200' },
        { label: 'Trống',      val: empty,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        { label: 'Đang dùng', val: partial, color: 'text-amber-700',   bg: 'bg-amber-50  border-amber-200' },
        { label: 'Đầy',        val: full,    color: 'text-red-700',     bg: 'bg-red-50    border-red-200' },
      ].map(s => (
        <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
          <p className={`text-2xl font-extrabold mt-0.5 ${s.color}`}>{s.val}</p>
        </div>
      ))}
      {/* Usage bar spanning full width */}
      <div className="col-span-2 sm:col-span-4 bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-4">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Tỷ lệ sử dụng</span>
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pctUsed}%`,
              background: pctUsed >= 80 ? '#ef4444' : pctUsed >= 50 ? '#f59e0b' : '#22c55e',
            }}
          />
        </div>
        <span className={`text-sm font-extrabold tabular-nums ${
          pctUsed >= 80 ? 'text-red-600' : pctUsed >= 50 ? 'text-amber-600' : 'text-emerald-600'
        }`}>{pctUsed}%</span>
      </div>
    </div>
  );
}

// ─── Single BIN cell ──────────────────────────────────────────────────────────

function BinCell({ bin, selected, onClick }: {
  bin: BinDetail;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg   = STATUS_CONFIG[bin.occupancyStatus];
  const usage = pct(bin.occupiedQty, bin.reservedQty, bin.maxWeightKg);

  return (
    <button
      onClick={onClick}
      title={`${bin.locationCode} — ${cfg.label} (${usage}%)`}
      className={`
        group relative flex flex-col justify-between p-2 rounded-xl border-2 transition-all duration-150
        hover:shadow-md hover:scale-105 active:scale-95 text-left
        ${cfg.bg} ${cfg.border}
        ${selected ? 'ring-2 ring-indigo-500 ring-offset-1 scale-105 shadow-lg z-10' : ''}
        ${!bin.active ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      {/* Code */}
      <p className={`text-[10px] font-extrabold leading-tight truncate ${cfg.text}`}>
        {bin.locationCode}
      </p>

      {/* Mini bar */}
      <div className="mt-1.5 h-1 bg-white/60 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${usage}%`, background: cfg.bar }}
        />
      </div>

      {/* Qty */}
      <p className="text-[9px] text-slate-400 mt-0.5 tabular-nums">
        {Number(bin.occupiedQty).toFixed(0)}{bin.maxWeightKg ? `/${bin.maxWeightKg}` : ''}
      </p>

      {/* Staging badge */}
      {bin.isStaging && (
        <span className="absolute -top-1.5 -right-1.5 text-[8px] font-bold bg-indigo-500 text-white px-1 py-0.5 rounded-full leading-none">
          STG
        </span>
      )}

      {/* Inventory dot */}
      {bin.occupancyStatus !== 'EMPTY' && (
        <span
          className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.bar }}
        />
      )}
    </button>
  );
}

// ─── Rack block ───────────────────────────────────────────────────────────────

function RackBlock({ rackCode, bins, selectedBinId, onSelectBin }: {
  rackCode: string;
  bins: BinDetail[];
  selectedBinId: number | null;
  onSelectBin: (bin: BinDetail) => void;
}) {
  const fullCount    = bins.filter(b => b.occupancyStatus === 'FULL').length;
  const partialCount = bins.filter(b => b.occupancyStatus === 'PARTIAL').length;
  const emptyCount   = bins.filter(b => b.occupancyStatus === 'EMPTY').length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Rack header */}
      <div className="px-3 py-2 bg-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-300 text-[14px]">shelves</span>
          <span className="text-xs font-bold text-white tracking-wide">{rackCode}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {fullCount    > 0 && <span className="text-[9px] bg-red-500    text-white px-1.5 py-0.5 rounded-full font-bold">{fullCount}F</span>}
          {partialCount > 0 && <span className="text-[9px] bg-amber-400  text-white px-1.5 py-0.5 rounded-full font-bold">{partialCount}P</span>}
          {emptyCount   > 0 && <span className="text-[9px] bg-slate-400  text-white px-1.5 py-0.5 rounded-full font-bold">{emptyCount}E</span>}
        </div>
      </div>

      {/* Bin grid */}
      <div className="p-2 grid grid-cols-3 gap-1.5">
        {bins.map(bin => (
          <BinCell
            key={bin.locationId}
            bin={bin}
            selected={selectedBinId === bin.locationId}
            onClick={() => onSelectBin(bin)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Aisle section ────────────────────────────────────────────────────────────

function AisleSection({ aisleCode, racks, bins, selectedBinId, onSelectBin }: {
  aisleCode: string;
  racks: string[];
  bins: BinDetail[];
  selectedBinId: number | null;
  onSelectBin: (bin: BinDetail) => void;
}) {
  const aisleBins  = bins.filter(b => b.grandParentLocationCode === aisleCode);
  const fullCount  = aisleBins.filter(b => b.occupancyStatus === 'FULL').length;
  const totalCount = aisleBins.length;
  const pctFull    = totalCount ? Math.round((fullCount / totalCount) * 100) : 0;

  return (
    <div className="space-y-2">
      {/* Aisle label */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg">
          <span className="material-symbols-outlined text-[14px] text-slate-300">view_column</span>
          <span className="text-xs font-extrabold tracking-widest uppercase">{aisleCode}</span>
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <span className="text-[11px] text-slate-400 font-medium">{racks.length} kệ · {totalCount} bin · {pctFull}% đầy</span>
      </div>

      {/* Racks in aisle */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pl-4">
        {racks.map(rackCode => {
          const rackBins = aisleBins.filter(b => b.parentLocationCode === rackCode);
          return (
            <RackBlock
              key={rackCode}
              rackCode={rackCode}
              bins={rackBins}
              selectedBinId={selectedBinId}
              onSelectBin={onSelectBin}
            />
          );
        })}
      </div>
    </div>
  );
}

// ─── Bin detail panel ─────────────────────────────────────────────────────────

function BinDetailPanel({ bin, onClose }: { bin: BinDetail; onClose: () => void }) {
  const [detail, setDetail] = useState<BinDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchBinDetail(bin.locationId).then(d => {
      setDetail(d ?? bin);
      setLoading(false);
    });
  }, [bin.locationId]);

  const cfg   = STATUS_CONFIG[bin.occupancyStatus];
  const usage = pct(bin.occupiedQty, bin.reservedQty, bin.maxWeightKg);
  const items = detail?.inventoryItems ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Panel header */}
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${cfg.bg} ${cfg.border}`}>
            <span className="material-symbols-outlined text-[20px]" style={{ color: cfg.bar }}>inventory</span>
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{bin.locationCode}</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {bin.grandParentLocationCode} › {bin.parentLocationCode}
            </p>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Status badge */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${cfg.bg} ${cfg.border}`}>
          <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className={`text-xs font-extrabold tabular-nums ${cfg.text}`}>{usage}%</span>
        </div>

        {/* Capacity grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Tối đa',    val: bin.maxWeightKg  ? `${bin.maxWeightKg}kg`  : '∞' },
            { label: 'Đã dùng',   val: Number(bin.occupiedQty).toFixed(0) },
            { label: 'Giữ chỗ',   val: Number(bin.reservedQty).toFixed(0) },
          ].map(({ label, val }) => (
            <div key={label} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-slate-400 font-medium">{label}</p>
              <p className="text-sm font-extrabold text-slate-800 mt-0.5">{val}</p>
            </div>
          ))}
        </div>

        {/* Usage bar */}
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${usage}%`, background: cfg.bar }} />
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {bin.isStaging && (
            <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full">
              Staging Area
            </span>
          )}
          {bin.isPickingFace && (
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
              Picking Face
            </span>
          )}
          {!bin.active && (
            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-2 py-1 rounded-full">
              Không hoạt động
            </span>
          )}
        </div>

        {/* Inventory */}
        <div>
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">inventory_2</span>
            Hàng trong BIN
          </p>

          {loading ? (
            <div className="flex justify-center py-6">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[24px]">progress_activity</span>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center py-6 gap-1.5 bg-slate-50 rounded-xl border border-slate-100">
              <span className="material-symbols-outlined text-slate-200 text-[32px]">inbox</span>
              <p className="text-xs text-slate-400">BIN trống — chưa có hàng</p>
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((inv, i) => (
                <div key={i} className="bg-white border border-slate-100 rounded-xl p-3 hover:border-indigo-200 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-indigo-600">{inv.skuCode}</p>
                      <p className="text-xs text-slate-700 font-medium mt-0.5 truncate">{inv.skuName}</p>
                      {inv.lotNumber && (
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[11px]">label</span>
                          Lô: {inv.lotNumber}
                          {inv.expiryDate && ` · HSD: ${new Date(inv.expiryDate).toLocaleDateString('vi-VN')}`}
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-extrabold text-slate-800">{Number(inv.quantity).toFixed(0)}</p>
                      <p className="text-[10px] text-slate-400">tồn kho</p>
                      {inv.reservedQty > 0 && (
                        <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                          -{Number(inv.reservedQty).toFixed(0)} giữ
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Mini usage bar per SKU */}
                  {bin.maxWeightKg && (
                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-indigo-400"
                        style={{ width: `${Math.min(100, (inv.quantity / bin.maxWeightKg) * 100)}%` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function FloorPlanPage() {
  const [zones, setZones]               = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [bins, setBins]                 = useState<BinDetail[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingBins, setLoadingBins]   = useState(false);
  const [selectedBin, setSelectedBin]   = useState<BinDetail | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');

  // Load zones
  useEffect(() => {
    setLoadingZones(true);
    fetchZones({ activeOnly: true })
      .then(z => {
        setZones(z);
        if (z.length > 0) loadZone(z[0]);
      })
      .finally(() => setLoadingZones(false));
  }, []);

  const loadZone = useCallback(async (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedBin(null);
    setSearchTerm('');
    setLoadingBins(true);
    try {
      const data = await fetchBinsInZone(zone.zoneId);
      setBins(data);
    } finally {
      setLoadingBins(false);
    }
  }, []);

  // Hierarchy
  const aisles = useMemo(() =>
    [...new Set(bins.map(b => b.grandParentLocationCode).filter(Boolean))].sort() as string[]
  , [bins]);

  const racksInAisle = useCallback((aisleCode: string) =>
    [...new Set(
      bins.filter(b => b.grandParentLocationCode === aisleCode)
          .map(b => b.parentLocationCode).filter(Boolean)
    )].sort() as string[]
  , [bins]);

  // Search filter
  const filteredBins = useMemo(() => {
    if (!searchTerm.trim()) return bins;
    const q = searchTerm.toLowerCase();
    return bins.filter(b =>
      b.locationCode.toLowerCase().includes(q) ||
      b.parentLocationCode?.toLowerCase().includes(q) ||
      b.grandParentLocationCode?.toLowerCase().includes(q)
    );
  }, [bins, searchTerm]);

  const filteredAisles = useMemo(() => {
    if (!searchTerm.trim()) return aisles;
    return [...new Set(filteredBins.map(b => b.grandParentLocationCode).filter(Boolean))].sort() as string[];
  }, [filteredBins, searchTerm, aisles]);

  return (
    <div className="w-full h-full font-sans flex flex-col" style={{ minHeight: 0 }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 space-y-4 mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Sơ đồ kho</h1>
            <p className="text-sm text-slate-500 mt-0.5">Xem vị trí hàng hóa trong từng BIN theo thời gian thực</p>
          </div>
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[16px]">search</span>
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Tìm BIN, kệ, dãy..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Zone tabs */}
        {loadingZones ? (
          <div className="flex gap-2">
            {[1,2,3].map(i => <div key={i} className="h-9 w-24 bg-slate-100 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {zones.map(zone => (
              <button key={zone.zoneId}
                onClick={() => loadZone(zone)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all
                  ${selectedZone?.zoneId === zone.zoneId
                    ? 'bg-slate-800 border-slate-800 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-400 hover:bg-slate-50'
                  }`}>
                <span className="material-symbols-outlined text-[15px]">warehouse</span>
                {zone.zoneCode}
                <span className="text-[10px] opacity-60">{zone.zoneName}</span>
              </button>
            ))}
          </div>
        )}

        {/* Stats */}
        {selectedZone && !loadingBins && bins.length > 0 && (
          <ZoneStats bins={bins} />
        )}
      </div>

      {/* ── Main area ── */}
      <div className="flex-1 flex gap-4 min-h-0 overflow-hidden">

        {/* Floor plan */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-sm">
          {loadingBins ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
              <p className="text-sm text-slate-400">Đang tải sơ đồ...</p>
            </div>
          ) : !selectedZone ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <span className="material-symbols-outlined text-slate-200 text-[48px]">warehouse</span>
              <p className="text-sm text-slate-400">Chọn zone để xem sơ đồ</p>
            </div>
          ) : bins.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2">
              <span className="material-symbols-outlined text-slate-200 text-[48px]">grid_off</span>
              <p className="text-sm text-slate-400">Zone này chưa có BIN nào</p>
            </div>
          ) : (
            <div className="p-5 space-y-8">
              {/* Zone title */}
              <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
                <span className="material-symbols-outlined text-slate-400 text-[18px]">warehouse</span>
                <h2 className="text-sm font-extrabold text-slate-800">
                  {selectedZone.zoneCode}
                  <span className="font-normal text-slate-400 ml-2">— {selectedZone.zoneName}</span>
                </h2>
                {searchTerm && (
                  <span className="text-[11px] bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded-full font-medium">
                    {filteredBins.length} kết quả cho "{searchTerm}"
                  </span>
                )}

                {/* Legend */}
                <div className="ml-auto flex items-center gap-3 flex-wrap">
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <span key={key} className="flex items-center gap-1.5 text-[10px] text-slate-500">
                      <span className={`w-3 h-3 rounded border ${cfg.bg} ${cfg.border}`} />
                      {cfg.label}
                    </span>
                  ))}
                </div>
              </div>

              {/* Aisles */}
              {filteredAisles.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Không tìm thấy kết quả</p>
              ) : (
                filteredAisles.map(aisleCode => (
                  <AisleSection
                    key={aisleCode}
                    aisleCode={aisleCode}
                    racks={racksInAisle(aisleCode)}
                    bins={filteredBins}
                    selectedBinId={selectedBin?.locationId ?? null}
                    onSelectBin={bin => setSelectedBin(prev =>
                      prev?.locationId === bin.locationId ? null : bin
                    )}
                  />
                ))
              )}

              {/* Bins không có aisle/rack (staging, misc) */}
              {(() => {
                const orphans = filteredBins.filter(b => !b.grandParentLocationCode);
                if (orphans.length === 0) return null;
                return (
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-slate-500 text-white px-3 py-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-[14px] text-slate-200">apps</span>
                        <span className="text-xs font-extrabold tracking-widest uppercase">Khác</span>
                      </div>
                      <div className="flex-1 h-px bg-slate-200" />
                    </div>
                    <div className="pl-4 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {orphans.map(bin => (
                        <BinCell
                          key={bin.locationId}
                          bin={bin}
                          selected={selectedBin?.locationId === bin.locationId}
                          onClick={() => setSelectedBin(prev =>
                            prev?.locationId === bin.locationId ? null : bin
                          )}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* ── Detail panel ── */}
        {selectedBin && (
          <div
            className="w-72 flex-shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
            style={{ animation: 'slideInRight 0.2s ease-out' }}
          >
            <BinDetailPanel
              bin={selectedBin}
              onClose={() => setSelectedBin(null)}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
