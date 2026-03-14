'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  fetchPutawayTasks,
  fetchPutawayTask,
  fetchBinOccupancy,
  fetchAllocations,
  fetchPutawaySuggestions,
  allocatePutaway,
  cancelAllocation,
  confirmPutawayTask,
  type PutawayTaskResponse,
  type PutawayTaskItemDto,
  type BinOccupancyResponse,
  type PutawayAllocationResponse,
  type PutawaySuggestion,
} from '@/services/putawayService';
import { fetchZones } from '@/services/zoneService';
import type { Zone } from '@/interfaces/zone';
import { useConfirm } from '@/components/ui/ModalProvider';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = 'TASK_LIST' | 'ZONE_SELECT' | 'BIN_MAP' | 'ALLOCATE' | 'REVIEW';

interface PendingAlloc {
  skuId: number;
  skuCode: string;
  skuName: string;
  locationId: number;
  locationCode: string;
  qty: number;
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function occupancyColor(status: string) {
  if (status === 'EMPTY')   return { bg: '#f0fdf4', border: '#86efac', text: '#15803d', bar: '#22c55e' };
  if (status === 'PARTIAL') return { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', bar: '#f59e0b' };
  return                           { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', bar: '#ef4444' };
}

function pct(occ: number, max: number | null) {
  if (!max || max === 0) return 0;
  return Math.min(100, Math.round((occ / max) * 100));
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden', marginTop: 6 }}>
      <div style={{ height: '100%', width: `${value}%`, background: color, borderRadius: 99, transition: 'width .4s' }} />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING:     'bg-gray-100 text-gray-600',
    OPEN:        'bg-blue-50 text-blue-700',
    IN_PROGRESS: 'bg-amber-50 text-amber-700',
    DONE:        'bg-emerald-50 text-emerald-700',
  };
  const labels: Record<string, string> = {
    PENDING: 'Chờ', OPEN: 'Mở', IN_PROGRESS: 'Đang làm', DONE: 'Hoàn thành',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${map[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {labels[status] ?? status}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PutawayPage() {
  const confirm = useConfirm();

  // ── State ──
  const [step, setStep]                   = useState<Step>('TASK_LIST');
  const [tasks, setTasks]                 = useState<PutawayTaskResponse[]>([]);
  const [loadingTasks, setLoadingTasks]   = useState(true);

  const [task, setTask]                   = useState<PutawayTaskResponse | null>(null);
  const [zones, setZones]                 = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone]   = useState<Zone | null>(null);
  const [bins, setBins]                   = useState<BinOccupancyResponse[]>([]);
  const [loadingBins, setLoadingBins]     = useState(false);
  const [selectedBin, setSelectedBin]     = useState<BinOccupancyResponse | null>(null);

  // For allocate form: which sku + qty
  const [activeSku, setActiveSku]         = useState<PutawayTaskItemDto | null>(null);
  const [qtyInput, setQtyInput]           = useState('');

  // Pending (not yet sent to BE) allocations staged locally
  const [pending, setPending]             = useState<PendingAlloc[]>([]);
  // RESERVED allocations already on BE
  const [reserved, setReserved]           = useState<PutawayAllocationResponse[]>([]);
  const [suggestions, setSuggestions]     = useState<PutawaySuggestion[]>([]);

  const [submitting, setSubmitting]       = useState(false);
  const [confirming, setConfirming]       = useState(false);

  // ── Load task list ─────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const page = await fetchPutawayTasks({ size: 50 });
      setTasks(page.content ?? []);
    } catch { toast.error('Không tải được danh sách task'); }
    finally { setLoadingTasks(false); }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  // ── Open a task ────────────────────────────────────────────────────────────
  const openTask = async (t: PutawayTaskResponse) => {
    try {
      const detail = await fetchPutawayTask(t.putawayTaskId);
      const [allocs, suggs] = await Promise.all([
        fetchAllocations(detail.putawayTaskId).catch(() => []),
        fetchPutawaySuggestions(detail.putawayTaskId).catch(() => []),
      ]);
      setTask(detail);
      setReserved(allocs.filter(a => a.status === 'RESERVED'));
      setSuggestions(suggs);
      setPending([]);
      setSelectedZone(null);
      setSelectedBin(null);
      setActiveSku(null);

      // Load zones for this warehouse
      const zList = await fetchZones({ warehouseId: detail.warehouseId, activeOnly: true })
        .catch(() => []);
      setZones(zList);

      setStep('ZONE_SELECT');
    } catch { toast.error('Không tải được task'); }
  };

  // ── Select zone → load bins ────────────────────────────────────────────────
  const selectZone = async (zone: Zone) => {
    setSelectedZone(zone);
    setLoadingBins(true);
    try {
      const page = await fetchBinOccupancy({ zoneId: zone.zoneId, size: 200 });
      setBins(page.content ?? []);
    } catch { toast.error('Không tải được bins'); }
    finally { setLoadingBins(false); }
    setSelectedBin(null);
    setActiveSku(null);
    setStep('BIN_MAP');
  };

  // ── Select bin → pick sku and qty ─────────────────────────────────────────
  const selectBin = (bin: BinOccupancyResponse) => {
    if (bin.occupancyStatus === 'FULL') { toast.error('Bin này đã đầy'); return; }
    setSelectedBin(bin);
    // Auto-select first sku with remaining qty
    const first = task?.items.find(i => remainingUnallocated(i) > 0) ?? null;
    setActiveSku(first);
    setQtyInput('');
    setStep('ALLOCATE');
  };

  // ── Remaining unallocated = quantity - putawayQty - allocatedQty(BE) - pending(local) ──
  const remainingUnallocated = (item: PutawayTaskItemDto) => {
    const localPending = pending
      .filter(p => p.skuId === item.skuId)
      .reduce((s, p) => s + p.qty, 0);
    return Math.max(0, item.remainingQty - localPending);
  };

  // ── Add to local pending ───────────────────────────────────────────────────
  const addPending = () => {
    if (!activeSku || !selectedBin) return;
    const qty = parseFloat(qtyInput);
    if (!qty || qty <= 0) { toast.error('Số lượng không hợp lệ'); return; }

    const maxAllowed = remainingUnallocated(activeSku);
    if (qty > maxAllowed) { toast.error(`Tối đa ${maxAllowed} thùng cho SKU này`); return; }

    const binAvail = selectedBin.availableQty ?? (selectedBin.maxWeightKg ?? 9999) - selectedBin.occupiedQty - selectedBin.reservedQty;
    // Also subtract local pending already assigned to this bin
    const binPending = pending.filter(p => p.locationId === selectedBin.locationId).reduce((s, p) => s + p.qty, 0);
    if (qty > binAvail - binPending) {
      toast.error(`Bin chỉ còn ${Math.max(0, binAvail - binPending)} slot`); return;
    }

    setPending(prev => [...prev, {
      skuId: activeSku.skuId,
      skuCode: activeSku.skuCode,
      skuName: activeSku.skuName,
      locationId: selectedBin.locationId,
      locationCode: selectedBin.locationCode,
      qty,
    }]);

    setQtyInput('');

    // Move to next sku automatically if this one is done
    const newRemaining = maxAllowed - qty;
    if (newRemaining <= 0) {
      const nextSku = task?.items.find(i => i.skuId !== activeSku.skuId && remainingUnallocated(i) > 0) ?? null;
      setActiveSku(nextSku);
    }
    toast.success(`Đã thêm ${qty} × ${activeSku.skuCode} → ${selectedBin.locationCode}`);
  };

  // ── Submit pending to BE (allocate) ───────────────────────────────────────
  const submitAllocations = async () => {
    if (!task || pending.length === 0) return;
    setSubmitting(true);
    try {
      await allocatePutaway(task.putawayTaskId, pending.map(p => ({
        skuId: p.skuId,
        locationId: p.locationId,
        qty: p.qty,
      })));
      toast.success(`Đặt chỗ thành công ${pending.length} mục`);
      // Reload
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

  // ── Cancel a reserved allocation ──────────────────────────────────────────
  const doCancel = (alloc: PutawayAllocationResponse) => {
    confirm({
      title: 'Hủy phân bổ',
      description: `Hủy ${alloc.allocatedQty} × ${alloc.skuCode} tại ${alloc.locationCode}?`,
      variant: 'danger',
      icon: 'delete',
      confirmText: 'Hủy phân bổ',
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

  // ── Confirm all ────────────────────────────────────────────────────────────
  const doConfirm = () => {
    confirm({
      title: 'Xác nhận cất hàng',
      description: `Confirm tất cả ${reserved.length} phân bổ RESERVED vào bin thực tế?`,
      variant: 'info',
      icon: 'check_circle',
      confirmText: 'Xác nhận cất hàng',
      onConfirm: async () => {
        setConfirming(true);
        try {
          await confirmPutawayTask(task!.putawayTaskId);
          toast.success('Putaway hoàn thành!');
          loadTasks();
          setStep('TASK_LIST');
        } catch (e: any) {
          toast.error(e?.response?.data?.message ?? 'Lỗi xác nhận');
        } finally { setConfirming(false); }
      },
    });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render helpers
  // ─────────────────────────────────────────────────────────────────────────

  const allItemsDone = task?.items.every(i => remainingUnallocated(i) === 0 && i.remainingQty === 0);
  const pendingTotal = pending.reduce((s, p) => s + p.qty, 0);

  // ─────────────────────────────────────────────────────────────────────────
  // BREADCRUMB
  // ─────────────────────────────────────────────────────────────────────────
  const STEPS_LABEL: Record<Step, string> = {
    TASK_LIST:   'Danh sách Task',
    ZONE_SELECT: 'Chọn Zone',
    BIN_MAP:     'Biểu đồ Bin',
    ALLOCATE:    'Điền hàng',
    REVIEW:      'Xem & Xác nhận',
  };

  const STEPS_ORDER: Step[] = ['TASK_LIST', 'ZONE_SELECT', 'BIN_MAP', 'ALLOCATE', 'REVIEW'];
  const stepIdx = STEPS_ORDER.indexOf(step);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="w-full font-sans space-y-5 page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Putaway — Cất hàng vào kho</h1>
          <p className="mt-0.5 text-sm text-gray-500">Phân bổ hàng từ staging → bin, sau đó confirm một lần.</p>
        </div>
        {step !== 'TASK_LIST' && (
          <button
            onClick={() => { setStep('TASK_LIST'); setTask(null); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Về danh sách
          </button>
        )}
      </div>

      {/* ── Stepper (khi đang trong 1 task) ── */}
      {step !== 'TASK_LIST' && (
        <div className="flex items-center gap-0 bg-white rounded-2xl border border-indigo-100/60 px-6 py-3 shadow-sm overflow-x-auto">
          {STEPS_ORDER.filter(s => s !== 'TASK_LIST').map((s, i, arr) => {
            const idx = STEPS_ORDER.indexOf(s);
            const done = stepIdx > idx;
            const active = step === s;
            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center min-w-[90px]">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all
                    ${done ? 'bg-indigo-600 text-white' : active ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-400' : 'bg-gray-100 text-gray-400'}`}>
                    {done ? <span className="material-symbols-outlined text-[15px]">check</span> : i + 1}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium ${active ? 'text-indigo-700' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                    {STEPS_LABEL[s]}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div className={`w-8 h-0.5 mb-4 mx-1 rounded ${done ? 'bg-indigo-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 1 — TASK LIST
      ════════════════════════════════════════════════════ */}
      {step === 'TASK_LIST' && (
        <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Danh sách Putaway Task</h3>
              <p className="text-xs text-gray-400 mt-0.5">Chọn task để bắt đầu cất hàng</p>
            </div>
            <button onClick={loadTasks} className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              <span className="material-symbols-outlined text-[14px]">refresh</span> Tải lại
            </button>
          </div>
          {loadingTasks ? (
            <div className="flex justify-center items-center py-16">
              <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">progress_activity</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-2">
              <span className="material-symbols-outlined text-gray-200 text-[48px]">inventory_2</span>
              <p className="text-sm text-gray-400">Không có task nào</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {tasks.map(t => (
                <div key={t.putawayTaskId}
                  className="flex items-center justify-between px-5 py-4 hover:bg-indigo-50/30 transition-colors group cursor-pointer"
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
                      <span className="material-symbols-outlined text-[16px] text-indigo-200 group-hover:text-indigo-500 transition-colors">chevron_right</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 2 — ZONE SELECT
      ════════════════════════════════════════════════════ */}
      {step === 'ZONE_SELECT' && task && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Task summary */}
          <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-indigo-400">assignment</span>
              Task #{task.putawayTaskId}
            </h3>
            <div className="space-y-2">
              {task.items.map(item => {
                const rem = remainingUnallocated(item);
                const done = rem === 0 && item.remainingQty === 0;
                return (
                  <div key={item.skuId}
                    className={`rounded-xl p-3 border ${done ? 'bg-emerald-50 border-emerald-100' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-gray-800">{item.skuCode}</span>
                      {done
                        ? <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1"><span className="material-symbols-outlined text-[11px]">check_circle</span>Xong</span>
                        : <span className="text-[10px] text-amber-600 font-semibold">Còn {rem}</span>
                      }
                    </div>
                    <p className="text-[11px] text-gray-400 truncate">{item.skuName}</p>
                    <ProgressBar value={pct(item.quantity - rem, item.quantity)} color={done ? '#22c55e' : '#f59e0b'} />
                    <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                      <span>Đã phân bổ: {item.quantity - rem}</span>
                      <span>Tổng: {item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Zone grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Chọn Zone để vào cất hàng</h3>
                <p className="text-xs text-gray-400 mt-0.5">Mỗi zone chứa nhiều bin. Chọn zone phù hợp theo loại hàng.</p>
              </div>
              {/* AI suggestion hint */}
              {suggestions.length > 0 && (
                <div className="px-5 py-3 bg-indigo-50/60 border-b border-indigo-100/50 flex flex-wrap gap-2">
                  <span className="text-[11px] text-indigo-500 font-semibold flex items-center gap-1 mr-1">
                    <span className="material-symbols-outlined text-[13px]">auto_awesome</span>AI gợi ý:
                  </span>
                  {suggestions.map(s => s.matchedZoneCode && (
                    <span key={s.skuId} className="text-[11px] bg-white border border-indigo-200 rounded-full px-2.5 py-0.5 text-indigo-700 font-medium">
                      {s.skuCode} → {s.matchedZoneCode}
                    </span>
                  ))}
                </div>
              )}
              <div className="p-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {zones.length === 0 && (
                  <p className="col-span-3 text-sm text-gray-400 text-center py-8">Không có zone nào</p>
                )}
                {zones.map(zone => {
                  const suggested = suggestions.some(s => s.matchedZoneId === zone.zoneId);
                  return (
                    <button key={zone.zoneId} onClick={() => selectZone(zone)}
                      className={`group p-4 rounded-2xl border-2 text-left transition-all hover:shadow-md active:scale-95
                        ${suggested ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50'}`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3
                        ${suggested ? 'bg-indigo-600' : 'bg-gray-100 group-hover:bg-indigo-100'}`}>
                        <span className={`material-symbols-outlined text-[20px] ${suggested ? 'text-white' : 'text-gray-500 group-hover:text-indigo-600'}`}>
                          warehouse
                        </span>
                      </div>
                      <p className={`text-sm font-bold ${suggested ? 'text-indigo-800' : 'text-gray-800'}`}>{zone.zoneCode}</p>
                      <p className={`text-[11px] mt-0.5 truncate ${suggested ? 'text-indigo-500' : 'text-gray-400'}`}>{zone.zoneName}</p>
                      {suggested && (
                        <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">
                          <span className="material-symbols-outlined text-[11px]">auto_awesome</span>Gợi ý
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 3 — BIN MAP
      ════════════════════════════════════════════════════ */}
      {step === 'BIN_MAP' && task && selectedZone && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* SKU summary sidebar */}
          <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5 space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] text-indigo-400">list_alt</span>
              Hàng cần cất
            </h3>
            {task.items.map(item => {
              const rem = remainingUnallocated(item);
              return (
                <div key={item.skuId} className={`rounded-xl p-3 border text-xs ${rem === 0 ? 'bg-emerald-50 border-emerald-100 opacity-60' : 'bg-gray-50 border-gray-100'}`}>
                  <div className="flex justify-between font-semibold text-gray-800 mb-0.5">
                    <span>{item.skuCode}</span>
                    <span className={rem === 0 ? 'text-emerald-600' : 'text-amber-600'}>{rem === 0 ? '✓ Xong' : `Còn ${rem}`}</span>
                  </div>
                  <p className="text-gray-400 truncate">{item.skuName}</p>
                </div>
              );
            })}
            <button onClick={() => setStep('ZONE_SELECT')}
              className="w-full mt-2 flex items-center justify-center gap-1.5 text-xs text-indigo-600 font-semibold py-2 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors">
              <span className="material-symbols-outlined text-[14px]">swap_horiz</span>
              Đổi zone khác
            </button>
          </div>

          {/* Bin grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Zone: {selectedZone.zoneCode} — {selectedZone.zoneName}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Click vào bin để điền hàng vào đó</p>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  {[['EMPTY', '#22c55e'], ['PARTIAL', '#f59e0b'], ['FULL', '#ef4444']].map(([s, c]) => (
                    <span key={s} className="flex items-center gap-1 text-gray-500">
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, display: 'inline-block' }} />
                      {s === 'EMPTY' ? 'Trống' : s === 'PARTIAL' ? 'Đang dùng' : 'Đầy'}
                    </span>
                  ))}
                </div>
              </div>

              {loadingBins ? (
                <div className="flex justify-center py-12">
                  <span className="material-symbols-outlined animate-spin text-indigo-400 text-[32px]">progress_activity</span>
                </div>
              ) : bins.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2">
                  <span className="material-symbols-outlined text-gray-200 text-[48px]">grid_off</span>
                  <p className="text-sm text-gray-400">Không có bin trong zone này</p>
                </div>
              ) : (
                <div className="p-5 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2.5">
                  {bins.map(bin => {
                    const c = occupancyColor(bin.occupancyStatus);
                    const pctFull = pct(bin.occupiedQty + bin.reservedQty, bin.maxWeightKg);
                    const isPending = pending.some(p => p.locationId === bin.locationId);
                    return (
                      <button key={bin.locationId}
                        onClick={() => selectBin(bin)}
                        disabled={bin.occupancyStatus === 'FULL'}
                        className="group rounded-xl p-2.5 text-left border-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                          background: isPending ? '#eef2ff' : c.bg,
                          borderColor: isPending ? '#6366f1' : c.border,
                        }}>
                        <div className="text-[11px] font-bold truncate mb-1" style={{ color: isPending ? '#4f46e5' : c.text }}>
                          {bin.locationCode}
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pctFull}%`, background: isPending ? '#6366f1' : c.bar, borderRadius: 99 }} />
                        </div>
                        <div className="text-[9px] text-gray-400 mt-1">
                          {bin.occupiedQty}/{bin.maxWeightKg ?? '∞'}
                        </div>
                        {isPending && (
                          <div className="text-[9px] text-indigo-600 font-bold mt-0.5 flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[9px]">pending</span>Đã thêm
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 4 — ALLOCATE (Điền hàng vào bin)
      ════════════════════════════════════════════════════ */}
      {step === 'ALLOCATE' && task && selectedBin && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Bin info */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Bin đang chọn</h3>
              {(() => {
                const c = occupancyColor(selectedBin.occupancyStatus);
                const pctFull = pct(selectedBin.occupiedQty + selectedBin.reservedQty, selectedBin.maxWeightKg);
                return (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: c.bg, border: `2px solid ${c.border}` }}>
                        <span className="material-symbols-outlined text-[24px]" style={{ color: c.text }}>inventory</span>
                      </div>
                      <div>
                        <p className="text-base font-extrabold text-gray-900">{selectedBin.locationCode}</p>
                        <p className="text-xs text-gray-400">{selectedBin.grandParentLocationCode} / {selectedBin.parentLocationCode}</p>
                      </div>
                    </div>
                    <ProgressBar value={pctFull} color={c.bar} />
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      {[
                        { label: 'Max', val: selectedBin.maxWeightKg ?? '∞' },
                        { label: 'Đang chiếm', val: selectedBin.occupiedQty },
                        { label: 'Còn trống', val: selectedBin.availableQty ?? '?' },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-gray-50 rounded-xl p-2">
                          <p className="text-[11px] text-gray-400">{label}</p>
                          <p className="text-sm font-bold text-gray-800">{val}</p>
                        </div>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>

            {/* Back to bin map */}
            <button onClick={() => setStep('BIN_MAP')}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
              <span className="material-symbols-outlined text-[16px]">grid_view</span>
              Chọn bin khác
            </button>
          </div>

          {/* Allocate form */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Điền hàng vào {selectedBin.locationCode}</h3>
                <p className="text-xs text-gray-400 mt-0.5">Chọn SKU, nhập số lượng, bấm Thêm. Lặp lại đến hết.</p>
              </div>
              <div className="p-5 space-y-4">

                {/* SKU selector */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {task.items.map(item => {
                    const rem = remainingUnallocated(item);
                    const active = activeSku?.skuId === item.skuId;
                    return (
                      <button key={item.skuId}
                        onClick={() => { setActiveSku(item); setQtyInput(''); }}
                        disabled={rem === 0}
                        className={`text-left p-3 rounded-xl border-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                          ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:border-indigo-300'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${active ? 'text-indigo-800' : 'text-gray-700'}`}>{item.skuCode}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${rem === 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {rem === 0 ? '✓ Xong' : `Còn ${rem}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{item.skuName}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Qty input */}
                {activeSku && (
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1.5">
                      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                        Số lượng — {activeSku.skuCode} (tối đa: {remainingUnallocated(activeSku)})
                      </label>
                      <input
                        type="number" min={1} max={remainingUnallocated(activeSku)}
                        value={qtyInput}
                        onChange={e => setQtyInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addPending()}
                        placeholder={`1 – ${remainingUnallocated(activeSku)}`}
                        className="w-full px-3.5 py-2.5 text-sm border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                        autoFocus
                      />
                    </div>
                    <button onClick={addPending}
                      disabled={!qtyInput || parseFloat(qtyInput) <= 0}
                      className="h-10 px-5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 flex items-center gap-1.5 transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                      <span className="material-symbols-outlined text-[16px]">add</span>
                      Thêm
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Pending list */}
            {pending.length > 0 && (
              <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wide">Chưa gửi ({pending.length} mục · {pendingTotal} thùng)</h4>
                  <button onClick={() => setPending([])} className="text-xs text-red-500 hover:text-red-700 font-medium">Xóa hết</button>
                </div>
                <div className="divide-y divide-gray-50">
                  {pending.map((p, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[15px] text-indigo-400">inventory_2</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-800">{p.skuCode} <span className="text-gray-400 font-normal">→ {p.locationCode}</span></p>
                          <p className="text-[11px] text-gray-400">{p.skuName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-700">{p.qty}</span>
                        <button onClick={() => setPending(prev => prev.filter((_, j) => j !== i))} className="text-gray-300 hover:text-red-500 transition-colors">
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="px-5 py-3 bg-indigo-50/50 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Nhấn <strong>Đặt chỗ</strong> để gửi lên server (RESERVED). Có thể thêm bin khác trước.</span>
                  <div className="flex gap-2">
                    <button onClick={() => setStep('BIN_MAP')}
                      className="px-4 py-2 text-xs text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 font-medium">
                      + Bin khác
                    </button>
                    <button onClick={submitAllocations} disabled={submitting}
                      className="px-5 py-2 text-xs font-semibold text-white rounded-xl flex items-center gap-1.5 disabled:opacity-60 transition-all active:scale-95"
                      style={{ background: 'linear-gradient(135deg,#4f46e5,#6366f1)' }}>
                      {submitting
                        ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang gửi...</>
                        : <><span className="material-symbols-outlined text-[14px]">bookmark</span>Đặt chỗ ({pending.length})</>
                      }
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          STEP 5 — REVIEW & CONFIRM
      ════════════════════════════════════════════════════ */}
      {step === 'REVIEW' && task && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Status summary */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Tổng kết Task #{task.putawayTaskId}</h3>
              <div className="space-y-2">
                {task.items.map(item => {
                  const pctDone = pct(item.allocatedQty + item.putawayQty, item.quantity);
                  return (
                    <div key={item.skuId} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-gray-700">{item.skuCode}</span>
                        <span className="text-gray-400">{item.allocatedQty + item.putawayQty}/{item.quantity}</span>
                      </div>
                      <ProgressBar value={pctDone} color={pctDone === 100 ? '#22c55e' : '#6366f1'} />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <button onClick={() => setStep('ZONE_SELECT')}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-gray-600 border border-gray-200 bg-white rounded-xl hover:bg-gray-50 transition-colors">
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Tiếp tục điền hàng
              </button>
              {reserved.length > 0 && (
                <button onClick={doConfirm} disabled={confirming}
                  className="w-full flex items-center justify-center gap-2 py-3 text-sm font-bold text-white rounded-xl disabled:opacity-60 transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#059669,#10b981)', boxShadow: '0 4px 16px rgba(5,150,105,0.3)' }}>
                  {confirming
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Đang xác nhận...</>
                    : <><span className="material-symbols-outlined text-[18px]">check_circle</span>Confirm cất hàng ({reserved.length} phân bổ)</>
                  }
                </button>
              )}
            </div>
          </div>

          {/* Reserved allocations */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">Phân bổ đã RESERVED ({reserved.length})</h3>
                <p className="text-xs text-gray-400 mt-0.5">Nhấn Confirm để di chuyển hàng vào bin thực tế.</p>
              </div>
              {reserved.length === 0 ? (
                <div className="flex flex-col items-center py-12 gap-2">
                  <span className="material-symbols-outlined text-gray-200 text-[40px]">inbox</span>
                  <p className="text-sm text-gray-400">Chưa có phân bổ nào</p>
                  <button onClick={() => setStep('ZONE_SELECT')}
                    className="text-sm text-indigo-600 font-semibold hover:text-indigo-800 mt-1">
                    Bắt đầu điền hàng →
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {reserved.map(alloc => (
                    <div key={alloc.allocationId} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-[18px] text-indigo-400">inventory_2</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">
                            {alloc.skuCode}
                            <span className="text-gray-400 font-normal"> → {alloc.locationCode}</span>
                          </p>
                          <p className="text-xs text-gray-400">{alloc.skuName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-indigo-700">{alloc.allocatedQty} thùng</span>
                        <span className="text-[11px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">RESERVED</span>
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

    </div>
  );
}
