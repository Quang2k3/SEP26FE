'use client';

import { useEffect, useState, useMemo, useCallback, Suspense } from 'react';
import api from '@/config/axios';
import { fetchZones } from '@/services/zoneService';
import { getStoredSession } from '@/services/authService';
import type { Zone } from '@/interfaces/zone';
import type { ApiResponse } from '@/interfaces/common';
import { useConfirm } from '@/components/ui/ModalProvider';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// ─── API ──────────────────────────────────────────────────────────────────────

async function apiCreateZone(zoneCode: string, zoneName: string): Promise<Zone> {
  const { data } = await api.post<ApiResponse<Zone>>('/zones', { zoneCode, zoneName });
  return data.data;
}

async function apiUpdateZone(zoneId: number, zoneName: string): Promise<Zone> {
  const { data } = await api.put<ApiResponse<Zone>>(`/zones/${zoneId}`, { zoneName });
  return data.data;
}

async function apiDeactivateZone(zoneId: number): Promise<void> {
  await api.patch(`/zones/${zoneId}/deactivate`);
}

// ─── Zone Modal ───────────────────────────────────────────────────────────────

function ZoneModal({ zone, onClose, onSaved }: {
  zone: Zone | null; // null = create mode
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = zone !== null;
  const [zoneCode, setZoneCode] = useState(zone?.zoneCode ?? '');
  const [zoneName, setZoneName] = useState(zone?.zoneName ?? '');
  const [saving,   setSaving]   = useState(false);

  const handleSave = async () => {
    if (!zoneCode.trim())  { toast.error('Nhập mã zone'); return; }
    if (!zoneName.trim())  { toast.error('Nhập tên zone'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await apiUpdateZone(zone.zoneId, zoneName.trim());
        toast.success(`Đã cập nhật zone ${zone.zoneCode}`);
      } else {
        await apiCreateZone(zoneCode.trim().toUpperCase(), zoneName.trim());
        toast.success(`Đã tạo zone ${zoneCode.toUpperCase()}`);
      }
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi lưu zone');
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
              <h3 className="text-sm font-bold text-gray-900">{isEdit ? `Sửa zone ${zone.zoneCode}` : 'Tạo zone mới'}</h3>
            </div>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Mã Zone {!isEdit && <span className="text-red-400">*</span>}
              </label>
              <input value={zoneCode} onChange={e => setZoneCode(e.target.value)}
                disabled={isEdit} placeholder="VD: Z-HC"
                className={`${inputCls} ${isEdit ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`} />
              {!isEdit && (
                <p className="text-[10px] text-gray-400 mt-1">
                  Convention: <span className="font-mono font-semibold">Z-{'{categoryCode}'}</span> để hệ thống tự gợi ý putaway
                </p>
              )}
            </div>
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">
                Tên Zone <span className="text-red-400">*</span>
              </label>
              <input value={zoneName} onChange={e => setZoneName(e.target.value)}
                placeholder="VD: Khu Household Care"
                className={inputCls} />
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
                : <><span className="material-symbols-outlined text-[15px]">save</span>{isEdit ? 'Lưu thay đổi' : 'Tạo zone'}</>}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function ZoneListContent() {
  const confirm   = useConfirm();
  const session   = getStoredSession();
  const isManager = session?.user?.roleCodes?.includes('MANAGER') ?? false;

  const [zones,       setZones]       = useState<Zone[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterActive, setFilterActive] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');
  const [editZone,    setEditZone]    = useState<Zone | null | undefined>(undefined); // undefined=closed, null=create

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // Load tất cả zones bao gồm inactive
      const warehouseId = session?.user?.warehouseIds?.[0];
      if (!warehouseId) { setZones([]); return; }
      const { data } = await api.get<ApiResponse<any>>('/zones', {
        params: { warehouseId, activeOnly: false, size: 200 }
      });
      const content = data.data?.content ?? data.data ?? [];
      setZones(Array.isArray(content) ? content : []);
    } catch { toast.error('Không tải được zones'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const displayZones = useMemo(() => {
    let list = [...zones];
    if (filterActive === 'ACTIVE')   list = list.filter(z => z.active);
    if (filterActive === 'INACTIVE') list = list.filter(z => !z.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(z => z.zoneCode.toLowerCase().includes(q) || z.zoneName.toLowerCase().includes(q));
    }
    return list;
  }, [zones, filterActive, search]);

  const handleDeactivate = (zone: Zone) => {
    confirm({
      title: `Vô hiệu hóa ${zone.zoneCode}?`,
      description: 'Zone sẽ không xuất hiện trong danh sách gợi ý putaway nữa.',
      variant: 'danger', icon: 'block', confirmText: 'Vô hiệu hóa',
      onConfirm: async () => {
        try {
          await apiDeactivateZone(zone.zoneId);
          toast.success(`Đã vô hiệu hóa ${zone.zoneCode}`);
          load();
        } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Lỗi'); }
      },
    });
  };

  const stats = useMemo(() => ({
    total:    zones.length,
    active:   zones.filter(z => z.active).length,
    inactive: zones.filter(z => !z.active).length,
  }), [zones]);

  return (
    <div className="w-full font-sans space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Quản lý Zone</h1>
          <p className="text-sm text-gray-500 mt-0.5">Các khu vực lưu kho · Convention mã: <span className="font-mono text-indigo-600">Z-{'{categoryCode}'}</span></p>
        </div>
        {isManager && (
          <button onClick={() => setEditZone(null)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
            <span className="material-symbols-outlined text-[16px]">add</span>
            Tạo Zone
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng Zone',    val: stats.total,    color: 'text-gray-800',   bg: 'bg-white border-gray-200' },
          { label: 'Đang hoạt động', val: stats.active, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Vô hiệu',     val: stats.inactive,  color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200' },
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm mã hoặc tên zone..."
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
        ) : displayZones.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">grid_view</span>
            <p className="text-sm text-gray-400">{search ? 'Không tìm thấy zone' : 'Chưa có zone nào'}</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid bg-gray-50 border-b border-gray-100" style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto' }}>
              {['Mã Zone', 'Tên Zone', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>
            <div className="divide-y divide-gray-50">
              {displayZones.map(zone => (
                <div key={zone.zoneId} className="grid items-center hover:bg-gray-50/60 transition-colors"
                  style={{ gridTemplateColumns: '1fr 2fr 1fr 1fr auto' }}>
                  <div className="px-4 py-3.5 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-indigo-500 text-[14px]">warehouse</span>
                    </div>
                    <span className="text-sm font-bold text-gray-900 font-mono">{zone.zoneCode}</span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-sm text-gray-700">{zone.zoneName}</p>
                  </div>
                  <div className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      zone.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${zone.active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                      {zone.active ? 'Hoạt động' : 'Vô hiệu'}
                    </span>
                  </div>
                  <div className="px-4 py-3.5">
                    <span className="text-xs text-gray-400">
                      {zone.createdAt ? new Date(zone.createdAt).toLocaleDateString('vi-VN') : '—'}
                    </span>
                  </div>
                  <div className="px-4 py-3.5 flex items-center gap-1">
                    {isManager && (
                      <>
                        <button onClick={() => setEditZone(zone)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Sửa">
                          <span className="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        {zone.active && (
                          <button onClick={() => handleDeactivate(zone)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Vô hiệu hóa">
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
              <p className="text-xs text-gray-400">{displayZones.length} / {zones.length} zones</p>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {editZone !== undefined && (
        <ZoneModal zone={editZone} onClose={() => setEditZone(undefined)} onSaved={load} />
      )}
    </div>
  );
}

export default function ZonePage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-16"><span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span></div>}>
      <ZoneListContent />
    </Suspense>
  );
}
