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
import { fetchThroughput7Days, type ThroughputPoint } from '@/services/dashboardService';

// ─── Chart ────────────────────────────────────────────────────────────────────

function ThroughputChart({ data, loading }: { data: ThroughputPoint[]; loading: boolean }) {
  const W = 620, H = 180, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 32;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  // Loading skeleton
  if (loading) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        {[0, 1, 2, 3].map(i => (
          <rect key={i} x={PAD_L} y={PAD_T + i * (chartH / 4)} width={chartW} height="1" fill="#f1f5f9" />
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map(i => {
          const x = PAD_L + i * (chartW / 6);
          return (
            <g key={i}>
              <rect x={x - 20} y={PAD_T + 20} width={40} height={chartH - 20} rx="4" fill="#f8fafc" />
              <text x={x} y={H - 6} fontSize="10" fill="#cbd5e1" textAnchor="middle">...</text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Tất cả đều 0 → empty state
  const allZero = data.every(d => d.inbound === 0 && d.outbound === 0);
  if (allZero) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
        {/* Grid lines */}
        {[0, 1, 2, 3, 4].map(i => {
          const y = PAD_T + (chartH / 4) * i;
          return <line key={i} x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f1f5f9" strokeWidth="1" />;
        })}
        {/* Day labels */}
        {data.map((d, i) => {
          const x = PAD_L + i * (chartW / 6);
          return <text key={d.label} x={x} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{d.label}</text>;
        })}
        {/* Empty message */}
        <text x={W / 2} y={H / 2 - 6} fontSize="12" fill="#cbd5e1" textAnchor="middle">Chưa có dữ liệu trong 7 ngày qua</text>
        <text x={W / 2} y={H / 2 + 10} fontSize="10" fill="#e2e8f0" textAnchor="middle">GRN đã nhập kho và đơn xuất kho sẽ hiển thị tại đây</text>
      </svg>
    );
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.inbound, d.outbound)), 1);
  const yMax   = Math.ceil(maxVal / 5) * 5 || 5; // step 5, tối thiểu 5
  const n      = data.length;
  const xStep  = chartW / (n - 1);
  const toX    = (i: number) => PAD_L + i * xStep;
  const toY    = (v: number) => PAD_T + chartH - (v / yMax) * chartH;

  const inboundPts  = data.map((d, i) => `${toX(i)},${toY(d.inbound)}`).join(' ');
  const outboundPts = data.map((d, i) => `${toX(i)},${toY(d.outbound)}`).join(' ');
  const areaIn  = `M${PAD_L},${PAD_T + chartH} L` + data.map((d, i) => `${toX(i)},${toY(d.inbound)}`).join(' L')  + ` L${toX(n-1)},${PAD_T + chartH} Z`;
  const areaOut = `M${PAD_L},${PAD_T + chartH} L` + data.map((d, i) => `${toX(i)},${toY(d.outbound)}`).join(' L') + ` L${toX(n-1)},${PAD_T + chartH} Z`;
  // Grid: tối đa 5 đường ngang, step gọn
  const gridStep = Math.ceil(yMax / 4);
  const gridVals = Array.from({ length: 5 }, (_, i) => Math.min(i * gridStep, yMax));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gIn"  x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3b82f6" stopOpacity="0.2"/>
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
        </linearGradient>
        <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#8b5cf6" stopOpacity="0.13"/>
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0"/>
        </linearGradient>
      </defs>

      {/* Grid lines + Y labels */}
      {gridVals.map((v, gi) => {
        const y = toY(v);
        return (
          <g key={gi}>
            <line x1={PAD_L} y1={y} x2={W - PAD_R} y2={y} stroke="#f1f5f9" strokeWidth="1"/>
            <text x={PAD_L - 6} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end">{v}</text>
          </g>
        );
      })}

      {/* Area fills */}
      <path d={areaIn}  fill="url(#gIn)"/>
      <path d={areaOut} fill="url(#gOut)"/>

      {/* Lines */}
      <polyline points={inboundPts}  fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points={outboundPts} fill="none" stroke="#8b5cf6" strokeWidth="2"   strokeLinecap="round" strokeLinejoin="round" strokeDasharray="5 3"/>

      {/* Dots + tooltip values on inbound line */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={toX(i)} cy={toY(d.inbound)} r="3.5" fill="white" stroke="#3b82f6" strokeWidth="2"/>
          {d.inbound > 0 && (
            <text x={toX(i)} y={toY(d.inbound) - 7} fontSize="8.5" fill="#3b82f6" textAnchor="middle" fontWeight="600">
              {d.inbound}
            </text>
          )}
        </g>
      ))}

      {/* Dots on outbound line */}
      {data.map((d, i) => (
        <g key={`o${i}`}>
          <circle cx={toX(i)} cy={toY(d.outbound)} r="3" fill="white" stroke="#8b5cf6" strokeWidth="1.5"/>
          {d.outbound > 0 && (
            <text x={toX(i)} y={toY(d.outbound) - 6} fontSize="8" fill="#8b5cf6" textAnchor="middle">
              {d.outbound}
            </text>
          )}
        </g>
      ))}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={d.label} x={toX(i)} y={H - 6} fontSize="10" fill="#94a3b8" textAnchor="middle">{d.label}</text>
      ))}
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

  // Throughput chart
  const [throughputData,    setThroughputData]    = useState<ThroughputPoint[]>([]);
  const [loadingThroughput, setLoadingThroughput] = useState(true);

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
    } catch { /* silent */ }
    finally { setLoadingStats(false); }
  }, [isManager, isKeeper, isQC]);

  useEffect(() => {
    fetchWarehouses().then(setWarehouses).catch(() => {});
    loadStats();
    // Throughput: fetch riêng, không block stats loading
    setLoadingThroughput(true);
    fetchThroughput7Days()
      .then(setThroughputData)
      .catch(() => setThroughputData([]))
      .finally(() => setLoadingThroughput(false));
  }, [loadStats]);

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
        <div className="flex items-center gap-2 flex-wrap">
          <select
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm">
            <option>Tất cả kho</option>
            {warehouses.map(w => (
              <option key={w.warehouseId} value={String(w.warehouseId)}>{w.warehouseName}</option>
            ))}
          </select>
          <button onClick={loadStats}
            className="flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Làm mới
          </button>
        </div>
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
              <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Xu hướng thông lượng</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {loadingThroughput
                      ? 'Đang tải dữ liệu thực...'
                      : throughputData.every(d => d.inbound === 0 && d.outbound === 0)
                        ? '7 ngày gần nhất — chưa có giao dịch'
                        : `7 ngày gần nhất · ${throughputData.reduce((s, d) => s + d.inbound, 0)} GRN nhập · ${throughputData.reduce((s, d) => s + d.outbound, 0)} đơn xuất`}
                  </p>
                </div>
                <div className="flex items-center gap-4 mr-2">
                  <div className="flex items-center gap-1.5"><span className="w-6 h-0.5 rounded-full bg-blue-500 inline-block" /><span className="text-xs text-gray-500">Nhập kho</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-5 border-t-2 border-dashed border-violet-400 inline-block" /><span className="text-xs text-gray-500">Xuất kho</span></div>
                </div>
              </div>
              <div className="px-3 pb-3 pt-2 h-[220px] relative">
                <ThroughputChart data={throughputData} loading={loadingThroughput} />
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
        </>
      )}
    </div>
  );
}
