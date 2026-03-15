'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  fetchPutawayTasks,
  fetchPutawayTask,
  fetchPutawaySuggestions,
  fetchBinOccupancy,
  fetchAllocations,
  allocatePutaway,
  cancelAllocation,
  confirmPutawayTask,
  type PutawayTaskResponse,
  type PutawayTaskItemDto,
  type PutawaySuggestion,
  type BinOccupancyResponse,
  type PutawayAllocationResponse,
} from '@/services/putawayService';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import { useConfirm } from '@/components/ui/ModalProvider';
import Portal from '@/components/ui/Portal';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'TASK_LIST' | 'ZONE_SELECT' | 'AISLE_SELECT' | 'RACK_SELECT' | 'BIN_MAP' | 'REVIEW';

interface PendingAlloc {
  skuId: number;
  skuCode: string;
  skuName: string;
  locationId: number;
  locationCode: string;
  qty: number;
}

// ─── Color helpers ────────────────────────────────────────────────────────────

function statusColor(status: string) {
  if (status === 'EMPTY')   return { bg: 'bg-white',       border: 'border-gray-200',    text: 'text-gray-400',   dot: 'bg-gray-300'   };
  if (status === 'PARTIAL') return { bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700',   dot: 'bg-blue-400'   };
  if (status === 'FULL')    return { bg: 'bg-red-50',       border: 'border-red-300',     text: 'text-red-700',    dot: 'bg-red-500'    };
  return                           { bg: 'bg-gray-50',      border: 'border-gray-200',    text: 'text-gray-400',   dot: 'bg-gray-300'   };
}

function pct(val: number | null, max: number | null): number {
  if (!max || max === 0 || val === null) return 0;
  return Math.min(100, Math.round((val / max) * 100));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, colorClass = 'bg-indigo-500' }: { value: number; colorClass?: string }) {
  return (
    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: 'bg-gray-100 text-gray-500',
    OPEN: 'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-amber-50 text-amber-700',
    DONE: 'bg-emerald-50 text-emerald-700',
  };
  const labels: Record<string, string> = { PENDING: 'Chờ', OPEN: 'Mở', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành' };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// SKU progress pill in sidebar
function SkuPill({ item, remaining }: { item: PutawayTaskItemDto; remaining: number }) {
  const done = remaining === 0;
  const pctDone = pct(item.quantity - remaining, item.quantity);
  return (
    <div className={`rounded-xl p-3 border transition-all ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-gray-800 truncate max-w-[100px]">{item.skuCode}</span>
        {done
          ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5"><span className="material-symbols-outlined text-[11px]">check_circle</span>Xong</span>
          : <span className="text-[10px] text-amber-600 font-semibold">Còn {remaining}</span>
        }
      </div>
      <p className="text-[10px] text-gray-400 truncate mb-1.5">{item.skuName}</p>
      <ProgressBar value={pctDone} colorClass={done ? 'bg-emerald-500' : 'bg-amber-400'} />
      <div className="flex justify-between text-[10px] text-gray-400 mt-1">
        <span>{item.quantity - remaining}/{item.quantity}</span>
        <span>{pctDone}%</span>
      </div>
    </div>
  );
}

// ─── BIN DETAIL MODAL ─────────────────────────────────────────────────────────

interface BinDetailModalProps {
  bin: BinOccupancyResponse;
  task: PutawayTaskResponse;
  pendingForBin: PendingAlloc[];
  onClose: () => void;
  onAdd: (skuId: number, skuCode: string, skuName: string, qty: number) => void;
  remainingFn: (item: PutawayTaskItemDto) => number;
}

function BinDetailModal({ bin, task, pendingForBin, onClose, onAdd, remainingFn }: BinDetailModalProps) {
  const [selectedSku, setSelectedSku] = useState<PutawayTaskItemDto | null>(
    task.items.find(i => remainingFn(i) > 0) ?? null
  );
  const [qty, setQty] = useState('');

  const binAvail = Number(bin.availableQty ?? 9999);
  const binPendingQty = pendingForBin.reduce((s, p) => s + p.qty, 0);
  const binRemaining = Math.max(0, binAvail - binPendingQty);

  const maxQty = selectedSku
    ? Math.min(remainingFn(selectedSku), binRemaining)
    : 0;

  const handleAdd = () => {
    if (!selectedSku) return;
    const q = parseFloat(qty);
    if (!q || q <= 0) { toast.error('Nhập số lượng hợp lệ'); return; }
    if (q > maxQty) { toast.error(`Tối đa ${maxQty}`); return; }
    onAdd(selectedSku.skuId, selectedSku.skuCode, selectedSku.skuName, q);
    setQty('');
    // Move to next sku if current is done
    const newRemain = remainingFn(selectedSku) - q;
    if (newRemain <= 0) {
      const next = task.items.find(i => i.skuId !== selectedSku.skuId && remainingFn(i) > 0);
      setSelectedSku(next ?? null);
    }
  };

  const c = statusColor(bin.occupancyStatus);
  const pctFull = pct(Number(bin.occupiedQty) + Number(bin.reservedQty), Number(bin.maxWeightKg));

  return (
    <Portal>
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(17,24,39,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center ${c.bg} ${c.border}`}>
              <span className="material-symbols-outlined text-[20px] text-gray-500">inventory</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">{bin.locationCode}</h3>
              <p className="text-[11px] text-gray-400">{bin.grandParentLocationCode} › {bin.parentLocationCode}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Bin capacity */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Sức chứa', val: bin.maxWeightKg ?? '∞' },
              { label: 'Đã dùng', val: Number(bin.occupiedQty).toFixed(0) },
              { label: 'Còn trống', val: binRemaining },
            ].map(({ label, val }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-2.5 text-center">
                <p className="text-[10px] text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-800">{val}</p>
              </div>
            ))}
          </div>
          <ProgressBar value={pctFull} colorClass={pctFull >= 90 ? 'bg-red-500' : pctFull >= 50 ? 'bg-amber-400' : 'bg-emerald-500'} />

          {/* Current contents of this bin */}
          {bin.inventoryItems && bin.inventoryItems.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2">Hàng đang trong BIN</p>
              <div className="space-y-1.5">
                {bin.inventoryItems.map((inv, i) => (
                  <div key={i} className="flex items-center justify-between bg-blue-50 rounded-lg px-3 py-2">
                    <div>
                      <span className="text-xs font-semibold text-blue-800">{inv.skuCode}</span>
                      <span className="text-[11px] text-blue-500 ml-2">{inv.skuName}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-blue-700">{Number(inv.quantity).toFixed(0)}</span>
                      {inv.lotNumber && <p className="text-[10px] text-blue-400">{inv.lotNumber}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending for this bin */}
          {pendingForBin.length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wide mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">pending</span>
                Sắp đặt vào BIN này
              </p>
              <div className="space-y-1">
                {pendingForBin.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-semibold text-amber-800">{p.skuCode}</span>
                    <span className="text-xs font-bold text-amber-700">+{p.qty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add stock form */}
          {bin.occupancyStatus !== 'FULL' && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3">Đặt hàng vào BIN này</p>

              {/* SKU selector */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {task.items.map(item => {
                  const rem = remainingFn(item);
                  const isSelected = selectedSku?.skuId === item.skuId;
                  return (
                    <button key={item.skuId}
                      onClick={() => { setSelectedSku(item); setQty(''); }}
                      disabled={rem === 0}
                      className={`text-left p-2.5 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                        ${isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/40'}`}>
                      <div className="flex justify-between items-center">
                        <span className={`text-xs font-bold ${isSelected ? 'text-indigo-800' : 'text-gray-700'}`}>{item.skuCode}</span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full
                          ${rem === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {rem === 0 ? '✓' : rem}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">{item.skuName}</p>
                    </button>
                  );
                })}
              </div>

              {/* Qty + submit */}
              {selectedSku && (
                <div className="flex gap-2 items-end">
                  <div className="flex-1 space-y-1">
                    <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                      Số lượng ({selectedSku.skuCode} · tối đa {maxQty})
                    </label>
                    <input
                      type="number" min={1} max={maxQty}
                      value={qty}
                      onChange={e => setQty(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAdd()}
                      placeholder={`1 – ${maxQty}`}
                      autoFocus
                      className="w-full px-3 py-2 text-sm border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    />
                  </div>
                  <button
                    onClick={handleAdd}
                    disabled={!qty || parseFloat(qty) <= 0 || parseFloat(qty) > maxQty}
                    className="h-[38px] px-4 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 active:scale-95 transition-all"
                    style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    Thêm
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
    </Portal>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function PutawayPage() {
  const confirm = useConfirm();

  // ── Navigation state ──
  const [step, setStep] = useState<Step>('TASK_LIST');

  // ── Task list ──
  const [tasks, setTasks]               = useState<PutawayTaskResponse[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);

  // ── Current task context ──
  const [task, setTask]                 = useState<PutawayTaskResponse | null>(null);
  const [suggestions, setSuggestions]   = useState<PutawaySuggestion[]>([]);
  const [zones, setZones]               = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  // ── Hierarchy drill-down ──
  const [allBins, setAllBins]           = useState<BinOccupancyResponse[]>([]);
  const [loadingBins, setLoadingBins]   = useState(false);
  const [selectedAisle, setSelectedAisle] = useState<string | null>(null);  // grandParentLocationCode
  const [selectedRack, setSelectedRack]   = useState<string | null>(null);  // parentLocationCode

  // ── Bin detail modal ──
  const [modalBin, setModalBin]         = useState<BinOccupancyResponse | null>(null);

  // ── Allocation state ──
  const [pending, setPending]           = useState<PendingAlloc[]>([]);
  const [reserved, setReserved]         = useState<PutawayAllocationResponse[]>([]);
  const [submitting, setSubmitting]     = useState(false);
  const [confirming, setConfirming]     = useState(false);

  // ── Computed: suggested zones & bins from API ──
  const suggestedZoneIds = new Set(suggestions.map(s => s.matchedZoneId));
  // Map: zoneId → list suggestions (grouped)
  const suggByZone = suggestions.reduce<Record<number, PutawaySuggestion[]>>((acc, s) => {
    (acc[s.matchedZoneId] ??= []).push(s);
    return acc;
  }, {});
  // Map: locationId → suggestion (for bin-level highlight)
  const suggByBin = suggestions.reduce<Record<number, PutawaySuggestion>>((acc, s) => {
    acc[s.suggestedLocationId] = s;
    return acc;
  }, {});

  // ── Computed: aisles in selected zone ──
  const aisles = useMemo(() => {
    const codes = [...new Set(allBins.map(b => b.grandParentLocationCode).filter(Boolean))] as string[];
    return codes.sort();
  }, [allBins]);

  // ── Computed: racks in selected aisle ──
  const racks = useMemo(() => {
    if (!selectedAisle) return [];
    const codes = [
      ...new Set(
        allBins
          .filter(b => b.grandParentLocationCode === selectedAisle)
          .map(b => b.parentLocationCode)
          .filter(Boolean)
      ),
    ] as string[];
    return codes.sort();
  }, [allBins, selectedAisle]);

  // ── Computed: bins in selected rack ──
  const binsInRack = useMemo(() => {
    if (!selectedAisle || !selectedRack) return [];
    return allBins.filter(
      b => b.grandParentLocationCode === selectedAisle && b.parentLocationCode === selectedRack
    );
  }, [allBins, selectedAisle, selectedRack]);

  // ── Remaining qty helper ──
  const remainingUnallocated = useCallback((item: PutawayTaskItemDto) => {
    const localPending = pending.filter(p => p.skuId === item.skuId).reduce((s, p) => s + p.qty, 0);
    return Math.max(0, item.remainingQty - localPending);
  }, [pending]);

  const allItemsDone = task?.items.every(i => remainingUnallocated(i) === 0) ?? false;
  const pendingTotal = pending.reduce((s, p) => s + p.qty, 0);

  // ── Load task list ──────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const page = await fetchPutawayTasks({ size: 50 });
      setTasks(page.content ?? []);
    } catch { toast.error('Không tải được danh sách task'); }
    finally { setLoadingTasks(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Open task ───────────────────────────────────────────────────────────────
  const openTask = async (t: PutawayTaskResponse) => {
    try {
      const [detail, allocs, suggs] = await Promise.all([
        fetchPutawayTask(t.putawayTaskId),
        fetchAllocations(t.putawayTaskId).catch(() => []),
        fetchPutawaySuggestions(t.putawayTaskId).catch(() => []),
      ]);
      const zList = await fetchZones({ warehouseId: detail.warehouseId, activeOnly: true }).catch(() => []);
      setTask(detail);
      setZones(zList);
      setSuggestions(suggs);
      setReserved(allocs.filter(a => a.status === 'RESERVED'));
      setPending([]);
      setSelectedZone(null);
      setSelectedAisle(null);
      setSelectedRack(null);
      setAllBins([]);
      setStep('ZONE_SELECT');
    } catch { toast.error('Không tải được task'); }
  };

  // ── Select zone → load ALL bins of that zone ────────────────────────────────
  const selectZone = async (zone: Zone) => {
    setSelectedZone(zone);
    setSelectedAisle(null);
    setSelectedRack(null);
    setLoadingBins(true);
    try {
      const page = await fetchBinOccupancy({ zoneId: zone.zoneId, size: 500 });
      setAllBins(page.content ?? []);
    } catch { toast.error('Không tải được bins'); }
    finally { setLoadingBins(false); }
    setStep('AISLE_SELECT');
  };

  // ── Select aisle ─────────────────────────────────────────────────────────────
  const selectAisle = (aisleCode: string) => {
    setSelectedAisle(aisleCode);
    setSelectedRack(null);
    setStep('RACK_SELECT');
  };

  // ── Select rack ──────────────────────────────────────────────────────────────
  const selectRack = (rackCode: string) => {
    setSelectedRack(rackCode);
    setStep('BIN_MAP');
  };

  // ── Open bin detail modal ────────────────────────────────────────────────────
  const openBinModal = async (bin: BinOccupancyResponse) => {
    // Fetch detail (with inventoryItems)
    try {
      const page = await fetchBinOccupancy({ zoneId: bin.zoneId, size: 500 });
      const fresh = (page.content ?? []).find(b => b.locationId === bin.locationId) ?? bin;
      setModalBin(fresh);
    } catch {
      setModalBin(bin);
    }
  };

  // ── Add to local pending ─────────────────────────────────────────────────────
  const addPending = (skuId: number, skuCode: string, skuName: string, qty: number) => {
    if (!modalBin) return;
    setPending(prev => [...prev, {
      skuId, skuCode, skuName,
      locationId: modalBin.locationId,
      locationCode: modalBin.locationCode,
      qty,
    }]);
    toast.success(`Đã thêm ${qty} × ${skuCode} → ${modalBin.locationCode}`);
    setModalBin(null);
  };

  // ── Submit pending → BE (RESERVE) ───────────────────────────────────────────
  const submitAllocations = async () => {
    if (!task || pending.length === 0) return;
    setSubmitting(true);
    try {
      await allocatePutaway(task.putawayTaskId, pending.map(p => ({
        skuId: p.skuId, locationId: p.locationId, qty: p.qty,
      })));
      toast.success(`Đặt chỗ thành công ${pending.length} mục`);
      const [detail, allocs] = await Promise.all([
        fetchPutawayTask(task.putawayTaskId),
        fetchAllocations(task.putawayTaskId),
      ]);
      setTask(detail);
      setReserved(allocs.filter(a => a.status === 'RESERVED'));
      setPending([]);
      setStep('REVIEW');
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Lỗi khi đặt chỗ');
    } finally { setSubmitting(false); }
  };

  // ── Cancel a reserved allocation ─────────────────────────────────────────────
  const doCancel = (alloc: PutawayAllocationResponse) => {
    confirm({
      title: 'Hủy phân bổ',
      description: `Hủy ${alloc.allocatedQty} × ${alloc.skuCode} tại ${alloc.locationCode}?`,
      variant: 'danger', icon: 'delete', confirmText: 'Hủy phân bổ',
      onConfirm: async () => {
        await cancelAllocation(task!.putawayTaskId, alloc.allocationId);
        const [detail, allocs] = await Promise.all([
          fetchPutawayTask(task!.putawayTaskId),
          fetchAllocations(task!.putawayTaskId),
        ]);
        setTask(detail);
        setReserved(allocs.filter(a => a.status === 'RESERVED'));
        toast.success('Đã hủy phân bổ');
      },
    });
  };

  // ── Confirm ALL ──────────────────────────────────────────────────────────────
  const doConfirm = () => {
    confirm({
      title: 'Xác nhận cất hàng',
      description: `Confirm tất cả ${reserved.length} phân bổ vào bin thực tế?`,
      variant: 'info', icon: 'check_circle', confirmText: 'Xác nhận cất hàng',
      onConfirm: async () => {
        setConfirming(true);
        try {
          await confirmPutawayTask(task!.putawayTaskId);
          toast.success('Putaway hoàn thành!');
          loadTasks();
          setStep('TASK_LIST');
          setTask(null);
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Lỗi xác nhận');
        } finally { setConfirming(false); }
      },
    });
  };

  // ── Back helpers ─────────────────────────────────────────────────────────────
  const goBack = () => {
    if (step === 'BIN_MAP')      setStep('RACK_SELECT');
    else if (step === 'RACK_SELECT') setStep('AISLE_SELECT');
    else if (step === 'AISLE_SELECT') setStep('ZONE_SELECT');
    else if (step === 'ZONE_SELECT') { setStep('TASK_LIST'); setTask(null); }
    else if (step === 'REVIEW')  setStep('AISLE_SELECT');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // SHARED SIDEBAR: task SKU progress (shown on all inner steps)
  // ─────────────────────────────────────────────────────────────────────────────
  const TaskSidebar = () => (
    <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-4 space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <span className="material-symbols-outlined text-[15px] text-indigo-400">assignment</span>
        <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Task #{task?.putawayTaskId}</h3>
      </div>
      {task?.items.map(item => (
        <SkuPill key={item.skuId} item={item} remaining={remainingUnallocated(item)} />
      ))}

      {/* Pending summary */}
      {pending.length > 0 && (
        <div className="mt-1 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">pending_actions</span>
              Chưa gửi ({pending.length})
            </span>
            <button onClick={() => setPending([])} className="text-[10px] text-red-400 hover:text-red-600 font-medium">Xóa hết</button>
          </div>
          <div className="space-y-1">
            {pending.map((p, i) => (
              <div key={i} className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5">
                <div>
                  <span className="text-[11px] font-semibold text-amber-800">{p.skuCode}</span>
                  <span className="text-[10px] text-amber-500 ml-1">→ {p.locationCode}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-amber-700">{p.qty}</span>
                  <button onClick={() => setPending(prev => prev.filter((_, j) => j !== i))}
                    className="text-amber-300 hover:text-red-500 transition-colors">
                    <span className="material-symbols-outlined text-[13px]">close</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button onClick={submitAllocations} disabled={submitting}
            className="w-full mt-2 flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-white rounded-xl disabled:opacity-60 active:scale-95 transition-all"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
            {submitting
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang gửi...</>
              : <><span className="material-symbols-outlined text-[13px]">bookmark</span>Đặt chỗ ({pendingTotal})</>
            }
          </button>
        </div>
      )}

      {/* Quick nav */}
      {step !== 'ZONE_SELECT' && (
        <div className="pt-2 border-t border-gray-100 space-y-1.5">
          {step !== 'REVIEW' && reserved.length > 0 && (
            <button onClick={() => setStep('REVIEW')}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
              <span className="material-symbols-outlined text-[13px]">fact_check</span>
              Xem phân bổ ({reserved.length})
            </button>
          )}
          <button onClick={() => setStep('ZONE_SELECT')}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
            <span className="material-symbols-outlined text-[13px]">swap_horiz</span>
            Đổi zone
          </button>
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // BREADCRUMB
  // ─────────────────────────────────────────────────────────────────────────────
  const Breadcrumb = () => {
    if (step === 'TASK_LIST') return null;
    const crumbs: { label: string; onClick?: () => void }[] = [
      { label: 'Tasks', onClick: () => { setStep('TASK_LIST'); setTask(null); } },
      { label: `Task #${task?.putawayTaskId}` },
    ];
    if (['AISLE_SELECT', 'RACK_SELECT', 'BIN_MAP', 'REVIEW'].includes(step))
      crumbs.push({ label: selectedZone?.zoneCode ?? 'Zone', onClick: () => setStep('ZONE_SELECT') });
    if (['RACK_SELECT', 'BIN_MAP'].includes(step) && selectedAisle)
      crumbs.push({ label: selectedAisle, onClick: () => setStep('AISLE_SELECT') });
    if (step === 'BIN_MAP' && selectedRack)
      crumbs.push({ label: selectedRack });

    return (
      <nav className="flex items-center gap-1.5 text-xs text-gray-500 flex-wrap">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="material-symbols-outlined text-[12px] text-gray-300">chevron_right</span>}
            {c.onClick
              ? <button onClick={c.onClick} className="font-medium text-indigo-600 hover:text-indigo-800 transition-colors">{c.label}</button>
              : <span className="font-semibold text-gray-800">{c.label}</span>
            }
          </span>
        ))}
      </nav>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-sans space-y-4 page-enter">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Putaway — Cất hàng vào kho</h1>
          <p className="mt-0.5 text-sm text-gray-500">Chọn zone → dãy → kệ → bin để phân bổ hàng.</p>
        </div>
        {step !== 'TASK_LIST' && (
          <button onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors self-start">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại
          </button>
        )}
      </div>

      {/* Breadcrumb */}
      {step !== 'TASK_LIST' && <Breadcrumb />}

      {/* ══════════════════════════════════════════════════════
          STEP 1 — TASK LIST
      ══════════════════════════════════════════════════════ */}
      {step === 'TASK_LIST' && (
        <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Danh sách Putaway Task</h3>
              <p className="text-xs text-gray-400 mt-0.5">Manager duyệt GRN xong, task sẽ xuất hiện ở đây</p>
            </div>
            <button onClick={loadTasks} className="flex items-center gap-1.5 text-xs text-indigo-600 font-medium hover:text-indigo-800">
              <span className="material-symbols-outlined text-[14px]">refresh</span>Tải lại
            </button>
          </div>
          {loadingTasks ? (
            <div className="flex justify-center py-16">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <span className="material-symbols-outlined text-gray-200 text-[48px]">inventory_2</span>
              <p className="text-sm text-gray-400">Không có task nào đang mở</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map(t => (
                <div key={t.putawayTaskId}
                  className={`flex items-center justify-between px-5 py-4 transition-colors group
                    ${t.status !== 'DONE' ? 'hover:bg-indigo-50/30 cursor-pointer' : 'opacity-60'}`}
                  onClick={() => t.status !== 'DONE' && openTask(t)}>
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${t.status === 'DONE' ? 'bg-emerald-50' : t.status === 'IN_PROGRESS' ? 'bg-amber-50' : 'bg-indigo-50'}`}>
                      <span className={`material-symbols-outlined text-[20px]
                        ${t.status === 'DONE' ? 'text-emerald-500' : t.status === 'IN_PROGRESS' ? 'text-amber-500' : 'text-indigo-400'}`}>
                        {t.status === 'DONE' ? 'check_circle' : 'inventory_2'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Task #{t.putawayTaskId}</p>
                      <p className="text-xs text-gray-400 mt-0.5">GRN #{t.grnId} · Kho #{t.warehouseId}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={t.status} />
                    {t.status !== 'DONE' && (
                      <span className="material-symbols-outlined text-[16px] text-gray-200 group-hover:text-indigo-400 transition-colors">chevron_right</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 2 — ZONE SELECT
      ══════════════════════════════════════════════════════ */}
      {step === 'ZONE_SELECT' && task && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <TaskSidebar />
          <div className="lg:col-span-3 bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Chọn Zone</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Mỗi zone gồm nhiều dãy (Aisle), mỗi dãy gồm nhiều kệ (Rack), mỗi kệ gồm các ô (Bin)</p>
                </div>
                {suggestedZoneIds.size > 0 && (
                  <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 flex-shrink-0">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px]">recommend</span>
                    <p className="text-[11px] font-semibold text-emerald-700">
                      {suggestedZoneIds.size} zone được gợi ý theo FEFO
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {zones.length === 0
                ? <p className="col-span-3 text-sm text-gray-400 text-center py-10">Không có zone nào</p>
                : zones.map(zone => {
                  const isSuggested = suggestedZoneIds.has(zone.zoneId);
                  const zoneSuggs   = suggByZone[zone.zoneId] ?? [];
                  // Unique SKUs suggested for this zone
                  const suggSkus    = [...new Set(zoneSuggs.map(s => s.skuCode))];
                  const availCap    = zoneSuggs.reduce((s, sg) => s + sg.availableCapacity, 0);
                  return (
                    <button key={zone.zoneId} onClick={() => selectZone(zone)}
                      className={`group p-5 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95 relative
                        ${isSuggested
                          ? 'border-emerald-400 bg-emerald-50/60 hover:border-emerald-500 hover:bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'
                        }`}>

                      {/* Suggested badge */}
                      {isSuggested && (
                        <div className="absolute -top-2.5 left-3 flex items-center gap-1 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <span className="material-symbols-outlined text-[11px]">recommend</span>
                          Gợi ý
                        </div>
                      )}

                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 transition-colors
                        ${isSuggested ? 'bg-emerald-100 group-hover:bg-emerald-200' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                        <span className={`material-symbols-outlined text-[22px] transition-colors
                          ${isSuggested ? 'text-emerald-600' : 'text-gray-500 group-hover:text-indigo-600'}`}>warehouse</span>
                      </div>

                      <p className="text-sm font-bold text-gray-800">{zone.zoneCode}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5 truncate">{zone.zoneName}</p>

                      {/* Suggestion detail */}
                      {isSuggested && (
                        <div className="mt-2.5 space-y-1">
                          <div className="flex flex-wrap gap-1">
                            {suggSkus.slice(0, 3).map(sku => (
                              <span key={sku} className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{sku}</span>
                            ))}
                            {suggSkus.length > 3 && (
                              <span className="text-[10px] text-emerald-600">+{suggSkus.length - 3}</span>
                            )}
                          </div>
                          <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[11px]">inventory_2</span>
                            {zoneSuggs.length} bin · còn {availCap} chỗ
                          </p>
                        </div>
                      )}

                      {!isSuggested && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] text-indigo-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined text-[13px]">arrow_forward</span>Vào zone
                        </div>
                      )}
                    </button>
                  );
                })
              }
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 3 — AISLE SELECT
      ══════════════════════════════════════════════════════ */}
      {step === 'AISLE_SELECT' && task && selectedZone && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <TaskSidebar />
          <div className="lg:col-span-3 bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Zone <span className="text-indigo-600">{selectedZone.zoneCode}</span> — Chọn Dãy (Aisle)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{aisles.length} dãy · Click vào dãy để xem các kệ bên trong</p>
            </div>
            {loadingBins ? (
              <div className="flex justify-center py-16">
                <span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span>
              </div>
            ) : aisles.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[48px]">grid_off</span>
                <p className="text-sm text-gray-400">Zone này chưa có dãy nào</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {aisles.map(aisle => {
                  const binsInAisle = allBins.filter(b => b.grandParentLocationCode === aisle);
                  const emptyCount  = binsInAisle.filter(b => b.occupancyStatus === 'EMPTY').length;
                  const fullCount   = binsInAisle.filter(b => b.occupancyStatus === 'FULL').length;
                  return (
                    <button key={aisle} onClick={() => selectAisle(aisle)}
                      className="group p-4 rounded-2xl border-2 border-gray-200 bg-white text-left transition-all hover:border-indigo-400 hover:bg-indigo-50/50 hover:shadow-md active:scale-95">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-indigo-100 flex items-center justify-center mb-2.5 transition-colors">
                        <span className="material-symbols-outlined text-[20px] text-gray-500 group-hover:text-indigo-600 transition-colors">view_column</span>
                      </div>
                      <p className="text-sm font-bold text-gray-800">{aisle}</p>
                      <div className="flex gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">{emptyCount} trống</span>
                        {fullCount > 0 && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{fullCount} đầy</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 4 — RACK SELECT
      ══════════════════════════════════════════════════════ */}
      {step === 'RACK_SELECT' && task && selectedZone && selectedAisle && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <TaskSidebar />
          <div className="lg:col-span-3 bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                Dãy <span className="text-indigo-600">{selectedAisle}</span> — Chọn Kệ (Rack)
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{racks.length} kệ · Click vào kệ để xem các ô bin</p>
            </div>
            {racks.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[48px]">shelves</span>
                <p className="text-sm text-gray-400">Dãy này chưa có kệ nào</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {racks.map(rack => {
                  const binsInR = allBins.filter(b => b.grandParentLocationCode === selectedAisle && b.parentLocationCode === rack);
                  const emptyCount   = binsInR.filter(b => b.occupancyStatus === 'EMPTY').length;
                  const partialCount = binsInR.filter(b => b.occupancyStatus === 'PARTIAL').length;
                  const fullCount    = binsInR.filter(b => b.occupancyStatus === 'FULL').length;
                  const hasPending   = binsInR.some(b => pending.some(p => p.locationId === b.locationId));
                  return (
                    <button key={rack} onClick={() => selectRack(rack)}
                      className={`group p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95
                        ${hasPending ? 'border-amber-400 bg-amber-50' : 'border-gray-200 bg-white hover:border-indigo-400 hover:bg-indigo-50/50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2.5 transition-colors
                        ${hasPending ? 'bg-amber-100' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                        <span className={`material-symbols-outlined text-[20px] transition-colors
                          ${hasPending ? 'text-amber-600' : 'text-gray-500 group-hover:text-indigo-600'}`}>shelves</span>
                      </div>
                      <p className={`text-sm font-bold ${hasPending ? 'text-amber-800' : 'text-gray-800'}`}>{rack}</p>
                      <div className="flex gap-1.5 mt-1.5 flex-wrap">
                        {emptyCount > 0   && <span className="text-[10px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded-full font-medium border border-gray-200">{emptyCount} trống</span>}
                        {partialCount > 0 && <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full font-medium">{partialCount} đang dùng</span>}
                        {fullCount > 0    && <span className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full font-medium">{fullCount} đầy</span>}
                      </div>
                      {hasPending && (
                        <div className="mt-1.5 text-[10px] text-amber-700 font-semibold flex items-center gap-0.5">
                          <span className="material-symbols-outlined text-[11px]">pending</span>Đã chọn hàng
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 5 — BIN MAP (Floor Plan)
      ══════════════════════════════════════════════════════ */}
      {step === 'BIN_MAP' && task && selectedZone && selectedAisle && selectedRack && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <TaskSidebar />
          <div className="lg:col-span-3 bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Kệ <span className="text-indigo-600">{selectedRack}</span> — Chọn Ô BIN
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Click vào bin để xem nội dung và đặt hàng vào</p>
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 text-[11px]">
                {[
                  { label: 'Trống', bg: 'bg-white border border-gray-200' },
                  { label: 'Đang dùng', bg: 'bg-blue-100' },
                  { label: 'Đầy', bg: 'bg-red-200' },
                  { label: 'Đã chọn', bg: 'bg-amber-200' },
                ].map(({ label, bg }) => (
                  <span key={label} className="flex items-center gap-1 text-gray-500">
                    <span className={`w-3 h-3 rounded ${bg} inline-block`} />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {binsInRack.length === 0 ? (
              <div className="flex flex-col items-center py-16 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[48px]">grid_off</span>
                <p className="text-sm text-gray-400">Kệ này chưa có bin nào</p>
              </div>
            ) : (
              <div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2.5">
                {binsInRack.map(bin => {
                  const hasPending = pending.some(p => p.locationId === bin.locationId);
                  const isFull     = bin.occupancyStatus === 'FULL';
                  const isPartial  = bin.occupancyStatus === 'PARTIAL';
                  const pctFull    = pct(Number(bin.occupiedQty) + Number(bin.reservedQty), Number(bin.maxWeightKg));

                  let bgClass     = 'bg-white border-gray-200 hover:border-indigo-400 hover:bg-indigo-50/40';
                  let textClass   = 'text-gray-500';
                  let barClass    = 'bg-gray-300';
                  if (hasPending) { bgClass = 'bg-amber-50 border-amber-400';  textClass = 'text-amber-700'; barClass = 'bg-amber-400'; }
                  else if (isFull)    { bgClass = 'bg-red-50 border-red-300 opacity-60';   textClass = 'text-red-500'; barClass = 'bg-red-400'; }
                  else if (isPartial) { bgClass = 'bg-blue-50 border-blue-200'; textClass = 'text-blue-700'; barClass = 'bg-blue-400'; }

                  return (
                    <button key={bin.locationId}
                      onClick={() => !isFull && openBinModal(bin)}
                      title={suggByBin[bin.locationId] ? `Gợi ý: ${suggByBin[bin.locationId].reason}` : undefined}
                      disabled={isFull}
                      title={isFull ? 'Bin đã đầy' : `${bin.locationCode} — click để xem & đặt hàng`}
                      className={`group relative rounded-xl p-2.5 text-left border-2 transition-all active:scale-95 disabled:cursor-not-allowed ${bgClass}`}>
                      <p className={`text-[11px] font-bold truncate mb-1.5 ${textClass}`}>{bin.locationCode}</p>
                      {/* Mini progress bar */}
                      {suggByBin[bin.locationId] && (
                        <div className="absolute top-1 right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full flex items-center justify-center shadow-sm">
                          <span className="material-symbols-outlined text-white text-[9px]">star</span>
                        </div>
                      )}
                      <div className="h-1 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pctFull}%` }} />
                      </div>
                      <p className="text-[9px] text-gray-400">{Number(bin.occupiedQty).toFixed(0)}/{bin.maxWeightKg ?? '∞'}</p>
                      {hasPending && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center">
                          <span className="material-symbols-outlined text-white text-[10px]">add</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          STEP 6 — REVIEW & CONFIRM
      ══════════════════════════════════════════════════════ */}
      {step === 'REVIEW' && task && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">fact_check</span>
                Tổng kết phân bổ
              </h3>
              <div className="space-y-3">
                {task.items.map(item => {
                  const pctDone = pct(item.allocatedQty + item.putawayQty, item.quantity);
                  return (
                    <div key={item.skuId} className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-700">{item.skuCode}</span>
                        <span className={`font-medium ${pctDone === 100 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {item.allocatedQty + item.putawayQty}/{item.quantity}
                        </span>
                      </div>
                      <ProgressBar value={pctDone} colorClass={pctDone === 100 ? 'bg-emerald-500' : 'bg-indigo-500'} />
                    </div>
                  );
                })}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gray-100">
                <div className="bg-indigo-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-extrabold text-indigo-700">{reserved.length}</p>
                  <p className="text-[11px] text-indigo-500">Phân bổ RESERVED</p>
                </div>
                <div className={`rounded-xl p-3 text-center ${allItemsDone ? 'bg-emerald-50' : 'bg-amber-50'}`}>
                  <p className={`text-lg font-extrabold ${allItemsDone ? 'text-emerald-700' : 'text-amber-700'}`}>
                    {task.items.filter(i => remainingUnallocated(i) === 0).length}/{task.items.length}
                  </p>
                  <p className={`text-[11px] ${allItemsDone ? 'text-emerald-500' : 'text-amber-500'}`}>SKU hoàn thành</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={() => setStep('ZONE_SELECT')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Tiếp tục phân bổ
              </button>
              {reserved.length > 0 && (
                <button onClick={doConfirm} disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-60 active:scale-95 transition-all"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.25)' }}>
                  {confirming
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang xác nhận...</>
                    : <><span className="material-symbols-outlined text-[18px]">check_circle</span>Confirm cất hàng ({reserved.length})</>
                  }
                </button>
              )}
              {!allItemsDone && (
                <p className="text-[11px] text-amber-600 text-center flex items-center justify-center gap-1">
                  <span className="material-symbols-outlined text-[13px]">warning</span>
                  Còn {task.items.filter(i => remainingUnallocated(i) > 0).length} SKU chưa phân bổ hết
                </p>
              )}
            </div>
          </div>

          {/* Reserved allocations list */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Phân bổ đã RESERVED ({reserved.length})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Nhấn Confirm để di chuyển hàng vào bin thực tế và hoàn thành task</p>
              </div>
              {reserved.length === 0 ? (
                <div className="flex flex-col items-center py-16 gap-2">
                  <span className="material-symbols-outlined text-gray-200 text-[40px]">inbox</span>
                  <p className="text-sm text-gray-400">Chưa có phân bổ nào</p>
                  <button onClick={() => setStep('ZONE_SELECT')} className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 mt-1">
                    Bắt đầu phân bổ →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {reserved.map(alloc => (
                    <div key={alloc.allocationId} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-indigo-400">inventory_2</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {alloc.skuCode}
                            <span className="text-gray-400 font-normal text-xs ml-1">→ {alloc.locationCode}</span>
                          </p>
                          <p className="text-[11px] text-gray-400 mt-0.5">{alloc.skuName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-bold text-indigo-700">{alloc.allocatedQty}</p>
                          <p className="text-[10px] text-gray-400">thùng</p>
                        </div>
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100">RESERVED</span>
                        <button onClick={() => doCancel(alloc)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Bin Detail Modal ── */}
      {modalBin && task && (
        <BinDetailModal
          bin={modalBin}
          task={task}
          pendingForBin={pending.filter(p => p.locationId === modalBin.locationId)}
          onClose={() => setModalBin(null)}
          onAdd={addPending}
          remainingFn={remainingUnallocated}
        />
      )}
    </div>
  );
}
