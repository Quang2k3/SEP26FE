'use client';

import { useEffect, useState, useCallback } from 'react';
import api from '@/config/axios';
import { getStoredSession } from '@/services/authService';
import type { ApiResponse } from '@/interfaces/common';
import toast from 'react-hot-toast';

interface Category {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  active: boolean;
}

interface Zone {
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  active: boolean;
}

interface MappingStatus {
  categoryId: number;
  categoryCode: string;
  categoryName: string;
  active: boolean;
  zoneMapped: boolean;
  mappedZoneCode: string | null;
  mappedZoneId: number | null;
}

async function fetchMappings(warehouseId: number): Promise<MappingStatus[]> {
  const [catRes, zoneRes] = await Promise.all([
    api.get<ApiResponse<any>>('/categories'),
    api.get<ApiResponse<any>>('/zones', { params: { warehouseId, activeOnly: false, size: 200 } }),
  ]);
  const cats: Category[] = catRes.data.data?.content ?? catRes.data.data ?? [];
  const zones: Zone[] = zoneRes.data.data?.content ?? zoneRes.data.data ?? [];
  const zoneMap = new Map(zones.map(z => [z.zoneCode, z]));

  return cats.map(cat => {
    const expectedCode = `Z-${cat.categoryCode}`;
    const zone = zoneMap.get(expectedCode);
    return {
      categoryId: cat.categoryId,
      categoryCode: cat.categoryCode,
      categoryName: cat.categoryName,
      active: cat.active,
      zoneMapped: !!zone,
      mappedZoneCode: zone?.zoneCode ?? null,
      mappedZoneId: zone?.zoneId ?? null,
    };
  });
}

async function apiMapToZone(categoryId: number): Promise<void> {
  await api.post(`/categories/${categoryId}/map-to-zone`);
}

async function apiMapAllUnmapped(unmapped: MappingStatus[]): Promise<{ ok: number; fail: number }> {
  let ok = 0, fail = 0;
  await Promise.all(unmapped.map(async m => {
    try { await apiMapToZone(m.categoryId); ok++; }
    catch { fail++; }
  }));
  return { ok, fail };
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CategoryToZonePage() {
  const [mappings, setMappings] = useState<MappingStatus[]>([]);
  const [loading, setLoading]   = useState(true);
  const [mappingId, setMappingId] = useState<number | null>(null);
  const [mappingAll, setMappingAll] = useState(false);

  const warehouseId = getStoredSession()?.user?.warehouseIds?.[0] ?? 0;

  const load = useCallback(async () => {
    if (!warehouseId) return;
    setLoading(true);
    try { setMappings(await fetchMappings(warehouseId)); }
    catch { toast.error('Không tải được dữ liệu'); }
    finally { setLoading(false); }
  }, [warehouseId]);

  useEffect(() => { load(); }, [load]);

  const handleMap = async (m: MappingStatus) => {
    setMappingId(m.categoryId);
    try {
      await apiMapToZone(m.categoryId);
      toast.success(`Đã tạo zone Z-${m.categoryCode}`);
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi tạo zone');
    } finally { setMappingId(null); }
  };

  const handleMapAll = async () => {
    const unmapped = mappings.filter(m => !m.zoneMapped && m.active);
    if (!unmapped.length) { toast('Tất cả category đã có zone rồi', { icon: '✅' }); return; }
    setMappingAll(true);
    try {
      const { ok, fail } = await apiMapAllUnmapped(unmapped);
      if (fail === 0) toast.success(`Đã tạo ${ok} zone thành công`);
      else toast(`Tạo ${ok} thành công, ${fail} thất bại`, { icon: '⚠️' });
      load();
    } finally { setMappingAll(false); }
  };

  const mapped   = mappings.filter(m => m.zoneMapped).length;
  const unmapped = mappings.filter(m => !m.zoneMapped && m.active).length;

  return (
    <div className="w-full font-sans space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Gắn Category → Zone</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Mỗi category cần 1 zone <span className="font-mono font-semibold text-indigo-600">Z-{'{categoryCode}'}</span> để putaway suggestion hoạt động
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unmapped > 0 && (
            <button onClick={handleMapAll} disabled={mappingAll || loading}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95 transition-all"
              style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)' }}>
              {mappingAll
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
              }
              Tạo tất cả zone còn thiếu ({unmapped})
            </button>
          )}
          <button onClick={load} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
            <span className={`material-symbols-outlined text-[15px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {!loading && mappings.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-3 flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500 text-[16px]">check_circle</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Đã map</p>
              <p className="text-lg font-extrabold text-emerald-700">{mapped}</p>
            </div>
          </div>
          <div className="w-px h-8 bg-gray-100" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-[16px]">link_off</span>
            </div>
            <div>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest">Chưa map</p>
              <p className="text-lg font-extrabold text-amber-600">{unmapped}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden ml-4">
            <div className="h-full bg-emerald-500 rounded-full transition-all"
              style={{ width: `${mappings.length ? (mapped / mappings.length) * 100 : 0}%` }} />
          </div>
          <span className="text-sm font-bold text-gray-500">
            {mappings.length ? Math.round((mapped / mappings.length) * 100) : 0}%
          </span>
        </div>
      )}

      {/* Mapping table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          </div>
        ) : mappings.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">category</span>
            <p className="text-sm text-gray-400">Chưa có category nào</p>
          </div>
        ) : (
          <>
            <div className="grid bg-gray-50 border-b border-gray-100"
              style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr auto' }}>
              {['Mã Category', 'Tên', 'Zone tương ứng', 'Trạng thái', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {mappings.map(m => (
                <div key={m.categoryId} className={`grid items-center ${!m.active ? 'opacity-50' : ''}`}
                  style={{ gridTemplateColumns: '1fr 2fr 2fr 1fr auto' }}>
                  <div className="px-4 py-3.5">
                    <span className="text-sm font-bold text-gray-900 font-mono">{m.categoryCode}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    <span className="text-sm text-gray-700">{m.categoryName}</span>
                  </div>
                  <div className="px-4 py-3.5 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-300 text-[14px]">arrow_forward</span>
                    <span className="text-sm font-mono font-semibold text-indigo-600">Z-{m.categoryCode}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    {m.zoneMapped ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">check_circle</span>
                        Đã map
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                        <span className="material-symbols-outlined text-[11px]">link_off</span>
                        Chưa có zone
                      </span>
                    )}
                  </div>
                  <div className="px-4 py-3.5">
                    {!m.zoneMapped && m.active && (
                      <button onClick={() => handleMap(m)} disabled={mappingId === m.categoryId}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-50">
                        <span className={`material-symbols-outlined text-[13px] ${mappingId === m.categoryId ? 'animate-spin' : ''}`}>
                          {mappingId === m.categoryId ? 'progress_activity' : 'add_link'}
                        </span>
                        Tạo zone
                      </button>
                    )}
                    {m.zoneMapped && (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
