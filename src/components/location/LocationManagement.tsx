"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  createLocation,
  fetchLocations,
  updateLocation,
  deactivateLocation,
} from "@/services/locationService";
import { fetchZones } from "@/services/zoneService";
import type {
  Location,
  LocationPage as LocationPageType,
  LocationQueryParams,
  LocationType,
} from "@/interfaces/location";
import type { Zone } from "@/interfaces/zone";
import { AdminPage } from "../layout/AdminPage";
import { Button } from "../ui/Button";
import Portal from "@/components/ui/Portal";
import toast from "react-hot-toast";
import { getStoredSession } from "@/services/authService";
import { useConfirm } from "../ui/ModalProvider";

const DEFAULT_PAGE_SIZE = 8;

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    AISLE:   "bg-purple-50 text-purple-700",
    RACK:    "bg-blue-50 text-blue-700",
    BIN:     "bg-emerald-50 text-emerald-700",
    STAGING: "bg-amber-50 text-amber-700",
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${map[type] ?? "bg-gray-100 text-gray-500"}`}>
      {type}
    </span>
  );
}

// ─── Create Modal ─────────────────────────────────────────────────────────────
function CreateModal({ zones, onClose, onDone }: {
  zones: Zone[]; onClose: () => void; onDone: () => void;
}) {
  const [locType, setLocType] = useState<LocationType>("AISLE");
  const [zoneId, setZoneId]   = useState("");
  const [code, setCode]       = useState("");
  const [parentId, setParentId] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [isPickingFace, setIsPickingFace] = useState(false);
  const [isStaging, setIsStaging]         = useState(false);
  const [parents, setParents] = useState<Location[]>([]);
  const [loadingParents, setLoadingParents] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!zoneId) { setParents([]); return; }
    const parentType = locType === "RACK" ? "AISLE" : locType === "BIN" ? "RACK" : null;
    if (!parentType) { setParents([]); return; }
    setLoadingParents(true);
    fetchLocations({
      zoneId: Number(zoneId),
      locationType: parentType as LocationType,
      active: true,
      size: 200,
    })
      .then(r => setParents(r.content ?? []))
      .catch(() => setParents([]))
      .finally(() => setLoadingParents(false));
  }, [zoneId, locType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId) { toast.error("Chọn Zone"); return; }
    if ((locType === "RACK" || locType === "BIN") && !parentId) {
      toast.error(`Phải chọn ${locType === "RACK" ? "AISLE" : "RACK"} cha`); return;
    }
    if (locType === "BIN" && !maxWeight) { toast.error("BIN phải có Max Weight"); return; }

    setSubmitting(true);
    try {
      await createLocation({
        zoneId:           Number(zoneId),
        locationCode:     code.trim().toUpperCase(),
        locationType:     locType,
        parentLocationId: parentId ? Number(parentId) : undefined,
        maxWeightKg:      maxWeight ? Number(maxWeight) : undefined,
        maxVolumeM3:      maxVolume ? Number(maxVolume) : undefined,
        isPickingFace:    locType === "BIN"     ? isPickingFace : false,
        isStaging:        locType === "STAGING" ? isStaging     : false,
      });
      toast.success(`Tạo ${locType} thành công`);
      onDone();
      onClose();
    } catch { /* axios interceptor đã toast lỗi */ }
    finally { setSubmitting(false); }
  };

  const desc: Record<string, string> = {
    AISLE:   "Lối đi — không cần parent",
    RACK:    "Kệ — phải chọn AISLE cha",
    BIN:     "Ô hàng — phải chọn RACK cha + Max Weight",
    STAGING: "Khu tập kết — không cần parent",
  };
  const inp = "w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(79,70,229,0.12)", backdropFilter: "blur(8px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl border border-indigo-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500 text-[18px]">add_location</span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Tạo Location mới</h2>
                <p className="text-xs text-gray-400 mt-0.5">Zone → AISLE → RACK → BIN</p>
              </div>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
            {(["AISLE","RACK","BIN","STAGING"] as LocationType[]).map(t => (
              <button key={t} type="button"
                onClick={() => { setLocType(t); setParentId(""); setCode(""); }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                  ${locType === t ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700"}`}>
                {t}
              </button>
            ))}
          </div>
          <p className="px-6 py-2 text-xs text-indigo-600 bg-indigo-50/60 border-b border-indigo-100/50">{desc[locType]}</p>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Zone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select required value={zoneId}
                    onChange={e => { setZoneId(e.target.value); setParentId(""); }}
                    className={`${inp} appearance-none pr-8`}>
                    <option value="">Chọn Zone...</option>
                    {zones.map(z => (
                      <option key={z.zoneId} value={z.zoneId}>{z.zoneCode} — {z.zoneName}</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[16px]">expand_more</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Mã code <span className="text-red-500">*</span></label>
                <input required value={code} onChange={e => setCode(e.target.value)}
                  placeholder={locType === "AISLE" ? "AISLE-HC-A1" : locType === "RACK" ? "RACK-HC-R1" : "BIN-HC-01"}
                  className={`${inp} font-mono`} />
              </div>

              {(locType === "RACK" || locType === "BIN") && (
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {locType === "RACK" ? "AISLE cha" : "RACK cha"} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select required value={parentId} onChange={e => setParentId(e.target.value)}
                      disabled={loadingParents}
                      className={`${inp} appearance-none pr-8`}>
                      <option value="">
                        {loadingParents ? "Đang tải..." : `Chọn ${locType === "RACK" ? "AISLE" : "RACK"}...`}
                      </option>
                      {parents.map(p => (
                        <option key={p.locationId} value={p.locationId}>{p.locationCode}</option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[16px]">expand_more</span>
                  </div>
                  {!loadingParents && parents.length === 0 && zoneId && (
                    <p className="text-[11px] text-amber-600 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">warning</span>
                      Chưa có {locType === "RACK" ? "AISLE" : "RACK"} trong zone này — tạo trước.
                    </p>
                  )}
                </div>
              )}

              {(locType === "BIN" || locType === "RACK") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Max Weight (kg){locType === "BIN" && <span className="text-red-500"> *</span>}
                  </label>
                  <input type="number" step="0.01" min="0.01"
                    required={locType === "BIN"}
                    value={maxWeight} onChange={e => setMaxWeight(e.target.value)}
                    placeholder="VD: 50" className={inp} />
                  {locType === "BIN" && (
                    <p className="text-[11px] text-gray-400">Bắt buộc để putaway hoạt động</p>
                  )}
                </div>
              )}

              {locType === "BIN" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Volume (m³)</label>
                  <input type="number" step="0.01" min="0.01"
                    value={maxVolume} onChange={e => setMaxVolume(e.target.value)}
                    placeholder="VD: 1.5 (tuỳ chọn)" className={inp} />
                </div>
              )}
            </div>

            {locType === "BIN" && (
              <label className="flex items-center gap-3 cursor-pointer">
                <div className={`w-9 h-5 rounded-full relative transition-colors ${isPickingFace ? "bg-indigo-500" : "bg-gray-200"}`}
                  onClick={() => setIsPickingFace(v => !v)}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPickingFace ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span className="text-sm text-gray-700">Picking Face</span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                Huỷ
              </button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 active:scale-95"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                {submitting
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang tạo...</>
                  : <><span className="material-symbols-outlined text-[15px]">add</span>Tạo {locType}</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditModal({ location, onClose, onDone }: {
  location: Location; onClose: () => void; onDone: () => void;
}) {
  const [maxWeight, setMaxWeight]         = useState(location.maxWeightKg?.toString() ?? "");
  const [maxVolume, setMaxVolume]         = useState(location.maxVolumeM3?.toString() ?? "");
  const [isPickingFace, setIsPickingFace] = useState(location.isPickingFace ?? false);
  const [isStaging, setIsStaging]         = useState(location.isStaging ?? false);
  const [submitting, setSubmitting]       = useState(false);
  const inp = "w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateLocation(location.locationId, {
        maxWeightKg:  maxWeight ? Number(maxWeight) : location.maxWeightKg,
        maxVolumeM3:  maxVolume ? Number(maxVolume) : location.maxVolumeM3,
        isPickingFace,
        isStaging,
      });
      toast.success("Cập nhật thành công");
      onDone();
      onClose();
    } catch { /* axios interceptor đã toast */ }
    finally { setSubmitting(false); }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{ background: "rgba(79,70,229,0.12)", backdropFilter: "blur(8px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-indigo-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900">Chỉnh sửa Location</h2>
              <p className="text-xs text-indigo-500 font-mono mt-0.5">{location.locationCode}</p>
            </div>
            <button type="button" onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Weight (kg)</label>
                <input type="number" step="0.01" min="0" value={maxWeight}
                  onChange={e => setMaxWeight(e.target.value)} placeholder="kg" className={inp} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Max Volume (m³)</label>
                <input type="number" step="0.01" min="0" value={maxVolume}
                  onChange={e => setMaxVolume(e.target.value)} placeholder="m³" className={inp} />
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {([
                { label: "Picking Face", val: isPickingFace, set: setIsPickingFace, color: "bg-indigo-500" },
                { label: "Staging Area", val: isStaging,     set: setIsStaging,     color: "bg-amber-500"  },
              ] as const).map(({ label, val, set, color }) => (
                <label key={label} className="flex items-center gap-3 cursor-pointer">
                  <div className={`w-9 h-5 rounded-full relative transition-colors ${val ? color : "bg-gray-200"}`}
                    onClick={() => (set as any)((v: boolean) => !v)}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${val ? "translate-x-4" : "translate-x-0.5"}`} />
                  </div>
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">Huỷ</button>
              <button type="submit" disabled={submitting}
                className="px-5 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>
                {submitting
                  ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Lưu...</>
                  : "Lưu thay đổi"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function LocationListPage() {
  const session     = getStoredSession();
  const warehouseId = session?.user?.warehouseIds?.[0];
  const confirm     = useConfirm();

  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones]         = useState<Zone[]>([]);
  const [loading, setLoading]     = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editLoc, setEditLoc]       = useState<Location | null>(null);
  const [pageInfo, setPageInfo] = useState<Omit<LocationPageType, "content">>({
    page: 0, size: DEFAULT_PAGE_SIZE, totalElements: 0, totalPages: 0, last: true,
  });

  const filtersRef = useRef<LocationQueryParams>({ page: 0, size: DEFAULT_PAGE_SIZE });
  const [filtersUI, setFiltersUI] = useState<LocationQueryParams>({ page: 0, size: DEFAULT_PAGE_SIZE });

  const loadLocations = useCallback(async (override?: Partial<LocationQueryParams>) => {
    const params: LocationQueryParams = { ...filtersRef.current, ...override };
    filtersRef.current = params;
    setFiltersUI({ ...params });
    setLoading(true);
    try {
      const result = await fetchLocations(params);
      setLocations(result.content ?? []);
      setPageInfo({
        page:          result.page,
        size:          result.size,
        totalElements: result.totalElements,
        totalPages:    result.totalPages,
        last:          result.last,
      });
    } catch {
      // axios interceptor đã toast
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLocations();
    fetchZones({ activeOnly: true, warehouseId })
      .then(data => {
        const arr = Array.isArray(data) ? data : (data as any)?.content ?? [];
        setZones(arr);
      })
      .catch(() => {});
  }, []); // eslint-disable-line

  const handleDeactivate = (loc: Location) => {
    confirm({
      title:       "Vô hiệu hoá location",
      description: `Vô hiệu hoá ${loc.locationCode}? Không thể nếu còn inventory.`,
      variant:     "danger",
      icon:        "block",
      confirmText: "Vô hiệu hoá",
      onConfirm:   async () => {
        await deactivateLocation(loc.locationId);
        toast.success(`Đã vô hiệu hoá ${loc.locationCode}`);
        loadLocations({ page: pageInfo.page });
      },
    });
  };

  const totalPages = pageInfo.totalPages;

  return (
    <AdminPage
      title="Location Management"
      description="Quản lý cấu trúc kho: Zone → AISLE → RACK → BIN"
      actions={
        <Button
          onClick={() => setShowCreate(true)}
          leftIcon={<span className="material-symbols-outlined text-[15px]">add</span>}>
          Thêm Location
        </Button>
      }
    >
      {/* Hint */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm text-indigo-700 mb-4">
        <span className="material-symbols-outlined text-[15px] text-indigo-400">info</span>
        Thứ tự tạo: <strong>AISLE</strong> → <strong>RACK</strong> (chọn AISLE cha) → <strong>BIN</strong> (chọn RACK cha + Max Weight)
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-4 flex flex-wrap gap-3 items-center mb-4">
        <div className="flex flex-1 min-w-[180px] items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
          <span className="material-symbols-outlined text-gray-400 text-[16px]">search</span>
          <input
            value={filtersUI.keyword ?? ""}
            onChange={e => {
              filtersRef.current = { ...filtersRef.current, keyword: e.target.value };
              setFiltersUI(f => ({ ...f, keyword: e.target.value }));
            }}
            onKeyDown={e => e.key === "Enter" && loadLocations({ page: 0 })}
            placeholder="Tìm theo mã code..."
            className="w-full bg-transparent border-none text-sm text-gray-800 focus:outline-none placeholder:text-gray-400"
          />
        </div>

        <div className="relative">
          <select
            value={filtersUI.zoneId ?? ""}
            onChange={e => {
              const v = e.target.value ? Number(e.target.value) : undefined;
              filtersRef.current = { ...filtersRef.current, zoneId: v };
              setFiltersUI(f => ({ ...f, zoneId: v }));
            }}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
            <option value="">Tất cả Zone</option>
            {zones.map(z => <option key={z.zoneId} value={z.zoneId}>{z.zoneCode} — {z.zoneName}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[15px]">expand_more</span>
        </div>

        <div className="relative">
          <select
            value={filtersUI.locationType ?? ""}
            onChange={e => {
              const v = (e.target.value as LocationType) || undefined;
              filtersRef.current = { ...filtersRef.current, locationType: v };
              setFiltersUI(f => ({ ...f, locationType: v }));
            }}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer">
            <option value="">Tất cả loại</option>
            {["AISLE","RACK","BIN","STAGING"].map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[15px]">expand_more</span>
        </div>

        <button onClick={() => loadLocations({ page: 0 })}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
          <span className="material-symbols-outlined text-[15px]">search</span>Tìm
        </button>

        <button onClick={() => {
          filtersRef.current = { page: 0, size: DEFAULT_PAGE_SIZE };
          setFiltersUI({ page: 0, size: DEFAULT_PAGE_SIZE });
          loadLocations({ page: 0, zoneId: undefined, locationType: undefined, keyword: undefined });
        }} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
          <span className="material-symbols-outlined text-[14px]">clear</span>Xoá filter
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">{pageInfo.totalElements} location</p>
          <button onClick={() => loadLocations()}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
            <span className="material-symbols-outlined text-[13px]">refresh</span>Tải lại
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider"
                style={{ background: "linear-gradient(90deg,#f8faff,#f5f3ff)" }}>
                <th className="px-5 py-3">Mã Code</th>
                <th className="px-5 py-3">Loại</th>
                <th className="px-5 py-3">Zone</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Max Weight</th>
                <th className="px-5 py-3">Max Volume</th>
                <th className="px-5 py-3">Flags</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading
                ? Array(DEFAULT_PAGE_SIZE).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(9).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3 bg-gray-100 rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
                : locations.length === 0
                  ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-12 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <span className="material-symbols-outlined text-gray-200 text-[48px]">shelves</span>
                          <p className="text-sm text-gray-400">Chưa có location nào</p>
                          <button onClick={() => setShowCreate(true)}
                            className="text-sm text-indigo-600 font-semibold mt-1 hover:text-indigo-800">
                            Tạo AISLE đầu tiên →
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                  : locations.map(loc => (
                    <tr key={loc.locationId} className="hover:bg-indigo-50/30 transition-colors group">
                      <td className="px-5 py-3.5 font-mono font-semibold text-gray-900">{loc.locationCode}</td>
                      <td className="px-5 py-3.5"><TypeBadge type={loc.locationType} /></td>
                      <td className="px-5 py-3.5 text-gray-600 text-xs">{loc.zoneCode}</td>
                      <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{loc.parentLocationCode ?? "—"}</td>
                      <td className="px-5 py-3.5">
                        {loc.maxWeightKg != null
                          ? <span className="font-semibold text-gray-800">{loc.maxWeightKg} kg</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        {loc.maxVolumeM3 != null
                          ? <span className="text-gray-600">{loc.maxVolumeM3} m³</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex gap-1">
                          {loc.isPickingFace && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-semibold">Pick</span>}
                          {loc.isStaging    && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-semibold">Stage</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${loc.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                          {loc.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditLoc(loc)} title="Chỉnh sửa"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50">
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                          {loc.active && (
                            <button onClick={() => handleDeactivate(loc)} title="Vô hiệu hoá"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50">
                              <span className="material-symbols-outlined text-[15px]">block</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            Hiển thị {locations.length} / {pageInfo.totalElements} · Trang {pageInfo.page + 1} / {Math.max(1, totalPages)}
          </p>
          <div className="flex items-center gap-1.5">
            <button disabled={pageInfo.page === 0} onClick={() => loadLocations({ page: 0 })}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 text-xs">«</button>
            <button disabled={pageInfo.page === 0} onClick={() => loadLocations({ page: pageInfo.page - 1 })}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-100">← Trước</button>

            {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
              const start = Math.max(0, Math.min(pageInfo.page - 2, Math.max(0, totalPages - 5)));
              const p = start + i;
              if (p >= Math.max(1, totalPages)) return null;
              return (
                <button key={p} onClick={() => loadLocations({ page: p })}
                  className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors
                    ${p === pageInfo.page
                      ? "border-indigo-400 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {p + 1}
                </button>
              );
            })}

            <button disabled={pageInfo.last} onClick={() => loadLocations({ page: pageInfo.page + 1 })}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-100">Tiếp →</button>
            <button disabled={pageInfo.last} onClick={() => loadLocations({ page: Math.max(0, totalPages - 1) })}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 text-xs">»</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Hiện</span>
            <select
              value={filtersUI.size ?? DEFAULT_PAGE_SIZE}
              onChange={e => loadLocations({ page: 0, size: Number(e.target.value) })}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300">
              {[8, 20, 50].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span>dòng</span>
          </div>
        </div>
      </div>

      {showCreate && (
        <CreateModal
          zones={zones}
          onClose={() => setShowCreate(false)}
          onDone={() => loadLocations({ page: 0 })}
        />
      )}
      {editLoc && (
        <EditModal
          location={editLoc}
          onClose={() => setEditLoc(null)}
          onDone={() => loadLocations({ page: pageInfo.page })}
        />
      )}
    </AdminPage>
  );
}
