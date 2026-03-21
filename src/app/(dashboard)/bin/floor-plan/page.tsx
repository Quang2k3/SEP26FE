'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  /** Tầng BIN: 1=dưới (512kg) · 2=giữa (448kg) · 3=trên (400kg) */
  binFloor: number | null;
  /** Cột BIN: 1=trái · 2=giữa · 3=phải */
  binColumn: number | null;
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

// ─── Rack block — sơ đồ thật 3 tầng × 3 cột ─────────────────────────────────
// Hiển thị đúng như nhìn vào rack thật:
//   - Tầng 3 (trên)  → hàng trên cùng
//   - Tầng 2 (giữa) → hàng giữa
//   - Tầng 1 (dưới)  → hàng dưới cùng
// Ô chưa tạo BIN → hiển thị màu xám nhạt có dấu "+"

const FLOOR_LABEL: Record<number, { short: string; weight: number; cls: string }> = {
  3: { short: 'T3', weight: 400, cls: 'text-purple-500' },
  2: { short: 'T2', weight: 448, cls: 'text-indigo-500' },
  1: { short: 'T1', weight: 512, cls: 'text-blue-600'   },
};

function RackBlock({ rackCode, bins, selectedBinId, onSelectBin, rackLocationId, zoneId }: {
  rackCode: string;
  bins: BinDetail[];
  selectedBinId: number | null;
  onSelectBin: (bin: BinDetail) => void;
  rackLocationId?: number | null;
  zoneId?: number | null;
}) {
  const router = useRouter();
  // Map (floor × col) → BinDetail để tra nhanh
  const binMap: Record<string, BinDetail> = {};
  for (const b of bins) {
    if (b.binFloor && b.binColumn) {
      // Có floor+column → map trực tiếp
      binMap[`${b.binFloor}-${b.binColumn}`] = b;
    }
  }
  // Fallback: nếu bins chưa có binFloor/binColumn (data cũ trước migration V5/V6)
  // → phân bổ tự động theo thứ tự: B01-B03=T1, B04-B06=T2, B07-B09=T3
  if (bins.length > 0 && Object.keys(binMap).length === 0) {
    const FLOOR_COL: [number, number][] = [
      [1,1],[1,2],[1,3],[2,1],[2,2],[2,3],[3,1],[3,2],[3,3]
    ];
    bins.slice(0, 9).forEach((b, i) => {
      const [f, c] = FLOOR_COL[i];
      binMap[`${f}-${c}`] = b;
    });
  }

  const fullCount    = bins.filter(b => b.occupancyStatus === 'FULL').length;
  const partialCount = bins.filter(b => b.occupancyStatus === 'PARTIAL').length;
  const createdCount = bins.length;

  // Tính % đầy toàn rack (dựa trên hàng có tồn kho)
  const usedBins = bins.filter(b => b.occupancyStatus !== 'EMPTY').length;
  const rackPct  = createdCount > 0 ? Math.round((usedBins / 9) * 100) : 0;

  return (
    <div className="bg-white border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">

      {/* ── Rack header ── */}
      <div className="px-3 py-2 bg-slate-700 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="material-symbols-outlined text-slate-300 text-[13px]">shelves</span>
          <span className="text-[11px] font-extrabold text-white tracking-wide truncate">{rackCode}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className="text-[9px] text-slate-400">{createdCount}/9</span>
          {fullCount    > 0 && <span className="text-[9px] bg-red-500   text-white px-1.5 py-0.5 rounded-full font-bold leading-none">{fullCount}F</span>}
          {partialCount > 0 && <span className="text-[9px] bg-amber-400 text-white px-1.5 py-0.5 rounded-full font-bold leading-none">{partialCount}P</span>}
        </div>
      </div>

      {/* ── Sơ đồ 3×3 — tầng từ trên xuống ── */}
      <div className="p-2 space-y-1">

        {/* Column header */}
        <div className="grid grid-cols-3 gap-1 mb-0.5">
          {['C1 Trái', 'C2 Giữa', 'C3 Phải'].map(c => (
            <div key={c} className="text-center text-[8px] font-bold text-slate-300 uppercase tracking-wide">{c}</div>
          ))}
        </div>

        {/* 3 hàng tầng — T3 trên cùng, T1 dưới cùng */}
        {([3, 2, 1] as const).map(floor => {
          const floorCfg = FLOOR_LABEL[floor];
          return (
            <div key={floor} className="flex items-stretch gap-1">
              {/* Floor label */}
              <div className="flex flex-col items-center justify-center w-6 flex-shrink-0">
                <span className={`text-[9px] font-extrabold ${floorCfg.cls}`}>{floorCfg.short}</span>
                <span className="text-[7px] text-slate-300 leading-tight">{floorCfg.weight}k</span>
              </div>

              {/* 3 cột */}
              <div className="grid grid-cols-3 gap-1 flex-1">
                {([1, 2, 3] as const).map(col => {
                  const key = `${floor}-${col}`;
                  const bin = binMap[key];

                  if (!bin) {
                    // Ô chưa tạo BIN
                    return (
                      <button key={col}
                        onClick={() => {
                          if (zoneId) {
                            router.push(`/zone/${zoneId}?createBin=1&rack=${rackLocationId ?? ''}&floor=${floor}&col=${col}`);
                          }
                        }}
                        className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/40 flex flex-col items-center justify-center gap-1 text-center transition-all hover:border-indigo-300 hover:bg-indigo-50/40 group cursor-pointer"
                        style={{ minHeight: 72 }}
                        title={`Tạo BIN T${floor}·C${col} cho ${rackCode}`}>
                        <span className="material-symbols-outlined text-slate-300 text-[18px] group-hover:text-indigo-400 transition-colors">add_box</span>
                        <span className="text-[8px] text-slate-300 font-medium group-hover:text-indigo-400 transition-colors">T{floor}·C{col}</span>
                        <span className="text-[7px] text-slate-200 group-hover:text-indigo-300">+ Tạo BIN</span>
                      </button>
                    );
                  }

                  const cfg   = STATUS_CONFIG[bin.occupancyStatus];
                  const usage = pct(bin.occupiedQty, bin.reservedQty, bin.maxWeightKg);
                  const selected = selectedBinId === bin.locationId;

                  // Lấy tên BIN ngắn gọn để hiển thị trong ô
                  const binShortCode = bin.locationCode.split('-').slice(-2).join('-'); // vd: R01-B01
                  const hasInventory = bin.occupancyStatus !== 'EMPTY';
                  // Lấy tối đa 2 SKU đầu để preview trong ô
                  const previewSkus = bin.inventoryItems?.slice(0, 2) ?? [];

                  return (
                    <button key={col}
                      onClick={() => onSelectBin(bin)}
                      className={`
                        rounded-xl border-2 flex flex-col p-1.5 gap-0.5
                        transition-all duration-150 hover:shadow-md active:scale-95 cursor-pointer relative
                        text-left overflow-hidden
                        ${cfg.bg} ${cfg.border}
                        ${selected ? 'ring-2 ring-offset-1 ring-indigo-500 shadow-lg z-10' : 'hover:border-opacity-70'}
                        ${!bin.active ? 'opacity-40' : ''}
                      `}
                      style={{ minHeight: 72 }}
                    >
                      {/* Usage fill — phần dưới ô, như mực nước */}
                      <div
                        className="absolute bottom-0 left-0 right-0 rounded-b-lg transition-all duration-500"
                        style={{ height: `${usage}%`, background: cfg.bar, opacity: 0.18 }}
                      />

                      {/* ── Dòng 1: tên BIN + % ── */}
                      <div className="flex items-start justify-between gap-1 relative z-10">
                        <span className={`text-[9px] font-extrabold leading-tight truncate ${cfg.text}`}>
                          {bin.locationCode}
                        </span>
                        {usage > 0 && (
                          <span className={`text-[8px] font-bold flex-shrink-0 tabular-nums ${cfg.text} opacity-80`}>
                            {usage}%
                          </span>
                        )}
                      </div>

                      {/* ── Dòng 2+: SKU bên trong ── */}
                      <div className="relative z-10 flex-1 space-y-0.5">
                        {hasInventory && previewSkus.length > 0 ? (
                          <>
                            {previewSkus.map((inv, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full flex-shrink-0 bg-current opacity-60"
                                  style={{ color: cfg.bar }} />
                                <span className="text-[8px] font-semibold text-slate-600 truncate leading-tight">
                                  {inv.skuCode}
                                </span>
                                <span className="text-[7px] text-slate-400 tabular-nums flex-shrink-0 ml-auto">
                                  ×{Number(inv.quantity).toFixed(0)}
                                </span>
                              </div>
                            ))}
                            {(bin.inventoryItems?.length ?? 0) > 2 && (
                              <span className="text-[7px] text-slate-400 leading-tight">
                                +{(bin.inventoryItems?.length ?? 0) - 2} SKU nữa
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-[8px] text-slate-300 leading-tight">Trống</span>
                        )}
                      </div>

                      {/* ── Dòng cuối: kg đã dùng / max ── */}
                      <div className="flex items-center gap-1 relative z-10 mt-0.5">
                        <div className="flex-1 h-0.5 bg-white/40 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${usage}%`, background: cfg.bar }} />
                        </div>
                        <span className="text-[7px] text-slate-400 tabular-nums flex-shrink-0">
                          {Number(bin.occupiedQty).toFixed(0)}/{bin.maxWeightKg ?? '?'}
                        </span>
                      </div>

                      {/* Badges góc */}
                      {bin.isPickingFace && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400 z-20" title="Picking Face" />
                      )}
                      {selected && (
                        <span className="absolute top-1 left-1 z-20">
                          <span className="material-symbols-outlined text-indigo-600 text-[11px]">check_circle</span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* ── Usage bar tổng rack ── */}
        <div className="mt-1 pt-1 border-t border-slate-100 flex items-center gap-2">
          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${rackPct}%`, background: rackPct >= 80 ? '#ef4444' : rackPct >= 50 ? '#f59e0b' : '#10b981' }} />
          </div>
          <span className="text-[9px] text-slate-400 tabular-nums flex-shrink-0">{rackPct}%</span>
        </div>
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
  const [collapsed, setCollapsed] = useState(false);
  const aisleBins    = bins.filter(b => b.grandParentLocationCode === aisleCode);
  const fullCount    = aisleBins.filter(b => b.occupancyStatus === 'FULL').length;
  const partialCount = aisleBins.filter(b => b.occupancyStatus === 'PARTIAL').length;
  const emptyCount   = aisleBins.filter(b => b.occupancyStatus === 'EMPTY').length;
  const totalCount   = aisleBins.length;
  const pctFull      = totalCount ? Math.round((fullCount / totalCount) * 100) : 0;
  // Nhiều rack → dùng scroll ngang thay vì grid để tránh vỡ layout
  const useScroll    = racks.length > 5;

  return (
    <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
      {/* Aisle header — clickable to collapse */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-100/70 transition-colors text-left">
        <div className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-lg flex-shrink-0">
          <span className="material-symbols-outlined text-[14px] text-slate-300">view_column</span>
          <span className="text-xs font-extrabold tracking-widest uppercase">{aisleCode}</span>
        </div>
        {/* Mini status pills */}
        <div className="flex items-center gap-1.5">
          {fullCount    > 0 && <span className="text-[10px] bg-red-100    text-red-700    px-2 py-0.5 rounded-full font-semibold">{fullCount} đầy</span>}
          {partialCount > 0 && <span className="text-[10px] bg-amber-100  text-amber-700  px-2 py-0.5 rounded-full font-semibold">{partialCount} đang dùng</span>}
          {emptyCount   > 0 && <span className="text-[10px] bg-slate-100  text-slate-600  px-2 py-0.5 rounded-full font-semibold">{emptyCount} trống</span>}
        </div>
        <span className="text-[11px] text-slate-400 font-medium ml-auto flex-shrink-0">
          {racks.length} kệ · {totalCount} bin · {pctFull}% đầy
        </span>
        <span className={`material-symbols-outlined text-slate-400 text-[18px] flex-shrink-0 transition-transform ${collapsed ? '' : 'rotate-180'}`}>
          expand_less
        </span>
      </button>

      {/* Racks — hidden when collapsed */}
      {!collapsed && (
        <div className="px-4 pb-4 pt-2">
          {useScroll ? (
            // Nhiều rack (>5): scroll ngang, mỗi rack có min-width cố định
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {racks.map(rackCode => {
                  const rackBins = aisleBins.filter(b => b.parentLocationCode === rackCode);
                  const rackLocId = rackBins[0]?.parentLocationId ?? null;
                  return (
                    <div key={rackCode} style={{ width: 240, flexShrink: 0 }}>
                      <RackBlock
                        rackCode={rackCode}
                        bins={rackBins}
                        selectedBinId={selectedBinId}
                        onSelectBin={onSelectBin}
                        rackLocationId={rackLocId}
                        zoneId={rackBins[0]?.zoneId ?? null}
                      />
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">swipe</span>
                Kéo ngang để xem thêm kệ
              </p>
            </div>
          ) : (
            // Ít rack (≤5): grid responsive bình thường
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {racks.map(rackCode => {
                const rackBins = aisleBins.filter(b => b.parentLocationCode === rackCode);
                const rLocId = rackBins[0]?.parentLocationId ?? null;
                return (
                  <RackBlock
                    key={rackCode}
                    rackCode={rackCode}
                    bins={rackBins}
                    selectedBinId={selectedBinId}
                    onSelectBin={onSelectBin}
                    rackLocationId={rLocId}
                    zoneId={rackBins[0]?.zoneId ?? null}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
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
      <div className={`px-4 py-3 border-b border-slate-100 flex items-center justify-between ${cfg.bg}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl border-2 flex items-center justify-center flex-shrink-0 bg-white ${cfg.border}`}>
            <span className="material-symbols-outlined text-[18px]" style={{ color: cfg.bar }}>inventory_2</span>
          </div>
          <div className="min-w-0">
            <h3 className={`text-sm font-extrabold truncate ${cfg.text}`}>{bin.locationCode}</h3>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-[10px] text-slate-400">{bin.grandParentLocationCode}</span>
              <span className="text-slate-300 text-[10px]">›</span>
              <span className="text-[10px] text-slate-400">{bin.parentLocationCode}</span>
              {bin.binFloor && bin.binColumn && (
                <>
                  <span className="text-slate-300 text-[10px]">›</span>
                  <span className={`text-[10px] font-bold ${cfg.text}`}>
                    T{bin.binFloor}·C{bin.binColumn}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.border} ${cfg.text}`}>
            {cfg.label}
          </span>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/5 text-slate-400 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Status badge */}
        <div className={`flex items-center justify-between rounded-xl px-3 py-2.5 border ${cfg.bg} ${cfg.border}`}>
          <span className={`text-xs font-bold ${cfg.text}`}>{cfg.label}</span>
          <span className={`text-xs font-extrabold tabular-nums ${cfg.text}`}>{usage}%</span>
        </div>

        {/* Vị trí BIN */}
        {(bin.binFloor || bin.binColumn) && (
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Tầng', val: bin.binFloor === 1 ? 'T1 — Dưới' : bin.binFloor === 2 ? 'T2 — Giữa' : 'T3 — Trên' },
              { label: 'Cột',  val: bin.binColumn === 1 ? 'C1 — Trái' : bin.binColumn === 2 ? 'C2 — Giữa' : 'C3 — Phải' },
            ].map(({ label, val }) => (
              <div key={label} className="bg-indigo-50 border border-indigo-100 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-indigo-400 font-medium">{label}</p>
                <p className="text-xs font-extrabold text-indigo-700 mt-0.5">{val}</p>
              </div>
            ))}
          </div>
        )}

        {/* Capacity grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Tải trọng', val: bin.maxWeightKg ? `${bin.maxWeightKg}kg` : '∞' },
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
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[28px]">progress_activity</span>
              <p className="text-xs text-slate-400">Đang tải hàng trong BIN...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center py-8 gap-2 bg-slate-50 rounded-xl border border-slate-100">
              <span className="material-symbols-outlined text-slate-200 text-[36px]">inbox</span>
              <p className="text-sm font-medium text-slate-400">BIN trống</p>
              <p className="text-[11px] text-slate-300">Chưa có hàng hóa</p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Tổng số SKU */}
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                {items.length} SKU · {items.reduce((s, i) => s + Number(i.quantity), 0).toFixed(0)} thùng tổng
              </p>
              {items.map((inv, i) => {
                const pctInBin = bin.maxWeightKg
                  ? Math.min(100, Math.round((Number(inv.quantity) / bin.maxWeightKg) * 100))
                  : 0;
                const available = Number(inv.quantity) - Number(inv.reservedQty);
                return (
                  <div key={i} className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-indigo-300 hover:shadow-sm transition-all">
                    {/* SKU header */}
                    <div className="px-3 py-2.5 flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-extrabold text-indigo-600">{inv.skuCode}</span>
                          {inv.reservedQty > 0 && (
                            <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                              -{Number(inv.reservedQty).toFixed(0)} giữ
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 font-medium mt-0.5 line-clamp-2">{inv.skuName}</p>
                        {inv.lotNumber && (
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">
                              Lô: {inv.lotNumber}
                            </span>
                            {inv.expiryDate && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                new Date(inv.expiryDate) < new Date(Date.now() + 30*86400000)
                                  ? 'bg-red-100 text-red-600'
                                  : 'bg-green-100 text-green-600'
                              }`}>
                                HSD: {new Date(inv.expiryDate).toLocaleDateString('vi-VN')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      {/* Số lượng */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xl font-extrabold text-slate-900 tabular-nums leading-none">
                          {Number(inv.quantity).toFixed(0)}
                        </p>
                        <p className="text-[9px] text-slate-400 mt-0.5">thùng</p>
                        {available < Number(inv.quantity) && (
                          <p className="text-[9px] text-emerald-600 font-semibold mt-0.5">
                            {available.toFixed(0)} khả dụng
                          </p>
                        )}
                      </div>
                    </div>
                    {/* Bar % chiếm bin */}
                    {bin.maxWeightKg && (
                      <div className="px-3 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-indigo-400 transition-all"
                              style={{ width: `${pctInBin}%` }} />
                          </div>
                          <span className="text-[9px] text-slate-400 tabular-nums">{pctInBin}% BIN</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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
            <div className="p-5 space-y-3">
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
                  <span className="text-[10px] text-slate-400 border-l border-slate-200 pl-3 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[11px]">info</span>
                    Click dãy để thu gọn
                  </span>
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
            className="w-80 flex-shrink-0 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
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