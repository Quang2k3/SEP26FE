'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/config/axios';
import type { ApiResponse } from '@/interfaces/common';
import type { Zone } from '@/interfaces/zone';
import { useConfirm } from '@/components/ui/ModalProvider';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  locationId: number;
  locationCode: string;
  locationType: 'AISLE' | 'RACK' | 'BIN' | 'STAGING';
  parentLocationId: number | null;
  parentLocationCode: string | null;
  maxWeightKg: number | null;
  active: boolean;
  zoneId: number;
  zoneCode: string;
}

interface PageResult { content: Location[]; totalElements: number; }

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchZone(id: number): Promise<Zone> {
  const { data } = await api.get<ApiResponse<Zone>>(`/zones/${id}`);
  return data.data;
}

async function fetchLocations(params: Record<string, unknown>): Promise<PageResult> {
  const { data } = await api.get<ApiResponse<PageResult>>('/locations', { params });
  return data.data ?? { content: [], totalElements: 0 };
}

async function apiCreateLocation(payload: {
  zoneId: number;
  locationCode: string;
  locationType: string;
  parentLocationId?: number;
  maxWeightKg?: number;
  maxVolumeM3?: number;
}): Promise<void> {
  await api.post('/locations', payload);
}

async function apiDeactivate(id: number) { await api.patch(`/locations/${id}/deactivate`); }
async function apiReactivate(id: number) { await api.patch(`/locations/${id}/reactivate`); }

// ─── Status badge ─────────────────────────────────────────────────────────────

function ActiveBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
      active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-500'
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`} />
      {active ? 'Hoạt động' : 'Vô hiệu'}
    </span>
  );
}

// ─── Create Location Modal ────────────────────────────────────────────────────

function CreateLocationModal({
  open,
  onClose,
  onCreated,
  locationType,
  zoneId,
  parentLocation,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  locationType: 'AISLE' | 'RACK' | 'BIN';
  zoneId: number;
  parentLocation?: Location | null;
}) {
  const [code, setCode] = useState('');
  const [maxWeight, setMaxWeight] = useState('');
  const [maxVolume, setMaxVolume] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) { setCode(''); setMaxWeight(''); setMaxVolume(''); }
  }, [open]);

  if (!open) return null;

  const typeLabel = locationType === 'AISLE' ? 'Dãy (Aisle)' : locationType === 'RACK' ? 'Kệ (Rack)' : 'BIN';
  const typeIcon  = locationType === 'AISLE' ? 'view_column' : locationType === 'RACK' ? 'shelves' : 'inventory_2';
  const typeColor = locationType === 'AISLE' ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : locationType === 'RACK'  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  const btnColor  = locationType === 'AISLE' ? 'bg-purple-600 hover:bg-purple-700'
                  : locationType === 'RACK'  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-emerald-600 hover:bg-emerald-700';

  const codePlaceholder =
    locationType === 'AISLE' ? 'VD: A01, A02...' :
    locationType === 'RACK'  ? 'VD: A01-R01, R01...' :
    'VD: A01-R01-B01, B001...';

  const handleCreate = async () => {
    const trimmed = code.trim();
    if (!trimmed) { toast.error('Nhập mã location'); return; }
    setSaving(true);
    try {
      await apiCreateLocation({
        zoneId,
        locationCode: trimmed,
        locationType,
        parentLocationId: parentLocation?.locationId ?? undefined,
        maxWeightKg: maxWeight ? Number(maxWeight) : undefined,
        maxVolumeM3: maxVolume ? Number(maxVolume) : undefined,
      });
      toast.success(`Đã tạo ${typeLabel}: ${trimmed}`);
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Tạo thất bại');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">

          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border ${typeColor}`}>
              <span className="material-symbols-outlined text-[18px]">{typeIcon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-gray-900">Tạo {typeLabel}</h3>
              {parentLocation && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Thuộc: <span className="font-mono font-semibold text-gray-600">{parentLocation.locationCode}</span>
                </p>
              )}
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 space-y-4">
            {/* Mã location */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã {typeLabel} <span className="text-red-400 normal-case font-normal">*</span>
              </label>
              <input
                autoFocus
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreate()}
                placeholder={codePlaceholder}
                className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono placeholder:font-sans"
              />
            </div>

            {/* Tải trọng & thể tích — chỉ hiện với RACK và BIN */}
            {(locationType === 'RACK' || locationType === 'BIN') && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Tải trọng (kg)
                  </label>
                  <input
                    type="number" min="0" step="0.1"
                    value={maxWeight}
                    onChange={e => setMaxWeight(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                    Thể tích (m³)
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    value={maxVolume}
                    onChange={e => setMaxVolume(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 text-center"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 px-5 py-3.5 border-t border-gray-100">
            <button
              onClick={onClose}
              disabled={saving}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Huỷ
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !code.trim()}
              className={`flex-1 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5 ${btnColor}`}
            >
              {saving
                ? <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                : <span className="material-symbols-outlined text-[16px]">add</span>
              }
              {saving ? 'Đang tạo...' : `Tạo ${typeLabel}`}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Location Row ─────────────────────────────────────────────────────────────

function LocationRow({ loc, onDrillDown, onToggle, isManager, isSelected }: {
  loc: Location;
  onDrillDown?: () => void;
  onToggle: () => void;
  isManager: boolean;
  isSelected?: boolean;
}) {
  const typeColor: Record<string, string> = {
    AISLE:   'bg-purple-50 text-purple-700',
    RACK:    'bg-blue-50 text-blue-700',
    BIN:     'bg-emerald-50 text-emerald-700',
    STAGING: 'bg-amber-50 text-amber-700',
  };
  const typeLabel: Record<string, string> = { AISLE: 'Dãy', RACK: 'Kệ', BIN: 'BIN', STAGING: 'Staging' };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 transition-colors group border-b border-gray-50 last:border-0 cursor-pointer ${
        isSelected
          ? 'bg-indigo-50 border-l-2 border-l-indigo-500'
          : 'hover:bg-gray-50/60'
      } ${!loc.active ? 'opacity-60' : ''}`}
      onClick={onDrillDown}
    >
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${typeColor[loc.locationType]}`}>
        {typeLabel[loc.locationType]}
      </span>
      <span className="font-mono text-sm font-semibold text-gray-900 flex-1 truncate">{loc.locationCode}</span>
      {loc.maxWeightKg != null && loc.maxWeightKg > 0 && (
        <span className="text-[11px] text-gray-400 shrink-0">{loc.maxWeightKg} kg</span>
      )}
      <ActiveBadge active={loc.active} />
      {/* Chevron for drill-down types */}
      {onDrillDown && loc.locationType !== 'BIN' && (
        <span className="material-symbols-outlined text-[16px] text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0">
          chevron_right
        </span>
      )}
      {/* Toggle button — stop propagation so click on row doesn't also trigger toggle */}
      {isManager && (
        <button
          onClick={e => { e.stopPropagation(); onToggle(); }}
          title={loc.active ? 'Vô hiệu hóa' : 'Mở lại'}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0 ${
            loc.active
              ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">{loc.active ? 'block' : 'lock_open'}</span>
        </button>
      )}
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function LocationSection({
  title, icon, emptyText, warehouseId, zoneId, locationType, parentLocationId,
  onDrillDown, onRefresh, isManager, selectedId, createLabel, parentLocation,
}: {
  title: string; icon: string; emptyText: string;
  warehouseId: number; zoneId: number;
  locationType: 'AISLE' | 'RACK' | 'BIN' | 'STAGING';
  parentLocationId?: number;
  onDrillDown?: (loc: Location) => void;
  onRefresh?: () => void;
  isManager: boolean;
  selectedId?: number | null;
  createLabel?: string;
  parentLocation?: Location | null;
}) {
  const confirm = useConfirm();
  const [locs, setLocs] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchLocations({
        warehouseId, zoneId, locationType,
        parentLocationId: parentLocationId ?? undefined,
        size: 100,
      });
      setLocs(res.content);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [warehouseId, zoneId, locationType, parentLocationId]);

  useEffect(() => { load(); }, [load]);

  const filtered = keyword
    ? locs.filter(l => l.locationCode.toLowerCase().includes(keyword.toLowerCase()))
    : locs;

  const handleToggle = (loc: Location) => {
    const isDeact = loc.active;
    confirm({
      title: isDeact ? `Vô hiệu hóa ${loc.locationCode}?` : `Mở lại ${loc.locationCode}?`,
      description: isDeact
        ? 'Chỉ thực hiện được khi location trống và không có vị trí con active.'
        : 'Zone cha phải đang hoạt động.',
      variant: isDeact ? 'danger' : 'info',
      icon: isDeact ? 'block' : 'lock_open',
      confirmText: isDeact ? 'Vô hiệu hóa' : 'Mở lại',
      onConfirm: async () => {
        try {
          if (isDeact) await apiDeactivate(loc.locationId);
          else await apiReactivate(loc.locationId);
          toast.success(isDeact ? `Đã vô hiệu hóa ${loc.locationCode}` : `Đã mở lại ${loc.locationCode}`);
          load();
          onRefresh?.();
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Lỗi');
        }
      }
    });
  };

  // BIN không có drill-down
  const canCreate = isManager && locationType !== 'STAGING';

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-400 text-[18px]">{icon}</span>
            <h3 className="text-sm font-bold text-gray-800">{title}</h3>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{locs.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-[14px]">search</span>
              <input value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="Tìm mã..."
                className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-28" />
            </div>
            <button onClick={load} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <span className="material-symbols-outlined text-[15px]">refresh</span>
            </button>
            {/* Nút tạo mới */}
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                {createLabel ?? 'Tạo mới'}
              </button>
            )}
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="px-4 py-8 flex justify-center">
            <span className="material-symbols-outlined animate-spin text-indigo-300 text-[24px]">progress_activity</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-8 text-center flex-1 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-gray-200 text-[36px] block mb-1">
              {locationType === 'AISLE' ? 'view_column' : locationType === 'RACK' ? 'shelves' : 'inventory_2'}
            </span>
            <p className="text-sm text-gray-400 mb-3">{keyword ? 'Không tìm thấy' : emptyText}</p>
            {canCreate && !keyword && (
              <button
                onClick={() => setShowCreate(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">add_circle</span>
                {createLabel ?? 'Tạo mới'}
              </button>
            )}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {filtered.map(loc => (
              <LocationRow
                key={loc.locationId}
                loc={loc}
                isSelected={selectedId === loc.locationId}
                onDrillDown={onDrillDown ? () => onDrillDown(loc) : undefined}
                onToggle={() => handleToggle(loc)}
                isManager={isManager}
              />
            ))}
            {/* Add more button at bottom */}
            {canCreate && (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-2.5 border-t border-dashed border-gray-200 text-xs text-gray-400 hover:text-indigo-500 hover:bg-indigo-50/40 flex items-center justify-center gap-1 transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">add</span>
                Thêm {createLabel?.toLowerCase() ?? 'mới'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {locationType !== 'STAGING' && (
        <CreateLocationModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => { load(); onRefresh?.(); }}
          locationType={locationType as 'AISLE' | 'RACK' | 'BIN'}
          zoneId={zoneId}
          parentLocation={parentLocation}
        />
      )}
    </>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = Number(params.id);

  const [zone, setZone] = useState<Zone | null>(null);
  const [loadingZone, setLoadingZone] = useState(true);

  const [selectedAisle, setSelectedAisle] = useState<Location | null>(null);
  const [selectedRack,  setSelectedRack]  = useState<Location | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  const isManager = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('auth_user') || '{}')?.roleCodes ?? []).includes('MANAGER')
    : false;

  useEffect(() => {
    setLoadingZone(true);
    fetchZone(zoneId).then(setZone).catch(() => {}).finally(() => setLoadingZone(false));
  }, [zoneId]);

  const warehouseId = zone?.warehouseId ?? 0;

  const crumbs = [
    { label: 'Zone', onClick: () => { setSelectedAisle(null); setSelectedRack(null); } },
    ...(selectedAisle ? [{ label: selectedAisle.locationCode, onClick: () => setSelectedRack(null) }] : []),
    ...(selectedRack  ? [{ label: selectedRack.locationCode,  onClick: () => {} }] : []),
  ];

  if (loadingZone) return (
    <div className="flex justify-center py-20">
      <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
    </div>
  );

  if (!zone) return (
    <div className="flex flex-col items-center py-20 gap-2">
      <span className="material-symbols-outlined text-gray-200 text-[48px]">error</span>
      <p className="text-sm text-gray-400">Không tìm thấy zone</p>
    </div>
  );

  return (
    <div className="w-full font-sans space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/zone')}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-gray-900">{zone.zoneCode}</h1>
              <span className="text-gray-400 font-normal text-sm">— {zone.zoneName}</span>
              <ActiveBadge active={zone.active} />
            </div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 mt-0.5">
              {crumbs.map((cr, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="material-symbols-outlined text-gray-300 text-[13px]">chevron_right</span>}
                  <button onClick={cr.onClick}
                    className={`text-[12px] font-medium transition-colors ${
                      i === crumbs.length - 1
                        ? 'text-indigo-600 cursor-default'
                        : 'text-gray-400 hover:text-indigo-500'
                    }`}>
                    {cr.label}
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3-column drill-down */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ minHeight: 360 }}>

        {/* Col 1: Aisles */}
        <LocationSection
          key={`aisle-${refreshKey}`}
          title="Dãy (Aisle)" icon="view_column"
          emptyText="Zone chưa có dãy nào"
          warehouseId={warehouseId} zoneId={zoneId}
          locationType="AISLE"
          isManager={isManager}
          onRefresh={refresh}
          selectedId={selectedAisle?.locationId}
          createLabel="Tạo Aisle"
          onDrillDown={loc => { setSelectedAisle(loc); setSelectedRack(null); }}
        />

        {/* Col 2: Racks */}
        {selectedAisle ? (
          <LocationSection
            key={`rack-${selectedAisle.locationId}-${refreshKey}`}
            title={`Kệ trong ${selectedAisle.locationCode}`} icon="shelves"
            emptyText="Dãy này chưa có kệ nào"
            warehouseId={warehouseId} zoneId={zoneId}
            locationType="RACK"
            parentLocationId={selectedAisle.locationId}
            isManager={isManager}
            onRefresh={refresh}
            selectedId={selectedRack?.locationId}
            createLabel="Tạo Rack"
            parentLocation={selectedAisle}
            onDrillDown={loc => setSelectedRack(loc)}
          />
        ) : (
          <div className="bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[36px]">shelves</span>
            <p className="text-sm text-gray-400">Chọn một dãy để xem kệ</p>
          </div>
        )}

        {/* Col 3: BINs */}
        {selectedRack ? (
          <LocationSection
            key={`bin-${selectedRack.locationId}-${refreshKey}`}
            title={`BIN trong ${selectedRack.locationCode}`} icon="inventory_2"
            emptyText="Kệ này chưa có BIN nào"
            warehouseId={warehouseId} zoneId={zoneId}
            locationType="BIN"
            parentLocationId={selectedRack.locationId}
            isManager={isManager}
            onRefresh={refresh}
            createLabel="Tạo BIN"
            parentLocation={selectedRack}
          />
        ) : (
          <div className="bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[36px]">inventory_2</span>
            <p className="text-sm text-gray-400">Chọn một kệ để xem BIN</p>
          </div>
        )}
      </div>

      {/* Staging row */}
      {warehouseId > 0 && (
        <LocationSection
          key={`staging-${refreshKey}`}
          title="Staging" icon="move_to_inbox"
          emptyText="Zone chưa có staging nào"
          warehouseId={warehouseId} zoneId={zoneId}
          locationType="STAGING"
          isManager={isManager}
          onRefresh={refresh}
        />
      )}
    </div>
  );
}
