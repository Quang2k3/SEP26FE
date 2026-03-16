"use client";

import React, { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "@/config/axios";
import type { ApiResponse } from "@/interfaces/common";
import { useConfirm } from "@/components/ui/ModalProvider";
import { getStoredSession } from "@/services/authService";
import Portal from "@/components/ui/Portal";
import toast from "react-hot-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Zone {
  zoneId: number;
  zoneCode: string;
  zoneName: string;
  active: boolean;
}
interface Location {
  locationId: number;
  warehouseId: number;
  zoneId: number;
  zoneCode: string;
  locationCode: string;
  locationType: "AISLE" | "RACK" | "BIN" | "STAGING";
  parentLocationId: number | null;
  parentLocationCode: string | null;
  maxWeightKg: number | null;
  maxVolumeM3: number | null;
  isPickingFace: boolean;
  isStaging: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

// ─── API helpers ──────────────────────────────────────────────────────────────

async function fetchZones(): Promise<Zone[]> {
  const session = getStoredSession();
  const isManager = session?.user?.roleCodes?.includes('MANAGER') ?? false;
  const warehouseId = session?.user?.warehouseIds?.[0];
  if (!warehouseId) return [];

  const { data } = await api.get<ApiResponse<any>>("/zones", {
    params: { warehouseId, activeOnly: true, size: 200 },
  });
  if (!data.success) return [];
  if (Array.isArray(data.data?.content)) return data.data.content;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

async function fetchLocations(params: {
  zoneId?: number;
  locationType?: string;
  active?: boolean;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<PageResponse<Location>> {
  const { data } = await api.get<ApiResponse<PageResponse<Location>>>(
    "/locations",
    { params },
  );
  return data.data;
}

async function createLocation(body: {
  zoneId: number;
  locationCode: string;
  locationType: string;
  parentLocationId?: number | null;
  maxWeightKg?: number | null;
  maxVolumeM3?: number | null;
  isPickingFace?: boolean;
  isStaging?: boolean;
}): Promise<Location> {
  const { data } = await api.post<ApiResponse<Location>>("/locations", body);
  return data.data;
}

async function deactivateLocation(locationId: number): Promise<void> {
  await api.patch(`/locations/${locationId}/deactivate`);
}

async function reactivateLocation(locationId: number): Promise<void> {
  await api.patch(`/locations/${locationId}/reactivate`);
}

// ─── Type badge ───────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  const map: Record<string, string> = {
    AISLE: "bg-purple-50 text-purple-700",
    RACK: "bg-blue-50 text-blue-700",
    BIN: "bg-emerald-50 text-emerald-700",
    STAGING: "bg-amber-50 text-amber-700",
  };
  return (
    <span
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${map[type] ?? "bg-gray-100 text-gray-600"}`}
    >
      {type}
    </span>
  );
}

// ─── Create Location Modal ────────────────────────────────────────────────────

function CreateLocationModal({
  zones,
  onClose,
  onDone,
}: {
  zones: Zone[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [step, setStep] = useState<"AISLE" | "RACK" | "BIN">("AISLE");
  const [zoneId, setZoneId] = useState("");
  const [code, setCode] = useState("");
  const [parentId, setParentId] = useState("");
  const [maxWeight, setMaxWeight] = useState("");
  const [maxVolume, setMaxVolume] = useState("");
  const [isPickingFace, setIsPickingFace] = useState(false);
  const [parents, setParents] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!zoneId) return;
    const parentType =
      step === "RACK" ? "AISLE" : step === "BIN" ? "RACK" : null;
    if (!parentType) {
      setParents([]);
      return;
    }
    fetchLocations({
      zoneId: Number(zoneId),
      locationType: parentType,
      active: true,
      size: 200,
    })
      .then((r) => setParents(r.content ?? []))
      .catch(() => setParents([]));
  }, [zoneId, step]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneId) { toast.error("Vui lòng chọn Zone trước"); return; }
    if (step !== "AISLE" && !parentId) {
      toast.error(`Vui lòng chọn ${step === "RACK" ? "dãy (Aisle)" : "kệ (Rack)"} cha trước`);
      return;
    }
    setLoading(true);
    try {
      await createLocation({
        zoneId: Number(zoneId),
        locationCode: code.trim().toUpperCase(),
        locationType: step,
        parentLocationId: parentId ? Number(parentId) : null,
        maxWeightKg: maxWeight ? Number(maxWeight) : null,
        maxVolumeM3: maxVolume ? Number(maxVolume) : null,
        isPickingFace: step === "BIN" ? isPickingFace : false,
        isStaging: false,
      });
      toast.success(`Tạo ${step} thành công`);
      onDone();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? `Lỗi tạo ${step}`);
    } finally {
      setLoading(false);
    }
  };

  const stepIcon: Record<string, string> = {
    AISLE: "view_week",
    RACK: "shelves",
    BIN: "inventory_2",
  };
  const stepDesc: Record<string, string> = {
    AISLE: "Lối đi — cấp 1, không cần parent",
    RACK: "Kệ — phải thuộc một AISLE",
    BIN: "Ô chứa hàng — phải thuộc một RACK",
  };

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style={{
          background: "rgba(79,70,229,0.12)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-indigo-100">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500 text-[20px]">
                  add_location
                </span>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  Tạo Location mới
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Zone → AISLE → RACK → BIN
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          {/* Step selector */}
          <div className="px-6 py-3 border-b border-gray-100 flex gap-2">
            {(["AISLE", "RACK", "BIN"] as const).map((s) => (
              <button
                key={s}
                onClick={() => { setStep(s); setCode(""); setParentId(""); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all
                  ${step === s ? "bg-indigo-600 text-white shadow-sm" : "bg-gray-100 text-gray-500 hover:bg-indigo-50 hover:text-indigo-700"}`}
              >
                <span className="material-symbols-outlined text-[14px]">
                  {stepIcon[s]}
                </span>
                {s}
              </button>
            ))}
          </div>
          <p className="px-6 py-2 text-xs text-gray-400 bg-gray-50 border-b border-gray-100">
            {stepDesc[step]}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Zone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Zone <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    required
                    value={zoneId}
                    onChange={(e) => { setZoneId(e.target.value); setParentId(""); }}
                    className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none"
                  >
                    <option value="">Chọn Zone...</option>
                    {zones.map((z) => (
                      <option key={z.zoneId} value={z.zoneId}>
                        {z.zoneCode} — {z.zoneName}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">
                    expand_more
                  </span>
                </div>
              </div>

              {/* Location Code */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Mã code <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={
                    step === "AISLE"
                      ? "VD: AISLE-HC-A1"
                      : step === "RACK"
                        ? "VD: RACK-HC-R1"
                        : "VD: BIN-HC-A1-01"
                  }
                  className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-mono uppercase"
                />
              </div>

              {/* Parent */}
              {(step === "RACK" || step === "BIN") && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {step === "RACK" ? "AISLE cha" : "RACK cha"}{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      required
                      value={parentId}
                      onChange={(e) => setParentId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 appearance-none"
                    >
                      <option value="">
                        Chọn {step === "RACK" ? "AISLE" : "RACK"}...
                      </option>
                      {parents.map((p) => (
                        <option key={p.locationId} value={p.locationId}>
                          {p.locationCode}
                        </option>
                      ))}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[18px]">
                      expand_more
                    </span>
                  </div>
                  {parents.length === 0 && zoneId && (
                    <p className="text-[11px] text-amber-600">
                      Chưa có {step === "RACK" ? "AISLE" : "RACK"} trong zone này.
                      Tạo {step === "RACK" ? "AISLE" : "RACK"} trước.
                    </p>
                  )}
                </div>
              )}

              {/* Max weight */}
              {step === "BIN" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Max weight (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={maxWeight}
                    onChange={(e) => setMaxWeight(e.target.value)}
                    placeholder="VD: 50"
                    className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <p className="text-[11px] text-gray-400">
                    Dùng để validate putaway — phải điền để dùng được
                  </p>
                </div>
              )}

              {step === "BIN" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Max volume (m³)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={maxVolume}
                    onChange={(e) => setMaxVolume(e.target.value)}
                    placeholder="VD: 1.5 (tuỳ chọn)"
                    className="w-full px-3 py-2.5 border border-indigo-100 rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              )}
            </div>

            {step === "BIN" && (
              <label className="flex items-center gap-3 cursor-pointer group">
                <div
                  className={`w-10 h-6 rounded-full relative transition-colors ${isPickingFace ? "bg-indigo-500" : "bg-gray-200"}`}
                  onClick={() => setIsPickingFace((v) => !v)}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPickingFace ? "translate-x-5" : "translate-x-1"}`}
                  />
                </div>
                <span className="text-sm text-gray-700">
                  Picking Face (cho phép lấy hàng trực tiếp)
                </span>
              </label>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Huỷ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-semibold text-white rounded-xl flex items-center gap-2 disabled:opacity-60 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">add</span>
                    Tạo {step}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Portal>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

function BinListContent() {
  const router = useRouter();
  const confirm = useConfirm();

  const isManager = (() => {
    const session = getStoredSession();
    return session?.user?.roleCodes?.includes("MANAGER") ?? false;
  })();

  const [locations, setLocations] = useState<Location[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const [filterZone, setFilterZone] = useState("");
  const [filterType, setFilterType] = useState("BIN");
  const [filterActive, setFilterActive] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ACTIVE");
  const [keyword, setKeyword] = useState("");

  const PAGE_SIZE = pageSize;

  const load = useCallback(
    async (p = 0) => {
      setLoading(true);
      try {
        const result = await fetchLocations({
          zoneId: filterZone ? Number(filterZone) : undefined,
          locationType: filterType || undefined,
          active: filterActive === "ACTIVE" ? true : filterActive === "INACTIVE" ? false : undefined,
          keyword: keyword || undefined,
          page: p,
          size: pageSize,
        });
        setLocations(result.content ?? []);
        setTotal(result.totalElements ?? 0);
        setPage(p);
      } catch {
        toast.error("Không tải được danh sách location");
      } finally {
        setLoading(false);
      }
    },
    [filterZone, filterType, filterActive, keyword, pageSize],
  );

  useEffect(() => { load(0); }, [load]);
  useEffect(() => { fetchZones().then(setZones).catch(() => {}); }, []);

  const handleDeactivate = (loc: Location) => {
    confirm({
      title: "Vô hiệu hóa location",
      description: `Vô hiệu hóa ${loc.locationCode}? Lưu ý: chỉ có thể thực hiện khi bin đang trống và không có vị trí con active.`,
      variant: "danger",
      icon: "block",
      confirmText: "Vô hiệu hóa",
      onConfirm: async () => {
        try {
          await deactivateLocation(loc.locationId);
          toast.success(`Đã vô hiệu hóa ${loc.locationCode}`);
          load(page);
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Lỗi vô hiệu hóa');
        }
      },
    });
  };

  const handleReactivate = (loc: Location) => {
    confirm({
      title: "Mở lại location",
      description: `Mở lại ${loc.locationCode}? Zone cha phải đang hoạt động.`,
      variant: "info",
      icon: "lock_open",
      confirmText: "Mở lại",
      onConfirm: async () => {
        try {
          await reactivateLocation(loc.locationId);
          toast.success(`Đã mở lại ${loc.locationCode}`);
          load(page);
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Lỗi mở lại location');
        }
      },
    });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="w-full font-sans space-y-5 page-enter">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
                {!isManager && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl mb-4">
          <span className="material-symbols-outlined text-amber-500 text-[18px]">info</span>
          <p className="text-sm text-amber-700 font-medium">
            Bạn đang xem ở chế độ <strong>chỉ đọc</strong>. Chỉ Manager mới có thể tạo, sửa hoặc xóa bin.
          </p>
        </div>
      )}
      <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            Location Management
          </h1>
          <p className="mt-0.5 text-sm text-gray-500">
            Quản lý cấu trúc kho: AISLE → RACK → BIN
          </p>
        </div>
        {isManager && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg,#4f46e5,#6366f1)",
              boxShadow: "0 4px 14px rgba(79,70,229,0.25)",
            }}
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Thêm Location
          </button>
        )}
      </div>

      {isManager && (
        <div className="flex items-center gap-2 px-4 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-sm text-indigo-700">
          <span className="material-symbols-outlined text-[16px] text-indigo-400">info</span>
          <span>
            Thứ tự tạo: <strong>AISLE</strong> → <strong>RACK</strong> (chọn AISLE cha) → <strong>BIN</strong> (chọn RACK cha, điền maxWeightKg)
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-4 flex flex-wrap gap-3 items-center">
        <div className="flex flex-1 min-w-[200px] items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-indigo-300">
          <span className="material-symbols-outlined text-gray-400 text-[18px]">search</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(0)}
            placeholder="Tìm theo mã code..."
            className="w-full bg-transparent border-none text-sm text-gray-800 focus:outline-none placeholder:text-gray-400"
          />
        </div>
        <div className="relative">
          <select
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer"
          >
            <option value="">Tất cả Zone</option>
            {zones.map((z) => (
              <option key={z.zoneId} value={z.zoneId}>{z.zoneCode}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[16px]">expand_more</span>
        </div>
        <div className="relative">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="pl-3 pr-8 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300 appearance-none cursor-pointer"
          >
            <option value="">Tất cả loại</option>
            <option value="AISLE">AISLE</option>
            <option value="RACK">RACK</option>
            <option value="BIN">BIN</option>
            <option value="STAGING">STAGING</option>
          </select>
          <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-[16px]">expand_more</span>
        </div>
        {/* Active filter */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {(["ALL", "ACTIVE", "INACTIVE"] as const).map((k) => (
            <button key={k}
              onClick={() => setFilterActive(k)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterActive === k ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}>
              {k === "ALL" ? "Tất cả" : k === "ACTIVE" ? "Hoạt động" : "Vô hiệu"}
            </button>
          ))}
        </div>
        <button
          onClick={() => load(0)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">search</span>
          Tìm
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">{total} location</p>
          <button
            onClick={() => load(page)}
            className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 font-medium"
          >
            <span className="material-symbols-outlined text-[14px]">refresh</span>
            Tải lại
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr
                className="border-b border-gray-100 text-xs text-gray-400 font-semibold uppercase tracking-wider"
                style={{ background: "linear-gradient(90deg,#f8faff,#f5f3ff)" }}
              >
                <th className="px-5 py-3">Mã Code</th>
                <th className="px-5 py-3">Loại</th>
                <th className="px-5 py-3">Zone</th>
                <th className="px-5 py-3">Parent</th>
                <th className="px-5 py-3">Max Weight</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-sm">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array(7).fill(0).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <div className="h-3 bg-gray-100 rounded w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : locations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <span className="material-symbols-outlined text-gray-200 text-[48px]">shelves</span>
                      <p className="text-sm text-gray-400">Chưa có location nào</p>
                      {isManager && (
                        <button
                          onClick={() => setShowCreate(true)}
                          className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 mt-1"
                        >
                          Tạo AISLE đầu tiên →
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                locations.map((loc) => (
                  <tr key={loc.locationId} className="hover:bg-indigo-50/30 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-semibold text-gray-900">{loc.locationCode}</span>
                    </td>
                    <td className="px-5 py-3.5"><TypeBadge type={loc.locationType} /></td>
                    <td className="px-5 py-3.5 text-gray-600">{loc.zoneCode}</td>
                    <td className="px-5 py-3.5 text-gray-400 font-mono text-xs">{loc.parentLocationCode ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      {loc.maxWeightKg != null ? (
                        <span className="font-semibold text-gray-800">{loc.maxWeightKg} kg</span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${loc.active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>
                        {loc.active ? "Hoạt động" : "Vô hiệu"}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {loc.locationType === "BIN" && (
                          <button
                            onClick={() => router.push(`/bin/occupancy?zoneId=${loc.zoneId}`)}
                            title="Xem occupancy"
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <span className="material-symbols-outlined text-[16px]">bar_chart</span>
                          </button>
                        )}
                        {isManager && (
                          loc.active ? (
                            <button
                              onClick={() => handleDeactivate(loc)}
                              title="Vô hiệu hóa"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">block</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(loc)}
                              title="Mở lại"
                              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              <span className="material-symbols-outlined text-[16px]">lock_open</span>
                            </button>
                          )
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3.5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
          <p className="text-xs text-gray-400">
            Hiển thị {locations.length} / {total} · Trang {page + 1} / {Math.max(1, totalPages)}
          </p>
          <div className="flex items-center gap-1.5">
            <button disabled={page === 0} onClick={() => load(0)}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 text-xs font-bold">«</button>
            <button disabled={page === 0} onClick={() => load(page - 1)}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-100">← Trước</button>
            {Array.from({ length: Math.min(5, Math.max(1, totalPages)) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, Math.max(0, totalPages - 5)));
              const p = start + i;
              if (p >= Math.max(1, totalPages)) return null;
              return (
                <button key={p} onClick={() => load(p)}
                  className={`w-8 h-8 rounded-lg border text-xs font-medium transition-colors ${p === page ? "border-indigo-400 bg-indigo-50 text-indigo-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                  {p + 1}
                </button>
              );
            })}
            <button disabled={page >= totalPages - 1} onClick={() => load(page + 1)}
              className="px-3 h-8 rounded-lg border border-gray-200 text-xs text-gray-600 disabled:opacity-40 hover:bg-gray-100">Tiếp →</button>
            <button disabled={page >= totalPages - 1} onClick={() => load(Math.max(0, totalPages - 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-40 hover:bg-gray-100 text-xs font-bold">»</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Hiện</span>
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); load(0); }}
              className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-300"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
            <span>dòng/trang</span>
          </div>
        </div>
      </div>

      {showCreate && isManager && (
        <CreateLocationModal
          zones={zones}
          onClose={() => setShowCreate(false)}
          onDone={() => load(0)}
        />
      )}
    </div>
  );
}

export default function BinPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">
            progress_activity
          </span>
        </div>
      }
    >
      <BinListContent />
    </Suspense>
  );
}
