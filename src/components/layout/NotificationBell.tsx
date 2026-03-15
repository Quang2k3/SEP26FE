'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession } from '@/services/authService';
import {
  fetchNotificationsForRole,
  NOTIFICATION_CHANNELS,
  ROLE_CHANNELS,
  type NotificationItem,
  type NotificationType,
} from '@/services/notificationService';

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)   return 'Vừa xong';
    if (diffMin < 60)  return `${diffMin} phút trước`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)    return `${diffH} giờ trước`;
    return d.toLocaleDateString('vi-VN');
  } catch { return '—'; }
}

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen]           = useState(false);
  const [loading, setLoading]     = useState(false);
  const [activeTab, setActiveTab] = useState<NotificationType | 'all'>('all');
  const [data, setData]           = useState<Map<NotificationType, NotificationItem[]>>(new Map());
  const [userRole, setUserRole]   = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    const roles = session?.user?.roleCodes ?? [];
    if (roles.includes('MANAGER'))     setUserRole('MANAGER');
    else if (roles.includes('QC'))     setUserRole('QC');
    else if (roles.includes('KEEPER')) setUserRole('KEEPER');
  }, []);

  const channels: NotificationType[] = userRole ? (ROLE_CHANNELS[userRole] ?? []) : [];

  const load = useCallback(async (showLoading = false) => {
    if (!userRole) return;
    if (showLoading) setLoading(true);
    try {
      const result = await fetchNotificationsForRole(userRole);
      setData(result);
    } catch { /* silent */ }
    finally { if (showLoading) setLoading(false); }
  }, [userRole]);

  // Polling 30s
  useEffect(() => {
    if (!userRole) return;
    load();
    intervalRef.current = setInterval(() => load(), 30_000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [userRole, load]);

  // Load on open
  useEffect(() => {
    if (open) load(true);
  }, [open, load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!userRole || channels.length === 0) return null;

  // Total count across all channels
  const totalCount = [...data.values()].reduce((s, items) => s + items.length, 0);

  // Items to display based on active tab
  const displayItems: (NotificationItem & { channel: NotificationType })[] =
    activeTab === 'all'
      ? channels.flatMap(ch => (data.get(ch) ?? []).map(item => ({ ...item, channel: ch })))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 12)
      : (data.get(activeTab) ?? []).map(item => ({ ...item, channel: activeTab }));

  return (
    <div className="relative" ref={dropdownRef}>

      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative w-9 h-9 rounded-full flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:ring-offset-2 border hover:border-indigo-100"
        style={{ background: 'rgba(238,242,255,0.8)', borderColor: 'rgba(199,210,254,0.6)' }}
      >
        <span className="material-symbols-outlined text-indigo-400 text-[20px]">notifications</span>
        {totalCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {totalCount > 99 ? '99+' : totalCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute right-0 mt-2 w-96 rounded-2xl shadow-2xl border border-indigo-100/60 overflow-hidden z-50 flex flex-col"
          style={{ background: 'rgba(255,255,255,0.98)', backdropFilter: 'blur(16px)', maxHeight: '520px' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-500 text-[16px]">notifications</span>
              </div>
              <p className="text-sm font-bold text-gray-900">Thông báo</p>
            </div>
            <div className="flex items-center gap-2">
              {totalCount > 0 && (
                <span className="bg-red-50 text-red-600 text-[11px] font-bold px-2 py-0.5 rounded-full">
                  {totalCount} mới
                </span>
              )}
              <button
                onClick={() => load(true)}
                className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <span className={`material-symbols-outlined text-[14px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              </button>
            </div>
          </div>

          {/* Tab bar — chỉ hiện khi có nhiều hơn 1 channel */}
          {channels.length > 1 && (
            <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto bg-gray-50/50">
              <button
                onClick={() => setActiveTab('all')}
                className={`flex-shrink-0 px-3.5 py-2 text-[11px] font-semibold transition-colors border-b-2 ${
                  activeTab === 'all'
                    ? 'border-indigo-500 text-indigo-700 bg-white'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                Tất cả
                {totalCount > 0 && (
                  <span className="ml-1.5 bg-indigo-100 text-indigo-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {totalCount}
                  </span>
                )}
              </button>
              {channels.map(ch => {
                const cfg = NOTIFICATION_CHANNELS[ch];
                const count = data.get(ch)?.length ?? 0;
                return (
                  <button
                    key={ch}
                    onClick={() => setActiveTab(ch)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-semibold transition-colors border-b-2 ${
                      activeTab === ch
                        ? 'border-indigo-500 text-indigo-700 bg-white'
                        : 'border-transparent text-gray-400 hover:text-gray-700'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                    {cfg.label}
                    {count > 0 && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Notification list */}
          <div className="overflow-y-auto flex-1">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="material-symbols-outlined animate-spin text-indigo-400 text-[28px]">progress_activity</span>
              </div>
            ) : displayItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <span className="material-symbols-outlined text-gray-200 text-[40px]">notifications_off</span>
                <p className="text-xs text-gray-400">Không có thông báo mới</p>
              </div>
            ) : (
              displayItems.map(item => {
                const cfg = NOTIFICATION_CHANNELS[item.channel];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => { setOpen(false); router.push(item.navigateTo); }}
                    className="w-full text-left px-4 py-3 hover:bg-indigo-50/50 border-b border-gray-50 last:border-0 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-50 group-hover:bg-white transition-colors`}>
                        <span className={`material-symbols-outlined text-[16px] ${cfg.color}`}>{cfg.icon}</span>
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-0.5">
                          <p className="text-xs font-bold text-gray-900 truncate">{item.code}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(item.createdAt)}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 truncate">{item.subtitle}</p>
                        <p className={`text-[10px] font-medium mt-0.5 ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-indigo-400 transition-colors flex-shrink-0 mt-1.5">
                        chevron_right
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer — xem tất cả theo từng tab */}
          {displayItems.length > 0 && (
            <div className="border-t border-gray-100 flex-shrink-0 bg-gray-50/30">
              {activeTab === 'all' ? (
                <div className="grid divide-x divide-gray-100" style={{ gridTemplateColumns: `repeat(${channels.length}, 1fr)` }}>
                  {channels.map(ch => {
                    const cfg = NOTIFICATION_CHANNELS[ch];
                    const count = data.get(ch)?.length ?? 0;
                    if (count === 0) return null;
                    return (
                      <button
                        key={ch}
                        onClick={() => { setOpen(false); router.push(cfg.type === 'incident_open' ? '/manager-dashboard/incident' : NOTIFICATION_CHANNELS[ch].type === 'putaway_pending' ? '/tasks' : NOTIFICATION_CHANNELS[ch].type === 'grn_pending_approval' ? '/manager-dashboard/grn' : NOTIFICATION_CHANNELS[ch].type === 'outbound_pending_approval' ? '/outbound' : NOTIFICATION_CHANNELS[ch].type === 'receiving_pending_qc' ? '/inbound/gate-check' : '/dashboard'); }}
                        className="px-3 py-2 text-[11px] text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors flex items-center justify-center gap-1 font-medium"
                      >
                        <span className="material-symbols-outlined text-[13px]">{cfg.icon}</span>
                        {count} {cfg.label.split(' ').at(-1)}
                      </button>
                    );
                  }).filter(Boolean)}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    const ch = activeTab as NotificationType;
                    const navMap: Record<NotificationType, string> = {
                      grn_pending_approval: '/manager-dashboard/grn',
                      outbound_pending_approval: '/outbound',
                      incident_open: '/manager-dashboard/incident',
                      receiving_pending_qc: '/inbound/gate-check',
                      putaway_pending: '/tasks',
                    };
                    router.push(navMap[ch]);
                  }}
                  className="w-full px-4 py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-1"
                >
                  Xem tất cả
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
