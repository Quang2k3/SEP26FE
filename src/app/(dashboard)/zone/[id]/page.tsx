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

// ─── Location Row ─────────────────────────────────────────────────────────────

function LocationRow({ loc, onDrillDown, onToggle, isManager }: {
  loc: Location;
  onDrillDown?: () => void;
  onToggle: () => void;
  isManager: boolean;
}) {
  const typeColor: Record<string, string> = {
    AISLE:   'bg-purple-50 text-purple-700',
    RACK:    'bg-blue-50 text-blue-700',
    BIN:     'bg-emerald-50 text-emerald-700',
    STAGING: 'bg-amber-50 text-amber-700',
  };
  const typeLabel: Record<string, string> = { AISLE: 'Dãy', RACK: 'Kệ', BIN: 'BIN', STAGING: 'Staging' };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors group border-b border-gray-50 last:border-0 ${!loc.active ? 'opacity-60' : ''}`}>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${typeColor[loc.locationType]}`}>
        {typeLabel[loc.locationType]}
      </span>
      <span className="font-mono text-sm font-semibold text-gray-900 flex-1">{loc.locationCode}</span>
      {loc.maxWeightKg && (
        <span className="text-xs text-gray-400">{loc.maxWeightKg} kg</span>
      )}
      <ActiveBadge active={loc.active} />
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Drill down nếu không phải BIN */}
        {onDrillDown && loc.locationType !== 'BIN' && (
          <button onClick={onDrillDown}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Xem bên trong">
            <span className="material-symbols-outlined text-[15px]">chevron_right</span>
          </button>
        )}
        {isManager && (
          loc.active ? (
            <button onClick={onToggle} title="Vô hiệu hóa"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <span className="material-symbols-outlined text-[15px]">block</span>
            </button>
          ) : (
            <button onClick={onToggle} title="Mở lại"
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors">
              <span className="material-symbols-outlined text-[15px]">lock_open</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─── Section: list locations of a level ──────────────────────────────────────

function LocationSection({
  title, icon, emptyText, warehouseId, zoneId, locationType, parentLocationId,
  onDrillDown, onRefresh, isManager
}: {
  title: string; icon: string; emptyText: string;
  warehouseId: number; zoneId: number;
  locationType: 'AISLE' | 'RACK' | 'BIN' | 'STAGING';
  parentLocationId?: number;
  onDrillDown?: (loc: Location) => void;
  onRefresh?: () => void;
  isManager: boolean;
}) {
  const confirm = useConfirm();
  const [locs, setLocs] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState('');

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

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
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
              className="pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 w-32" />
          </div>
          <button onClick={load} className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
            <span className="material-symbols-outlined text-[15px]">refresh</span>
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="px-4 py-8 flex justify-center">
          <span className="material-symbols-outlined animate-spin text-indigo-300 text-[24px]">progress_activity</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <span className="material-symbols-outlined text-gray-200 text-[36px] block mb-1">
            {locationType === 'AISLE' ? 'view_column' : locationType === 'RACK' ? 'shelves' : 'inventory_2'}
          </span>
          <p className="text-sm text-gray-400">{keyword ? 'Không tìm thấy' : emptyText}</p>
        </div>
      ) : (
        <div>
          {filtered.map(loc => (
            <LocationRow key={loc.locationId} loc={loc}
              onDrillDown={onDrillDown ? () => onDrillDown(loc) : undefined}
              onToggle={() => handleToggle(loc)}
              isManager={isManager}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ZoneDetailPage() {
  const params = useParams();
  const router = useRouter();
  const zoneId = Number(params.id);

  const [zone, setZone] = useState<Zone | null>(null);
  const [loadingZone, setLoadingZone] = useState(true);

  // Drill-down state: null = zone level, aisle = aisle selected, rack = rack selected
  const [selectedAisle, setSelectedAisle] = useState<Location | null>(null);
  const [selectedRack,  setSelectedRack]  = useState<Location | null>(null);

  const [refreshKey, setRefreshKey] = useState(0);
  const refresh = () => setRefreshKey(k => k + 1);

  // Session
  const isManager = typeof window !== 'undefined'
    ? (JSON.parse(localStorage.getItem('wms_session') || '{}')?.user?.roleCodes ?? []).includes('MANAGER')
    : false;

  useEffect(() => {
    setLoadingZone(true);
    fetchZone(zoneId).then(setZone).catch(() => {}).finally(() => setLoadingZone(false));
  }, [zoneId]);

  const warehouseId = zone?.warehouseId ?? 0;

  // Breadcrumb trail
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
            {/* Breadcrumb drill-down */}
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

      {/* Drill-down panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Aisles luôn hiện */}
        <LocationSection
          key={`aisle-${refreshKey}`}
          title="Dãy (Aisle)" icon="view_column"
          emptyText="Zone chưa có dãy nào"
          warehouseId={warehouseId} zoneId={zoneId}
          locationType="AISLE"
          isManager={isManager}
          onRefresh={refresh}
          onDrillDown={loc => {
            setSelectedAisle(loc);
            setSelectedRack(null);
          }}
        />

        {/* Column 2: Racks trong Aisle được chọn */}
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
            onDrillDown={loc => setSelectedRack(loc)}
          />
        ) : (
          <div className="bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[36px]">shelves</span>
            <p className="text-sm text-gray-400">Chọn một dãy để xem kệ</p>
          </div>
        )}

        {/* Column 3: BINs trong Rack được chọn */}
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
          />
        ) : (
          <div className="bg-gray-50/60 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[36px]">inventory_2</span>
            <p className="text-sm text-gray-400">Chọn một kệ để xem BIN</p>
          </div>
        )}
      </div>

      {/* Staging - luôn hiện ở dưới */}
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
