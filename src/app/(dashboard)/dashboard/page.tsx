'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import StatsCard from '@/components/dashboard/StatsCard';
import AlertsList from '@/components/dashboard/AlertsList';
import InventoryTable from '@/components/dashboard/InventoryTable';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';
import { fetchWarehouses, type Warehouse } from '@/services/warehouseService';

// ── Mini chart using SVG ─────────────────────────────────────────────────────
interface ChartPoint { label: string; inbound: number; outbound: number }

const DAYS: ChartPoint[] = [
  { label: 'T2', inbound: 142, outbound: 98  },
  { label: 'T3', inbound: 189, outbound: 124 },
  { label: 'T4', inbound: 165, outbound: 107 },
  { label: 'T5', inbound: 212, outbound: 158 },
  { label: 'T6', inbound: 198, outbound: 143 },
  { label: 'T7', inbound: 231, outbound: 172 },
  { label: 'CN', inbound: 147, outbound: 140 },
];

function ThroughputChart() {
  const W = 620, H = 180, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;
  const maxVal = Math.max(...DAYS.map(d => Math.max(d.inbound, d.outbound)));
  const yMax = Math.ceil(maxVal / 50) * 50;
  const n = DAYS.length;
  const xStep = chartW / (n - 1);

  const toX = (i: number) => PAD_L + i * xStep;
  const toY = (v: number) => PAD_T + chartH - (v / yMax) * chartH;

  const inboundPts = DAYS.map((d, i) => `${toX(i)},${toY(d.inbound)}`).join(' ');
  const outboundPts = DAYS.map((d, i) => `${toX(i)},${toY(d.outbound)}`).join(' ');

  const areaInbound = `M${PAD_L},${PAD_T + chartH} L` + DAYS.map((d, i) => `${toX(i)},${toY(d.inbound)}`).join(' L') + ` L${toX(n-1)},${PAD_T + chartH} Z`;
  const areaOutbound = `M${PAD_L},${PAD_T + chartH} L` + DAYS.map((d, i) => `${toX(i)},${toY(d.outbound)}`).join(' L') + ` L${toX(n-1)},${PAD_T + chartH} Z`;

  const gridVals = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax].map(v => Math.round(v));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.13"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Y-axis gridlines + labels */}
      {gridVals.map(v => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={PAD_L - 6} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        );
      })}

      {/* Area fills */}
      <path d={areaInbound} fill="url(#gIn)"/>
      <path d={areaOutbound} fill="url(#gOut)"/>

      {/* Lines */}
      <polyline points={inboundPts} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={outboundPts} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"/>

      {/* Dots — inbound */}
      {DAYS.map((d, i) => (
        <circle key={i} cx={toX(i)} cy={toY(d.inbound)} r="3.5" fill="white" stroke="#3b82f6" strokeWidth="2"/>
      ))}

      {/* X labels */}
      {DAYS.map((d, i) => (
        <text key={d.label} x={toX(i)} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{d.label}</text>
      ))}
    </svg>
  );
}

// ── Dashboard page ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [loadingStats, setLoadingStats] = useState(true);
  const [stats, setStats] = useState({
    inbound: 0, inboundTrend: 0,
    outbound: 0, outboundTrend: 0,
    picking: 0,
    binUsed: 0,
  });

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      // Tổng số phiếu nhập (DRAFT→POSTED)
      const inboundData = await fetchReceivingOrders({ page: 0, size: 1 });
      const total = inboundData.totalElements ?? 0;

      // GRN_CREATED (xuất)
      const grnData = await fetchReceivingOrders({ status: 'GRN_CREATED', page: 0, size: 1 });
      const grn = grnData.totalElements ?? 0;

      // Pending picking (SUBMITTED)
      const pickingData = await fetchReceivingOrders({ status: 'SUBMITTED', page: 0, size: 1 });
      const picking = pickingData.totalElements ?? 0;

      setStats({
        inbound: total,
        inboundTrend: 8,   // TODO: compare vs yesterday
        outbound: grn,
        outboundTrend: -3, // TODO: compare vs yesterday
        picking,
        binUsed: 78,       // TODO: fetch from bin API
      });
    } catch {
      // silent fail — keep zeros
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => {});
    loadStats();
  }, [loadStats]);

  return (
    <div className="flex flex-col gap-5 w-full page-enter">

      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Tổng quan kho hàng theo thời gian thực</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedWarehouse}
            onChange={e => setSelectedWarehouse(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option value="all">Tất cả kho</option>
            {warehouses.map(w => (
              <option key={w.warehouseId} value={String(w.warehouseId)}>{w.warehouseName}</option>
            ))}
          </select>
          <select className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
            <option>7 ngày gần đây</option>
            <option>30 ngày</option>
            <option>Tháng này</option>
          </select>
          <button onClick={loadStats}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Làm mới
          </button>
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Tổng phiếu nhập"
          value={stats.inbound.toLocaleString('vi-VN')}
          unit="phiếu"
          icon="input_circle"
          color="blue"
          trend={stats.inboundTrend}
          loading={loadingStats}
        />
        <StatsCard
          title="GRN đã tạo"
          value={stats.outbound.toLocaleString('vi-VN')}
          unit="phiếu"
          icon="receipt_long"
          color="violet"
          trend={stats.outboundTrend}
          loading={loadingStats}
        />
        <StatsCard
          title="Chờ QC duyệt"
          value={String(stats.picking)}
          icon="verified"
          color="amber"
          hasAlert={stats.picking > 0}
          href="/qc-inspections"
          loading={loadingStats}
        />
        <StatsCard
          title="Bin đã dùng"
          value={`${stats.binUsed}%`}
          icon="inventory_2"
          color="emerald"
          showProgress
          progressValue={stats.binUsed}
          loading={loadingStats}
        />
      </div>

      {/* ── Chart + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Xu hướng thông lượng</h3>
              <p className="text-xs text-gray-400 mt-0.5">Nhập kho vs GRN — 7 ngày gần đây</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Legend */}
              <div className="flex items-center gap-4 mr-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-0.5 rounded-full bg-blue-500 inline-block" />
                  <span className="text-xs text-gray-500">Nhập kho</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 border-t-2 border-dashed border-violet-400 inline-block" />
                  <span className="text-xs text-gray-500">GRN</span>
                </div>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all">
                <span className="material-symbols-outlined text-[14px]">download</span>
                Export
              </button>
            </div>
          </div>
          <div className="px-3 pb-3 pt-2 h-[220px] relative">
            <ThroughputChart />
          </div>
        </div>

        {/* Alerts */}
        <AlertsList />
      </div>

      {/* ── Summary row ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Đơn hoàn thành hôm nay', value: '34', sub: '+12% so hôm qua', icon: 'check_circle', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600', subColor: 'text-emerald-600', accent: '#10b981' },
          { label: 'Cần QC kiểm tra', value: String(stats.picking), sub: stats.picking > 0 ? `${stats.picking} đang chờ xử lý` : 'Không có task mới', icon: 'verified', iconBg: 'bg-amber-50', iconColor: 'text-amber-600', subColor: 'text-amber-600', accent: '#f59e0b' },
          { label: 'Tổng GRN tháng này', value: String(stats.outbound), sub: 'Đã hoàn thành', icon: 'receipt_long', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', subColor: 'text-gray-400', accent: '#3b82f6' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 w-1 top-0 rounded-l-2xl" style={{ background: item.accent }} />
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
              <span className={`material-symbols-outlined text-[20px] ${item.iconColor}`}>{item.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">{item.label}</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">
                {loadingStats ? <span className="w-10 h-6 bg-gray-100 rounded animate-pulse inline-block" /> : item.value}
              </p>
              <p className={`text-[11px] mt-0.5 ${item.subColor}`}>{item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Inventory table ── */}
      <InventoryTable />
    </div>
  );
}
