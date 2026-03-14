'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchIncidents } from '@/services/incidentService';
import type { Incident } from '@/interfaces/incident';
import { fetchReceivingOrders } from '@/services/receivingOrdersService';

interface AlertItem {
  id: string;
  title: string;
  desc: string;
  type: 'error' | 'warn' | 'info';
  url: string;
  time?: string;
}

const TYPE_CONFIG = {
  error: { bg: 'bg-red-50',   border: 'border-red-100', icon: 'error',   iconCls: 'text-red-500',   dot: 'bg-red-500',   label: 'Nghiêm trọng' },
  warn:  { bg: 'bg-amber-50', border: 'border-amber-100', icon: 'warning', iconCls: 'text-amber-500', dot: 'bg-amber-500', label: 'Cảnh báo' },
  info:  { bg: 'bg-blue-50',  border: 'border-blue-100',  icon: 'info',    iconCls: 'text-blue-500',  dot: 'bg-blue-500',  label: 'Thông tin' },
};

function timeAgo(dateStr: string): string {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'Vừa xong';
  if (diff < 3600) return `${Math.floor(diff/60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff/3600)} giờ trước`;
  return `${Math.floor(diff/86400)} ngày trước`;
}

function AlertSkeleton() {
  return (
    <div className="px-5 py-3.5 border-b border-gray-100 last:border-0 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-lg bg-gray-100 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="w-3/4 h-3 bg-gray-100 rounded mb-1.5" />
          <div className="w-1/2 h-2.5 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlerts() {
      setLoading(true);
      const items: AlertItem[] = [];
      try {
        // 1. Incidents OPEN
        const incidents = await fetchIncidents({ status: 'OPEN', page: 0, size: 5 } as any);
        incidents.content.slice(0, 3).forEach((inc: Incident) => {
          items.push({
            id: `inc-${inc.incidentId}`,
            title: `Sự cố: ${inc.incidentCode}`,
            desc: inc.description?.slice(0, 60) + (inc.description?.length > 60 ? '...' : ''),
            type: inc.severity === 'HIGH' || inc.severity === 'CRITICAL' ? 'error' : 'warn',
            url: '/manager-dashboard/incident',
            time: inc.createdAt,
          });
        });
      } catch { /* no incidents or no access */ }

      try {
        // 2. Receiving orders SUBMITTED (waiting QC)
        const submitted = await fetchReceivingOrders({ status: 'SUBMITTED', page: 0, size: 3 });
        submitted.content.slice(0, 2).forEach(r => {
          items.push({
            id: `sub-${r.receivingId}`,
            title: `Chờ QC: ${r.receivingCode}`,
            desc: `${r.supplierName ?? 'Nhà cung cấp'} — ${r.totalQty} kiện cần kiểm tra`,
            type: 'warn',
            url: '/qc-inspections',
            time: r.updatedAt ?? r.createdAt,
          });
        });
      } catch { /* no access */ }

      try {
        // 3. GRN waiting approval
        const grn = await fetchReceivingOrders({ status: 'GRN_CREATED', page: 0, size: 3 });
        grn.content.slice(0, 2).forEach(r => {
          items.push({
            id: `grn-${r.receivingId}`,
            title: `GRN chờ duyệt: ${r.receivingCode}`,
            desc: `${r.supplierName ?? '—'} — ${r.totalExpectedQty} đơn vị`,
            type: 'info',
            url: '/manager-dashboard/grn',
            time: r.updatedAt ?? r.createdAt,
          });
        });
      } catch { /* no access */ }

      // Sort by time desc
      items.sort((a, b) => {
        if (!a.time || !b.time) return 0;
        return new Date(b.time).getTime() - new Date(a.time).getTime();
      });

      // Fallback if completely empty (all APIs failed or no data)
      if (items.length === 0) {
        items.push(
          { id: 'fb1', title: 'Không có cảnh báo mới', desc: 'Hệ thống đang hoạt động bình thường', type: 'info', url: '#' },
        );
      }

      setAlerts(items.slice(0, 5));
      setLoading(false);
    }

    loadAlerts();
  }, []);

  const errorCount = alerts.filter(a => a.type === 'error').length;
  const warnCount  = alerts.filter(a => a.type === 'warn').length;
  const totalUrgent = errorCount + warnCount;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Cảnh báo gần đây</h3>
          <p className="text-xs text-gray-400 mt-0.5">Cần xử lý ngay</p>
        </div>
        {!loading && totalUrgent > 0 && (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            {totalUrgent} cần xử lý
          </span>
        )}
      </div>

      {/* List */}
      <div className="flex-1 divide-y divide-gray-100 overflow-y-auto">
        {loading
          ? Array(3).fill(0).map((_, i) => <AlertSkeleton key={i} />)
          : alerts.map(alert => {
              const t = TYPE_CONFIG[alert.type];
              return (
                <Link key={alert.id} href={alert.url}
                  className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors group">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${t.bg} border ${t.border}`}>
                    <span className={`material-symbols-outlined text-[15px] ${t.iconCls}`}>{t.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-800 group-hover:text-gray-900 truncate">{alert.title}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5 truncate">{alert.desc}</p>
                    {alert.time && (
                      <p className="text-[10px] text-gray-300 mt-0.5">{timeAgo(alert.time)}</p>
                    )}
                  </div>
                  <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-gray-500 flex-shrink-0 mt-1 transition-colors">
                    chevron_right
                  </span>
                </Link>
              );
            })
        }
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50">
        <Link href="/manager-dashboard/incident"
          className="flex items-center justify-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors">
          Xem tất cả cảnh báo
          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
        </Link>
      </div>
    </div>
  );
}
