'use client';

import Link from 'next/link';

interface StatsCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: string;
  color?: 'blue' | 'violet' | 'amber' | 'emerald' | 'red';
  hasAlert?: boolean;
  showProgress?: boolean;
  progressValue?: number;
  href?: string;
  trend?: number;      // % thay đổi so hôm qua (dương = tăng, âm = giảm)
  trendLabel?: string; // vd: "so hôm qua"
  loading?: boolean;
}

const COLOR_MAP = {
  blue:    { icon: 'bg-blue-50 text-blue-600',     bar: 'bg-blue-500',    value: 'text-blue-600',    ring: 'hover:ring-blue-200',   accent: '#3b82f6', lightBg: '#eff6ff' },
  violet:  { icon: 'bg-violet-50 text-violet-600',  bar: 'bg-violet-500',  value: 'text-violet-600',  ring: 'hover:ring-violet-200', accent: '#7c3aed', lightBg: '#f5f3ff' },
  amber:   { icon: 'bg-amber-50 text-amber-600',    bar: 'bg-amber-500',   value: 'text-amber-600',   ring: 'hover:ring-amber-200',  accent: '#d97706', lightBg: '#fffbeb' },
  emerald: { icon: 'bg-emerald-50 text-emerald-600', bar:'bg-emerald-500', value: 'text-emerald-600', ring: 'hover:ring-emerald-200',accent: '#059669', lightBg: '#ecfdf5' },
  red:     { icon: 'bg-red-50 text-red-600',        bar: 'bg-red-500',     value: 'text-red-600',     ring: 'hover:ring-red-200',    accent: '#dc2626', lightBg: '#fef2f2' },
};

function TrendBadge({ trend, label }: { trend: number; label?: string }) {
  const isUp = trend > 0;
  const isNeutral = trend === 0;

  if (isNeutral) return null;

  return (
    <div className={`flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full
      ${isUp ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
      <span className="material-symbols-outlined text-[12px]">
        {isUp ? 'trending_up' : 'trending_down'}
      </span>
      {isUp ? '+' : ''}{trend}%
      {label && <span className="font-normal text-[10px] opacity-70 ml-0.5">{label}</span>}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 h-full animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="w-9 h-9 rounded-xl bg-gray-100" />
        <div className="w-14 h-5 rounded-full bg-gray-100" />
      </div>
      <div className="w-20 h-3 rounded bg-gray-100 mb-2" />
      <div className="w-28 h-7 rounded bg-gray-100" />
    </div>
  );
}

export default function StatsCard({
  title, value, unit, icon = 'analytics', color = 'blue',
  hasAlert, showProgress, progressValue = 0, href,
  trend, trendLabel = 'vs hôm qua', loading,
}: StatsCardProps) {
  if (loading) return <SkeletonCard />;

  const c = COLOR_MAP[color];
  const getBarColor = (v: number) => v >= 85 ? 'bg-red-500' : v >= 65 ? 'bg-amber-500' : 'bg-emerald-500';

  const inner = (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-3.5 h-full
      transition-all duration-200 relative overflow-hidden
      ${href ? `hover:shadow-md hover:-translate-y-0.5 hover:ring-2 ${c.ring} cursor-pointer` : ''}`}>

      {/* Subtle top accent */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ background: c.accent }} />

      {/* Top row */}
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
          <span className="material-symbols-outlined text-[19px]">{icon}</span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {hasAlert && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              Alert
            </span>
          )}
          {trend !== undefined && <TrendBadge trend={trend} label={trendLabel} />}
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-xs font-medium text-gray-500 mb-1">{title}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-2xl font-extrabold tracking-tight ${c.value}`}>{value}</span>
          {unit && <span className="text-xs font-medium text-gray-400">{unit}</span>}
        </div>
      </div>

      {/* Progress bar */}
      {showProgress && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] text-gray-400">
            <span>Mức sử dụng</span>
            <span className="font-semibold text-gray-600">{progressValue}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBarColor(progressValue)}`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );

  return href
    ? <Link href={href} className="block h-full outline-none">{inner}</Link>
    : inner;
}
