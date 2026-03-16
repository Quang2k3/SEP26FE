'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import api from '@/config/axios';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import type { ApiResponse, PageResponse } from '@/interfaces/common';
import type { BinOccupancyResponse } from '@/services/putawayService';
import { useConfirm } from '@/components/ui/ModalProvider';
import toast from 'react-hot-toast';
import Pagination from '@/components/ui/Pagination';
import { getStoredSession } from '@/services/authService';

// ─── API helpers ──────────────────────────────────────────────────────────────

async function apiFetchBins(zoneId: number): Promise<BinOccupancyResponse[]> {
  const { data } = await api.get<ApiResponse<PageResponse<BinOccupancyResponse>>>(
    '/bins/occupancy', { params: { zoneId, size: 500 } }
  );
  return data.data?.content ?? [];
}

async function apiUpdateCapacity(locationId: number, maxWeightKg: number, maxVolumeM3: number) {
  const { data } = await api.patch<ApiResponse<any>>(
    `/bins/${locationId}/capacity`,
    { maxWeightKg, maxVolumeM3 }
  );
  return data;
}

// ─── Edit modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  bin: BinOccupancyResponse;
  onClose: () => void;
  onSaved: (locationId: number, weight: number, volume: number) => void;
}

function EditCapacityModal({ bin, onClose, onSaved }: EditModalProps) {
  const [weight, setWeight] = useState(String(bin.maxWeightKg ?? ''));
  const [volume, setVolume] = useState(String(bin.maxVolumeM3 ?? ''));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const w = parseFloat(weight);
    const v = parseFloat(volume);
    if (!w || w <= 0) { toast.error('Tải trọng phải > 0'); return; }
    if (!v || v <= 0) { toast.error('Thể tích phải > 0'); return; }
    setSaving(true);
    try {
      await apiUpdateCapacity(bin.locationId, w, v);
      toast.success(`Đã cập nhật dung lượng ${bin.locationCode}`);
      onSaved(bin.locationId, w, v);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi cập nhật');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Cấu hình dung lượng</h3>
            <p className="text-xs text-gray-400 mt-0.5">{bin.locationCode}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Tải trọng tối đa (kg) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">scale</span>
              <input type="number" min={1} step="0.1" value={weight}
                onChange={e => setWeight(e.target.value)}
                placeholder="VD: 500"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Thể tích tối đa (m³) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">view_in_ar</span>
              <input type="number" min={0.01} step="0.01" value={volume}
                onChange={e => setVolume(e.target.value)}
                placeholder="VD: 2.5"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
          </div>

          {/* Preview */}
          {weight && volume && parseFloat(weight) > 0 && parseFloat(volume) > 0 && (
            <div className="bg-indigo-50 rounded-xl p-3 border border-indigo-100">
              <p className="text-[11px] font-bold text-indigo-600 mb-1">Xem trước</p>
              <div className="flex justify-between text-xs text-indigo-800">
                <span>Max weight: <strong>{parseFloat(weight)} kg</strong></span>
                <span>Max volume: <strong>{parseFloat(volume)} m³</strong></span>
              </div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2.5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            Huỷ
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-1.5 disabled:opacity-60 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
            {saving
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang lưu...</>
              : <><span className="material-symbols-outlined text-[14px]">save</span>Lưu</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk edit modal ──────────────────────────────────────────────────────────

function BulkEditModal({ count, onClose, onSave }: {
  count: number;
  onClose: () => void;
  onSave: (weight: number, volume: number) => void;
}) {
  const [weight, setWeight] = useState('');
  const [volume, setVolume] = useState('');

  const handleSave = () => {
    const w = parseFloat(weight);
    const v = parseFloat(volume);
    if (!w || w <= 0) { toast.error('Tải trọng phải > 0'); return; }
    if (!v || v <= 0) { toast.error('Thể tích phải > 0'); return; }
    onSave(w, v);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-600 text-[16px]">edit_note</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Cập nhật hàng loạt</h3>
            <p className="text-xs text-gray-400">{count} bins được chọn</p>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700 font-medium flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            Sẽ ghi đè dung lượng của {count} bins đã chọn
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Tải trọng max (kg)</label>
            <input type="number" min={1} step="0.1" value={weight} onChange={e => setWeight(e.target.value)}
              placeholder="VD: 500"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Thể tích max (m³)</label>
            <input type="number" min={0.01} step="0.01" value={volume} onChange={e => setVolume(e.target.value)}
              placeholder="VD: 2.5"
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2.5">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50">Huỷ</button>
          <button onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white rounded-xl active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
            Áp dụng {count} bins
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ConfigureBinCapacityPage() {
  const confirm = useConfirm();
  const isManager = getStoredSession()?.user?.roleCodes?.includes('MANAGER') ?? false;
  const [zones, setZones]               = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [bins, setBins]                 = useState<BinOccupancyResponse[]>([]);
  const [loading, setLoading]           = useState(false);
  const [loadingZones, setLoadingZones] = useState(true);
  const [editBin, setEditBin]           = useState<BinOccupancyResponse | null>(null);
  const [selectedIds, setSelectedIds]   = useState<Set<number>>(new Set());
  const [showBulkEdit, setShowBulkEdit] = useState(false);
  const [searchTerm, setSearchTerm]     = useState('');
  const [filterCap, setFilterCap]       = useState<'ALL' | 'SET' | 'UNSET'>('ALL');
  const [page, setPage]                 = useState(0);
  const PAGE_SIZE = 8;

  useEffect(() => {
    fetchZones({ activeOnly: true })
      .then(z => { setZones(z); if (z.length > 0) loadZone(z[0]); })
      .finally(() => setLoadingZones(false));
  }, []);

  const loadZone = useCallback(async (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedIds(new Set());
    setLoading(true);
    try {
      const data = await apiFetchBins(zone.zoneId);
      setBins(data);
    } catch { toast.error('Không tải được bins'); }
    finally { setLoading(false); }
  }, []);

  const displayBins = useMemo(() => {
    let list = [...bins];
    if (filterCap === 'SET')   list = list.filter(b => b.maxWeightKg != null);
    if (filterCap === 'UNSET') list = list.filter(b => b.maxWeightKg == null);
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(b => b.locationCode.toLowerCase().includes(q));
    }
    return list;
  }, [bins, filterCap, searchTerm]);

  const allSelected = displayBins.length > 0 && displayBins.every(b => selectedIds.has(b.locationId));

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(displayBins.map(b => b.locationId)));
  };

  const toggleOne = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSaved = (locationId: number, weight: number, volume: number) => {
    setBins(prev => prev.map(b =>
      b.locationId === locationId
        ? { ...b, maxWeightKg: weight, maxVolumeM3: volume }
        : b
    ));
  };

  const handleBulkSave = async (weight: number, volume: number) => {
    const ids = [...selectedIds];
    let success = 0;
    for (const id of ids) {
      try {
        await apiUpdateCapacity(id, weight, volume);
        success++;
      } catch { /* continue */ }
    }
    setBins(prev => prev.map(b =>
      selectedIds.has(b.locationId)
        ? { ...b, maxWeightKg: weight, maxVolumeM3: volume }
        : b
    ));
    setSelectedIds(new Set());
    toast.success(`Đã cập nhật ${success}/${ids.length} bins`);
  };

  const stats = useMemo(() => ({
    total: bins.length,
    configured: bins.filter(b => b.maxWeightKg != null).length,
    unconfigured: bins.filter(b => b.maxWeightKg == null).length,
  }), [bins]);

  const totalPagesCfg  = Math.ceil(displayBins.length / PAGE_SIZE);
  const pagedBinsCfg   = displayBins.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="w-full font-sans space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Cấu hình dung lượng BIN</h1>
          <p className="text-sm text-gray-500 mt-0.5">Thiết lập tải trọng và thể tích tối đa cho từng ô bin</p>
        </div>
      </div>

      {/* Read-only banner for non-manager */}
      {!isManager && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
          <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
          <p className="text-sm text-amber-700 font-medium">
            Bạn đang xem ở chế độ <strong>chỉ đọc</strong>. Chỉ Manager mới có thể chỉnh sửa cấu hình dung lượng.
          </p>
        </div>
      )}

      {/* Zone selector */}
      {loadingZones ? (
        <div className="flex gap-2">{[1,2,3].map(i => <div key={i} className="h-9 w-24 bg-gray-100 rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {zones.map(z => (
            <button key={z.zoneId} onClick={() => loadZone(z)}
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

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Tổng BIN',      val: stats.total,        color: 'text-gray-800',  bg: 'bg-white border-gray-200' },
          { label: 'Đã cấu hình',   val: stats.configured,   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
          { label: 'Chưa cấu hình', val: stats.unconfigured, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border px-4 py-3 ${s.bg}`}>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-extrabold mt-0.5 ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">search</span>
          <input type="text" value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setPage(0); }}
            placeholder="Tìm mã BIN..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'ALL',   label: 'Tất cả' },
            { key: 'SET',   label: 'Đã cấu hình' },
            { key: 'UNSET', label: 'Chưa cấu hình' },
          ] as const).map(f => (
            <button key={f.key} onClick={() => setFilterCap(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                ${filterCap === f.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {isManager && selectedIds.size > 0 && (
          <button onClick={() => setShowBulkEdit(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#d97706,#f59e0b)' }}>
            <span className="material-symbols-outlined text-[15px]">edit_note</span>
            Cập nhật {selectedIds.size} bins
          </button>
        )}

        {isManager && selectedIds.size > 0 && (
          <button onClick={() => setSelectedIds(new Set())}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Bỏ chọn tất cả
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
          </div>
        ) : displayBins.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <span className="material-symbols-outlined text-gray-200 text-[48px]">inventory_2</span>
            <p className="text-sm text-gray-400">Không có bins</p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_1.5fr_auto] bg-gray-50 border-b border-gray-100">
              <div className="px-4 py-3 flex items-center">
                {isManager && (
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer" />
                )}
              </div>
              {['Mã BIN', 'Zone', 'Kệ / Dãy', 'Max KG', 'Max m³', ''].map(h => (
                <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div className="divide-y divide-gray-50">
              {pagedBinsCfg.map(bin => {
                const isSelected = selectedIds.has(bin.locationId);
                const hasConfig  = bin.maxWeightKg != null;

                return (
                  <div key={bin.locationId}
                    className={`grid grid-cols-[auto_2fr_1fr_1fr_1.5fr_1.5fr_auto] transition-colors
                      ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50/50'}`}>

                    <div className="px-4 py-3 flex items-center">
                      {isManager && (
                        <input type="checkbox" checked={isSelected} onChange={() => toggleOne(bin.locationId)}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-400 cursor-pointer" />
                      )}
                    </div>

                    <div className="px-4 py-3 flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900">{bin.locationCode}</span>
                      {bin.isStaging && (
                        <span className="text-[9px] font-bold bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">STG</span>
                      )}
                    </div>

                    <div className="px-4 py-3 flex items-center">
                      <span className="text-xs text-gray-500">{bin.zoneCode}</span>
                    </div>

                    <div className="px-4 py-3 flex items-center">
                      <span className="text-xs text-gray-500">
                        {[bin.grandParentLocationCode, bin.parentLocationCode].filter(Boolean).join(' / ') || '—'}
                      </span>
                    </div>

                    <div className="px-4 py-3 flex items-center">
                      {hasConfig
                        ? <span className="text-sm font-semibold text-gray-800">{Number(bin.maxWeightKg)} kg</span>
                        : <span className="text-xs text-amber-500 font-medium flex items-center gap-1">
                            <span className="material-symbols-outlined text-[13px]">warning</span>Chưa đặt
                          </span>
                      }
                    </div>

                    <div className="px-4 py-3 flex items-center">
                      {bin.maxVolumeM3 != null
                        ? <span className="text-sm font-semibold text-gray-800">{Number(bin.maxVolumeM3)} m³</span>
                        : <span className="text-xs text-gray-400">—</span>
                      }
                    </div>

                    <div className="px-4 py-3 flex items-center">
                      {isManager && (
                        <button
                          onClick={() => setEditBin(bin)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer + pagination */}
            {stats.unconfigured > 0 && (
              <div className="px-4 py-2.5 bg-amber-50 border-t border-amber-100 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-[13px]">warning</span>
                <p className="text-xs text-amber-600 font-medium">{stats.unconfigured} bins chưa có cấu hình dung lượng</p>
              </div>
            )}
            <Pagination
              page={page} totalPages={totalPagesCfg}
              totalItems={displayBins.length} pageSize={PAGE_SIZE}
              onPage={p => setPage(p)}
              extraInfo={selectedIds.size > 0 ? `${selectedIds.size} được chọn` : undefined}
            />
          </>
        )}
      </div>

      {/* Modals */}
      {editBin && (
        <EditCapacityModal
          bin={editBin}
          onClose={() => setEditBin(null)}
          onSaved={handleSaved}
        />
      )}
      {showBulkEdit && selectedIds.size > 0 && (
        <BulkEditModal
          count={selectedIds.size}
          onClose={() => setShowBulkEdit(false)}
          onSave={handleBulkSave}
        />
      )}
    </div>
  );
}
