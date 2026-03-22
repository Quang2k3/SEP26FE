'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import AlertsList from '@/components/dashboard/AlertsList';
import InventoryTable from '@/components/dashboard/InventoryTable';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';
import { fetchWarehouses, type Warehouse } from '@/services/warehouseService';
import { fetchPutawayTasks } from '@/services/putawayService';
import { fetchGrns } from '@/services/grnService';
import { getStoredSession } from '@/services/authService';
import { fetchThroughput, type ThroughputPoint, type ThroughputRange } from '@/services/dashboardService';
import { api } from '@/config/axios';

// ─── Grouped Bar Chart ────────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  point: ThroughputPoint | null;
}

function ThroughputChart({ data, loading, range }: {
  data: ThroughputPoint[];
  loading: boolean;
  range: ThroughputRange;
}) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, point: null });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const W = 620, H = 210, PAD_L = 40, PAD_R = 16, PAD_T = 16, PAD_B = 36;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const n = data.length || 7;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="w-full h-full flex flex-col gap-3 px-1 pt-2 pb-1">
        <div className="flex items-end gap-1 flex-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex-1 flex gap-0.5 items-end h-full">
              <div className="flex-1 rounded-t-md bg-blue-100 animate-pulse"
                style={{ height: `${35 + Math.sin(i) * 25}%`, animationDelay: `${i * 80}ms` }} />
              <div className="flex-1 rounded-t-md bg-violet-100 animate-pulse"
                style={{ height: `${25 + Math.cos(i) * 20}%`, animationDelay: `${i * 80 + 120}ms` }} />
            </div>
          ))}
        </div>
        <div className="flex gap-1">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="flex-1 h-3 bg-gray-100 rounded animate-pulse"
              style={{ animationDelay: `${i * 60}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────────────────────
  const allZero = data.length === 0 || data.every(d => d.inbound === 0 && d.outbound === 0);
  if (allZero) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center">
          <span className="material-symbols-outlined text-[24px] text-gray-300">bar_chart</span>
        </div>
        <p className="text-sm font-medium text-gray-400">Chưa có dữ liệu giao dịch</p>
        <p className="text-xs text-gray-300">GRN đã nhập kho và đơn xuất kho sẽ hiển thị tại đây</p>
      </div>
    );
  }

  // ── Tính toán ────────────────────────────────────────────────────────────
  const maxVal   = Math.max(...data.map(d => Math.max(d.inbound, d.outbound)), 1);
  const niceStep = maxVal <= 5 ? 1 : maxVal <= 10 ? 2 : maxVal <= 20 ? 5 : maxVal <= 50 ? 10 : maxVal <= 100 ? 20 : 50;
  const yMax     = Math.ceil(maxVal / niceStep) * niceStep;
  const baseY    = PAD_T + chartH;
  const toY      = (v: number) => PAD_T + chartH - (v / yMax) * chartH;

  const slotW  = chartW / n;
  // Giới hạn barW theo số lượng bucket: tháng có ~31 ngày cần thanh mỏng hơn
  const barW   = Math.max(Math.min(slotW * 0.32, n <= 7 ? 20 : n <= 12 ? 16 : 6), 3);
  const gap    = Math.max(Math.min(slotW * 0.06, 4), 1);
  const groupW = barW * 2 + gap;

  // Grid
  const gridCount = Math.min(4, yMax);
  const gridStep  = yMax / gridCount;
  const gridVals  = Array.from({ length: gridCount + 1 }, (_, i) => Math.round(i * gridStep));

  // Tooltip position clamped trong SVG
  const TOOLTIP_W = 130, TOOLTIP_H = 68;

  const handleMouseEnter = (e: React.MouseEvent<SVGGElement>, point: ThroughputPoint, i: number, cx: number) => {
    const svg = (e.currentTarget.closest('svg') as SVGSVGElement);
    const rect = svg.getBoundingClientRect();
    const scaleX = W / rect.width;
    const scaleY = H / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top)  * scaleY;
    // Clamp tooltip
    const tx = Math.min(Math.max(cx - TOOLTIP_W / 2, PAD_L), W - PAD_R - TOOLTIP_W);
    const ty = Math.max(PAD_T, mouseY - TOOLTIP_H - 10);
    setTooltip({ visible: true, x: tx, y: ty, point });
    setHoveredIdx(i);
  };

  const handleMouseLeave = () => {
    setTooltip(t => ({ ...t, visible: false }));
    setHoveredIdx(null);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full overflow-visible"
      preserveAspectRatio="xMidYMid meet"
      onMouseLeave={handleMouseLeave}>
      <defs>
        <linearGradient id="barIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="1"/>
          <stop offset="100%" stopColor="#93c5fd" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="barInHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#1d4ed8" stopOpacity="1"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9"/>
        </linearGradient>
        <linearGradient id="barOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="1"/>
          <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.8"/>
        </linearGradient>
        <linearGradient id="barOutHover" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#6d28d9" stopOpacity="1"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.9"/>
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0000001a"/>
        </filter>
      </defs>

      {/* ── Grid lines + Y labels ── */}
      {gridVals.map((v, gi) => (
        <g key={gi}>
          <line x1={PAD_L} y1={toY(v)} x2={W - PAD_R} y2={toY(v)}
            stroke={v === 0 ? '#e2e8f0' : '#f1f5f9'}
            strokeWidth={v === 0 ? 1.5 : 1}
            strokeDasharray={v === 0 ? undefined : '3 3'} />
          <text x={PAD_L - 6} y={toY(v) + 4} fontSize="9" fill="#94a3b8" textAnchor="end"
            fontFamily="ui-monospace, monospace">{v}</text>
        </g>
      ))}

      {/* ── Bars + hover area ── */}
      {data.map((d, i) => {
        const cx     = PAD_L + slotW * i + slotW / 2;
        const inX    = cx - groupW / 2;
        const outX   = inX + barW + gap;
        const inH    = d.inbound  > 0 ? Math.max((d.inbound  / yMax) * chartH, 2) : 0;
        const outH   = d.outbound > 0 ? Math.max((d.outbound / yMax) * chartH, 2) : 0;
        const inY    = baseY - inH;
        const outY   = baseY - outH;
        const r      = Math.min(3, barW / 2);
        const isHov  = hoveredIdx === i;

        return (
          <g key={i}
            onMouseEnter={e => handleMouseEnter(e, d, i, cx)}
            style={{ cursor: 'pointer' }}>

            {/* Hover highlight zone — invisible rect covering full column height */}
            <rect
              x={inX - 2} y={PAD_T} width={groupW + 4} height={chartH}
              fill={isHov ? '#f8faff' : 'transparent'}
              rx="4"
            />

            {/* ── Cột nhập kho ── */}
            {d.inbound > 0
              ? <rect x={inX} y={inY} width={barW} height={inH} rx={r} ry={r}
                  fill={isHov ? 'url(#barInHover)' : 'url(#barIn)'}
                  filter={isHov ? 'url(#shadow)' : undefined}
                  style={{ transition: 'all 0.15s ease' }} />
              : <rect x={inX} y={baseY - 3} width={barW} height={3} rx="1"
                  fill="#dbeafe" opacity="0.6" />
            }

            {/* ── Cột xuất kho ── */}
            {d.outbound > 0
              ? <rect x={outX} y={outY} width={barW} height={outH} rx={r} ry={r}
                  fill={isHov ? 'url(#barOutHover)' : 'url(#barOut)'}
                  filter={isHov ? 'url(#shadow)' : undefined}
                  style={{ transition: 'all 0.15s ease' }} />
              : <rect x={outX} y={baseY - 3} width={barW} height={3} rx="1"
                  fill="#ede9fe" opacity="0.6" />
            }

            {/* ── X label ── */}
            <text x={cx} y={H - 10} fontSize={n > 20 ? '8' : '10'} fill={isHov ? '#4b5563' : '#94a3b8'}
              textAnchor="middle" fontWeight={isHov ? '600' : '400'}
              style={{ transition: 'fill 0.15s' }}>
              {d.label}
            </text>
          </g>
        );
      })}

      {/* ── Tooltip ── */}
      {tooltip.visible && tooltip.point && (
        <g style={{ pointerEvents: 'none' }}>
          {/* Shadow */}
          <rect x={tooltip.x + 2} y={tooltip.y + 2} width={TOOLTIP_W} height={TOOLTIP_H}
            rx="8" fill="black" opacity="0.08" />
          {/* Background */}
          <rect x={tooltip.x} y={tooltip.y} width={TOOLTIP_W} height={TOOLTIP_H}
            rx="8" fill="white" stroke="#e2e8f0" strokeWidth="1" />

          {/* Date label */}
          <text x={tooltip.x + TOOLTIP_W / 2} y={tooltip.y + 16}
            fontSize="10" fill="#6b7280" textAnchor="middle" fontWeight="500">
            {(tooltip.point as any).sublabel ?? tooltip.point.date}
          </text>

          {/* Separator */}
          <line x1={tooltip.x + 10} y1={tooltip.y + 22} x2={tooltip.x + TOOLTIP_W - 10} y2={tooltip.y + 22}
            stroke="#f1f5f9" strokeWidth="1" />

          {/* Inbound row */}
          <rect x={tooltip.x + 12} y={tooltip.y + 29} width="8" height="8" rx="2" fill="#3b82f6" />
          <text x={tooltip.x + 26} y={tooltip.y + 37} fontSize="11" fill="#374151">Nhập kho</text>
          <text x={tooltip.x + TOOLTIP_W - 12} y={tooltip.y + 37}
            fontSize="12" fill="#1d4ed8" fontWeight="700" textAnchor="end">
            {tooltip.point.inbound}
          </text>

          {/* Outbound row */}
          <rect x={tooltip.x + 12} y={tooltip.y + 47} width="8" height="8" rx="2" fill="#8b5cf6" />
          <text x={tooltip.x + 26} y={tooltip.y + 55} fontSize="11" fill="#374151">Xuất kho</text>
          <text x={tooltip.x + TOOLTIP_W - 12} y={tooltip.y + 55}
            fontSize="12" fill="#6d28d9" fontWeight="700" textAnchor="end">
            {tooltip.point.outbound}
          </text>
        </g>
      )}
    </svg>
  );
}

// ─── Quick action card ────────────────────────────────────────────────────────

function QuickCard({ label, value, sub, icon, iconBg, iconColor, subColor, accent, loading }: {
  label: string; value: string; sub: string; icon: string;
  iconBg: string; iconColor: string; subColor: string; accent: string; loading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-1 top-0 rounded-l-2xl" style={{ background: accent }} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 truncate">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">
          {loading ? <span className="w-10 h-6 bg-gray-100 rounded animate-pulse inline-block" /> : value}
        </p>
        <p className={`text-[11px] mt-0.5 ${subColor}`}>{sub}</p>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const session    = getStoredSession();
  const userRoles  = session?.user?.roleCodes ?? [];
  const isManager  = userRoles.includes('MANAGER');
  const isKeeper   = userRoles.includes('KEEPER');
  const isQC       = userRoles.includes('QC');
  const userName   = session?.user?.fullName ?? '';

  const [warehouses, setWarehouses]     = useState<Warehouse[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  // [FIX] Stock chart state cho Keeper & QC
  const [skuStockData, setSkuStockData] = useState<{skuCode:string;skuName:string;totalQty:number;reservedQty:number;availableQty:number}[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);

  // Throughput chart
  const [throughputData,    setThroughputData]    = useState<ThroughputPoint[]>([]);
  const [loadingThroughput, setLoadingThroughput] = useState(true);
  const [chartRange,        setChartRange]        = useState<ThroughputRange>('week');

  const loadThroughput = useCallback((range: ThroughputRange) => {
    setLoadingThroughput(true);
    fetchThroughput(range)
      .then(setThroughputData)
      .catch(() => setThroughputData([]))
      .finally(() => setLoadingThroughput(false));
  }, []);

  const handleRangeChange = (r: ThroughputRange) => {
    setChartRange(r);
    loadThroughput(r);
  };

  // Manager stats
  const [managerStats, setManagerStats] = useState({
    totalReceiving: 0,
    pendingGrnApproval: 0,
    totalGrn: 0,
    pendingQC: 0,
  });

  // Keeper stats
  const [keeperStats, setKeeperStats] = useState({
    totalReceiving: 0,
    pendingPutaway: 0,
    inProgressPutaway: 0,
    donePutaway: 0,
  });

  // QC stats
  const [qcStats, setQcStats] = useState({
    pendingInspection: 0,
    totalInspected: 0,
  });

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      if (isManager) {
        const [rcv, grns, qc, pendingGrn] = await Promise.all([
          fetchReceivingOrders({ page: 0, size: 1 }),
          fetchGrns({ page: 0, size: 1 }),
          fetchReceivingOrders({ status: 'SUBMITTED', page: 0, size: 1 }),
          // BE-C1 FIX impact: đếm GRN chờ duyệt qua receiving-orders PENDING_APPROVAL
          // dùng totalElements thay vì filter client-side (fetchGrns size:1 chỉ thấy 1 record)
          fetchReceivingOrders({ status: 'PENDING_APPROVAL', page: 0, size: 1 }),
        ]);
        setManagerStats({
          totalReceiving:    rcv.totalElements ?? 0,
          pendingGrnApproval: pendingGrn.totalElements ?? 0,
          totalGrn:          grns.totalElements ?? 0,
          pendingQC:         qc.totalElements ?? 0,
        });
      }

      if (isKeeper) {
        const [rcv, tasks] = await Promise.all([
          fetchReceivingOrders({ page: 0, size: 1 }),
          fetchPutawayTasks({ size: 100 }),
        ]);
        const content = tasks.content ?? [];
        setKeeperStats({
          totalReceiving:    rcv.totalElements ?? 0,
          pendingPutaway:    content.filter(t => t.status === 'PENDING' || t.status === 'OPEN').length,
          inProgressPutaway: content.filter(t => t.status === 'IN_PROGRESS').length,
          donePutaway:       content.filter(t => t.status === 'DONE').length,
        });
      }

      if (isQC) {
        const [pending, inspected] = await Promise.all([
          fetchReceivingOrders({ status: 'SUBMITTED', page: 0, size: 1 }),
          fetchReceivingOrders({ status: 'QC_APPROVED', page: 0, size: 1 }),
        ]);
        setQcStats({
          pendingInspection: pending.totalElements ?? 0,
          totalInspected:    inspected.totalElements ?? 0,
        });
      }
      // Load stock chart for Keeper & QC
      if (isKeeper || isQC) {
        setLoadingChart(true);
        api.get('/skus/stock-summary')
          .then(res => setSkuStockData(res.data?.data ?? []))
          .catch(() => {})
          .finally(() => setLoadingChart(false));
      }
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }, [isManager, isKeeper, isQC]);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => {});
    loadStats();
    loadThroughput('week');
  }, [loadStats, loadThroughput]);

  // ── Greeting ──
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Chào buổi sáng' : hour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const roleLabel = isManager ? 'Manager' : isKeeper ? 'Keeper' : isQC ? 'QC' : '';

  return (
    <div className="flex flex-col gap-5 w-full page-enter">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {greeting}{userName ? `, ${userName.split(' ').at(-1)}` : ''} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {roleLabel && <span className="font-medium text-indigo-600">[{roleLabel}]</span>}
            {' '}Tổng quan kho hàng theo thời gian thực
          </p>
        </div>
        <button onClick={loadStats}
          className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[16px]">refresh</span>
          Làm mới
        </button>
      </div>

      {/* ════════ MANAGER VIEW ════════ */}
      {isManager && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Tổng phiếu nhập"  value={managerStats.totalReceiving.toLocaleString('vi-VN')}  unit="phiếu"  icon="input_circle"  color="blue"   loading={loadingStats} />
            <StatsCard title="GRN chờ duyệt"    value={String(managerStats.pendingGrnApproval)} icon="pending_actions" color="amber"
              hasAlert={managerStats.pendingGrnApproval > 0} href="/manager-dashboard/grn" loading={loadingStats} />
            <StatsCard title="Tổng GRN"          value={managerStats.totalGrn.toLocaleString('vi-VN')}         unit="phiếu"  icon="receipt_long"   color="violet" loading={loadingStats} />
            <StatsCard title="Chờ QC duyệt"     value={String(managerStats.pendingQC)}          icon="verified"        color="emerald"
              hasAlert={managerStats.pendingQC > 0} href="/qc-inspections" loading={loadingStats} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 pt-4 pb-3 border-b border-gray-100">
                {/* Title row */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Thông lượng nhập / xuất kho</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {loadingThroughput
                        ? 'Đang tải...'
                        : throughputData.every(d => d.inbound === 0 && d.outbound === 0)
                          ? 'Chưa có giao dịch trong kỳ này'
                          : (() => {
                              const totalIn  = throughputData.reduce((s, d) => s + d.inbound, 0);
                              const totalOut = throughputData.reduce((s, d) => s + d.outbound, 0);
                              const label = chartRange === 'week' ? '7 ngày qua' : chartRange === 'month' ? `Tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}` : '12 tháng qua';
                              return `${label} · ${totalIn} GRN nhập · ${totalOut} đơn xuất`;
                            })()}
                    </p>
                  </div>
                  {/* Range tabs */}
                  <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                    {(['week', 'month', 'year'] as ThroughputRange[]).map(r => (
                      <button key={r}
                        onClick={() => handleRangeChange(r)}
                        className={`px-3 py-1.5 text-[11px] font-semibold rounded-md transition-all ${
                          chartRange === r
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        }`}>
                        {r === 'week' ? 'Tuần' : r === 'month' ? 'Tháng' : 'Năm'}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4 mt-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-blue-500 inline-block" />
                    <span className="text-xs text-gray-500">Nhập kho (GRN Posted)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-violet-500 inline-block" />
                    <span className="text-xs text-gray-500">Xuất kho (Dispatched)</span>
                  </div>
                </div>
              </div>
              <div className="px-3 pb-3 pt-2 h-[240px] relative">
                <ThroughputChart data={throughputData} loading={loadingThroughput} range={chartRange} />
              </div>
            </div>
            <AlertsList />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickCard label="GRN cần duyệt"     value={String(managerStats.pendingGrnApproval)} sub={managerStats.pendingGrnApproval > 0 ? 'Cần xử lý ngay' : 'Không có phiếu mới'} icon="pending_actions" iconBg="bg-amber-50"   iconColor="text-amber-600"   subColor="text-amber-600"   accent="#f59e0b" loading={loadingStats} />
            <QuickCard label="Tổng GRN tháng này" value={String(managerStats.totalGrn)}           sub="Đã tạo"             icon="receipt_long"   iconBg="bg-blue-50"    iconColor="text-blue-600"    subColor="text-gray-400"    accent="#3b82f6" loading={loadingStats} />
            <QuickCard label="Phiếu chờ QC"       value={String(managerStats.pendingQC)}           sub={managerStats.pendingQC > 0 ? `${managerStats.pendingQC} đang chờ` : 'Không có'} icon="verified" iconBg="bg-violet-50" iconColor="text-violet-600" subColor="text-violet-600" accent="#8b5cf6" loading={loadingStats} />
          </div>

          <InventoryTable />
        </>
      )}

      {/* ════════ KEEPER VIEW ════════ */}
      {isKeeper && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatsCard title="Tổng phiếu nhập"    value={keeperStats.totalReceiving.toLocaleString('vi-VN')} unit="phiếu" icon="input_circle"  color="blue"    loading={loadingStats} />
            <StatsCard title="Putaway chờ xử lý"  value={String(keeperStats.pendingPutaway)}    icon="inventory_2"   color="amber"
              hasAlert={keeperStats.pendingPutaway > 0} href="/tasks" loading={loadingStats} />
            <StatsCard title="Đang cất hàng"      value={String(keeperStats.inProgressPutaway)} icon="shelves"       color="violet" loading={loadingStats} />
            <StatsCard title="Đã hoàn thành"      value={String(keeperStats.donePutaway)}        icon="check_circle"  color="emerald" loading={loadingStats} />
          </div>

          {/* Quick actions for Keeper */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link href="/inbound/gate-check"
              className="bg-white rounded-2xl border-2 border-indigo-100 hover:border-indigo-300 shadow-sm px-5 py-5 flex items-center gap-4 group transition-all hover:shadow-md">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[24px] text-indigo-500">input_circle</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Gate Check / Nhận hàng</p>
                <p className="text-xs text-gray-400 mt-0.5">Kiểm tra và tạo phiếu nhận hàng</p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-gray-200 group-hover:text-indigo-400 ml-auto transition-colors">chevron_right</span>
            </Link>

            <Link href="/tasks"
              className="bg-white rounded-2xl border-2 border-amber-100 hover:border-amber-300 shadow-sm px-5 py-5 flex items-center gap-4 group transition-all hover:shadow-md relative">
              {keeperStats.pendingPutaway > 0 && (
                <span className="absolute top-3 right-3 min-w-[20px] h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                  {keeperStats.pendingPutaway}
                </span>
              )}
              <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                <span className="material-symbols-outlined text-[24px] text-amber-500">shelves</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Putaway — Cất hàng</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {keeperStats.pendingPutaway > 0
                    ? `${keeperStats.pendingPutaway} task đang chờ bạn`
                    : 'Không có task mới'}
                </p>
              </div>
              <span className="material-symbols-outlined text-[18px] text-gray-200 group-hover:text-amber-400 ml-auto transition-colors">chevron_right</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <QuickCard label="Task cần làm"     value={String(keeperStats.pendingPutaway)}    sub={keeperStats.pendingPutaway > 0 ? 'Cần xử lý' : 'Tất cả đã xong'} icon="pending_actions" iconBg="bg-amber-50"   iconColor="text-amber-600"   subColor="text-amber-600"   accent="#f59e0b" loading={loadingStats} />
            <QuickCard label="Đang cất hàng"   value={String(keeperStats.inProgressPutaway)} sub="Đang xử lý"                        icon="shelves"        iconBg="bg-violet-50"  iconColor="text-violet-600"  subColor="text-violet-600"  accent="#8b5cf6" loading={loadingStats} />
            <QuickCard label="Hoàn thành"       value={String(keeperStats.donePutaway)}        sub="Task đã xong"                     icon="check_circle"   iconBg="bg-emerald-50" iconColor="text-emerald-600" subColor="text-emerald-600" accent="#10b981" loading={loadingStats} />
          </div>

          {/* ── Biểu đồ tồn kho theo SKU ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">📦 Tồn kho theo SKU</p>
                <p className="text-xs text-gray-400 mt-0.5">Top SKU — khả dụng / đã giữ chỗ / tổng</p>
              </div>
              {loadingChart && <span className="text-xs text-indigo-400 animate-pulse">Đang tải...</span>}
            </div>
            {skuStockData.length === 0 && !loadingChart ? (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có dữ liệu tồn kho</p>
            ) : (
              <div className="space-y-2.5">
                {skuStockData.slice(0, 10).map((sku) => {
                  const total = sku.totalQty || 1;
                  const availPct = Math.round((sku.availableQty / total) * 100);
                  const resPct   = Math.round((sku.reservedQty  / total) * 100);
                  return (
                    <div key={sku.skuCode}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{sku.skuCode}</span>
                          <span className="text-[11px] text-gray-500 truncate">{sku.skuName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-emerald-600 font-semibold">{sku.availableQty} khả dụng</span>
                          {sku.reservedQty > 0 && <span className="text-[10px] text-amber-500">{sku.reservedQty} giữ</span>}
                          <span className="text-[10px] text-gray-400">/ {sku.totalQty}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${availPct}%` }} />
                        <div className="h-full bg-amber-300 transition-all duration-500" style={{ width: `${resPct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"/><span className="text-[10px] text-gray-500">Khả dụng</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-300"/><span className="text-[10px] text-gray-500">Đã giữ chỗ</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-100"/><span className="text-[10px] text-gray-500">Trống</span></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════ QC VIEW ════════ */}
      {isQC && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <StatsCard title="Chờ kiểm định"   value={String(qcStats.pendingInspection)}
              icon="verified" color="amber" hasAlert={qcStats.pendingInspection > 0} href="/qc-inspections" loading={loadingStats} />
            <StatsCard title="Đã kiểm định"    value={String(qcStats.totalInspected)}
              icon="check_circle" color="emerald" loading={loadingStats} />
          </div>

          <Link href="/qc-inspections"
            className="bg-white rounded-2xl border-2 border-amber-100 hover:border-amber-300 shadow-sm px-5 py-5 flex items-center gap-4 group transition-all hover:shadow-md relative">
            {qcStats.pendingInspection > 0 && (
              <span className="absolute top-3 right-3 min-w-[20px] h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1.5">
                {qcStats.pendingInspection}
              </span>
            )}
            <div className="w-12 h-12 rounded-2xl bg-amber-50 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
              <span className="material-symbols-outlined text-[24px] text-amber-500">verified</span>
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">Danh sách kiểm định QC</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {qcStats.pendingInspection > 0
                  ? `${qcStats.pendingInspection} phiếu đang chờ kiểm định`
                  : 'Không có phiếu mới'}
              </p>
            </div>
            <span className="material-symbols-outlined text-[18px] text-gray-200 group-hover:text-amber-400 ml-auto transition-colors">chevron_right</span>
          </Link>

          <AlertsList />

          {/* ── Biểu đồ tồn kho theo SKU ── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-bold text-gray-800">📦 Tồn kho theo SKU</p>
                <p className="text-xs text-gray-400 mt-0.5">Top SKU — khả dụng / đã giữ chỗ / tổng</p>
              </div>
              {loadingChart && <span className="text-xs text-indigo-400 animate-pulse">Đang tải...</span>}
            </div>
            {skuStockData.length === 0 && !loadingChart ? (
              <p className="text-xs text-gray-400 text-center py-6">Chưa có dữ liệu tồn kho</p>
            ) : (
              <div className="space-y-2.5">
                {skuStockData.slice(0, 10).map((sku) => {
                  const total = sku.totalQty || 1;
                  const availPct = Math.round((sku.availableQty / total) * 100);
                  const resPct   = Math.round((sku.reservedQty  / total) * 100);
                  return (
                    <div key={sku.skuCode}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded shrink-0">{sku.skuCode}</span>
                          <span className="text-[11px] text-gray-500 truncate">{sku.skuName}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          <span className="text-[10px] text-emerald-600 font-semibold">{sku.availableQty} khả dụng</span>
                          {sku.reservedQty > 0 && <span className="text-[10px] text-amber-500">{sku.reservedQty} giữ</span>}
                          <span className="text-[10px] text-gray-400">/ {sku.totalQty}</span>
                        </div>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${availPct}%` }} />
                        <div className="h-full bg-amber-300 transition-all duration-500" style={{ width: `${resPct}%` }} />
                      </div>
                    </div>
                  );
                })}
                <div className="flex items-center gap-4 pt-2 border-t border-gray-50">
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-400"/><span className="text-[10px] text-gray-500">Khả dụng</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-amber-300"/><span className="text-[10px] text-gray-500">Đã giữ chỗ</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-gray-100"/><span className="text-[10px] text-gray-500">Trống</span></div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}