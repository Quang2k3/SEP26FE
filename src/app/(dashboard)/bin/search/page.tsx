'use client';

import { useState, useCallback } from 'react';
import api from '@/config/axios';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import type { ApiResponse, PageResponse } from '@/interfaces/common';
import toast from 'react-hot-toast';
import { useEffect } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmptyBinResult {
  locationId: number;
  locationCode: string;
  zoneId: number;
  zoneCode: string;
  parentLocationCode: string | null;
  grandParentLocationCode: string | null;
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  occupiedQty: number;
  availableQty: number | null;
  isPickingFace: boolean;
  isStaging: boolean;
}

async function searchEmptyBins(params: {
  zoneId?: number;
  requiredWeightKg?: number;
  requiredVolumeM3?: number;
  page?: number;
  size?: number;
}): Promise<{ content: EmptyBinResult[]; totalElements: number }> {
  const { data } = await api.get<ApiResponse<PageResponse<EmptyBinResult>>>(
    '/bins/search-empty',
    { params: { ...params, size: params.size ?? 100 } }
  );
  return { content: data.data?.content ?? [], totalElements: data.data?.totalElements ?? 0 };
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function SearchEmptyBinPage() {
  const [zones, setZones]             = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | ''>('');
  const [weightReq, setWeightReq]     = useState('');
  const [volumeReq, setVolumeReq]     = useState('');
  const [results, setResults]         = useState<EmptyBinResult[]>([]);
  const [totalElements, setTotal]     = useState(0);
  const [loading, setLoading]         = useState(false);
  const [searched, setSearched]       = useState(false);
  const [selectedBin, setSelectedBin] = useState<EmptyBinResult | null>(null);

  useEffect(() => {
    fetchZones({ activeOnly: true }).then(setZones).catch(() => {});
  }, []);

  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    setSelectedBin(null);
    try {
      const { content, totalElements } = await searchEmptyBins({
        zoneId: selectedZoneId !== '' ? Number(selectedZoneId) : undefined,
        requiredWeightKg: weightReq ? parseFloat(weightReq) : undefined,
        requiredVolumeM3: volumeReq ? parseFloat(volumeReq) : undefined,
      });
      setResults(content);
      setTotal(totalElements);
      if (content.length === 0) toast('Không tìm thấy bin trống phù hợp', { icon: '🔍' });
    } catch {
      toast.error('Lỗi khi tìm kiếm bin');
    } finally {
      setLoading(false);
    }
  }, [selectedZoneId, weightReq, volumeReq]);

  const handleReset = () => {
    setSelectedZoneId('');
    setWeightReq('');
    setVolumeReq('');
    setResults([]);
    setSearched(false);
    setSelectedBin(null);
  };

  return (
    <div className="w-full font-sans space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">Tìm BIN trống</h1>
        <p className="text-sm text-gray-500 mt-0.5">Tìm ô bin còn trống theo yêu cầu tải trọng và thể tích</p>
      </div>

      {/* Search form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Zone</label>
            <select value={selectedZoneId} onChange={e => setSelectedZoneId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white text-gray-700">
              <option value="">Tất cả zone</option>
              {zones.map(z => (
                <option key={z.zoneId} value={z.zoneId}>{z.zoneCode} — {z.zoneName}</option>
              ))}
            </select>
          </div>

          {/* Weight requirement */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Tải trọng cần thiết (kg)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">scale</span>
              <input
                type="number" min={0} step="0.1"
                value={weightReq}
                onChange={e => setWeightReq(e.target.value)}
                placeholder="VD: 50"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
            <p className="text-[10px] text-gray-400">Tìm bin có maxWeightKg ≥ giá trị này</p>
          </div>

          {/* Volume requirement */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
              Thể tích cần thiết (m³)
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[16px]">view_in_ar</span>
              <input
                type="number" min={0} step="0.01"
                value={volumeReq}
                onChange={e => setVolumeReq(e.target.value)}
                placeholder="VD: 0.5"
                className="w-full pl-9 pr-3.5 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
              />
            </div>
            <p className="text-[10px] text-gray-400">Tìm bin có maxVolumeM3 ≥ giá trị này</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-gray-100">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-60 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)', boxShadow: '0 4px 14px rgba(79,70,229,0.25)' }}>
            {loading
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tìm...</>
              : <><span className="material-symbols-outlined text-[16px]">search</span>Tìm BIN trống</>
            }
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[15px]">restart_alt</span>
            Xóa bộ lọc
          </button>
          {searched && (
            <span className="text-sm text-gray-500 ml-2">
              Tìm thấy <span className="font-bold text-gray-800">{totalElements}</span> bin trống
            </span>
          )}
        </div>
      </div>

      {/* Results */}
      {searched && (
        <div className="flex gap-4">
          {/* List */}
          <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
              </div>
            ) : results.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[48px]">search_off</span>
                <p className="text-sm text-gray-500 font-medium">Không tìm thấy bin trống phù hợp</p>
                <p className="text-xs text-gray-400">Thử giảm yêu cầu tải trọng hoặc chọn zone khác</p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] bg-gray-50 border-b border-gray-100">
                  {['Mã BIN', 'Zone', 'Kệ / Dãy', 'Max KG', 'Max m³', 'Loại'].map(h => (
                    <div key={h} className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{h}</div>
                  ))}
                </div>
                <div className="divide-y divide-gray-50 overflow-y-auto max-h-[60vh]">
                  {results.map(bin => {
                    const isSelected = selectedBin?.locationId === bin.locationId;
                    return (
                      <div key={bin.locationId}
                        onClick={() => setSelectedBin(isSelected ? null : bin)}
                        className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] cursor-pointer transition-colors
                          ${isSelected ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                        <div className="px-4 py-3 flex items-center gap-2.5">
                          <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
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
                          <span className="text-xs font-semibold text-gray-700">
                            {bin.maxWeightKg ? `${Number(bin.maxWeightKg)} kg` : '—'}
                          </span>
                        </div>
                        <div className="px-4 py-3 flex items-center">
                          <span className="text-xs font-semibold text-gray-700">
                            {bin.maxVolumeM3 ? `${Number(bin.maxVolumeM3)} m³` : '—'}
                          </span>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-1.5 flex-wrap">
                          {bin.isStaging    && <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full">Staging</span>}
                          {bin.isPickingFace && <span className="text-[9px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-full">Picking</span>}
                          {!bin.isStaging && !bin.isPickingFace && <span className="text-[9px] text-gray-400">Standard</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs text-gray-400">Hiển thị {results.length} kết quả</p>
                </div>
              </>
            )}
          </div>

          {/* Selected bin detail */}
          {selectedBin && (
            <div className="w-64 flex-shrink-0 bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-3 self-start">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">{selectedBin.locationCode}</h3>
                <button onClick={() => setSelectedBin(null)} className="text-gray-300 hover:text-gray-500">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-emerald-600">Trống — sẵn sàng</span>
              </div>

              <div className="space-y-1.5">
                {[
                  { label: 'Zone', val: selectedBin.zoneCode },
                  { label: 'Dãy', val: selectedBin.grandParentLocationCode ?? '—' },
                  { label: 'Kệ', val: selectedBin.parentLocationCode ?? '—' },
                  { label: 'Tải trọng max', val: selectedBin.maxWeightKg ? `${Number(selectedBin.maxWeightKg)} kg` : '—' },
                  { label: 'Thể tích max', val: selectedBin.maxVolumeM3 ? `${Number(selectedBin.maxVolumeM3)} m³` : '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="flex justify-between items-center text-xs">
                    <span className="text-gray-400">{label}</span>
                    <span className="font-semibold text-gray-700">{val}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(selectedBin.locationCode);
                    toast.success('Đã copy mã BIN');
                  }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
                  <span className="material-symbols-outlined text-[14px]">content_copy</span>
                  Copy mã BIN
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
