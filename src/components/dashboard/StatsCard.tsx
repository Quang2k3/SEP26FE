'use client';

import React from 'react';
import Link from 'next/link';
import type { StatsCardProps } from '@/interfaces/dashboard';

export default function StatsCard({
  title,
  value,
  unit,
  hasAlert,
  showProgress,
  progressValue = 0,
  href, // <--- Nhận prop này
}: StatsCardProps) {
  const getProgressColor = (val: number) => {
    if (val >= 85) return 'bg-red-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  // Nội dung bên trong thẻ (Giữ nguyên giao diện xịn xò của chúng ta)
  const CardContent = (
    <div className={`bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between min-h-[140px] group transition-all relative overflow-hidden h-full ${href ? 'hover:shadow-md hover:border-blue-300 cursor-pointer hover:-translate-y-0.5' : ''}`}>
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700 transition-colors">{title}</span>
        {hasAlert && (
          <span className="material-symbols-outlined text-red-500 bg-red-50 p-1 rounded-md text-[18px] shadow-sm animate-pulse" title="Attention Required">
            warning
          </span>
        )}
        {/* Nếu thẻ này click được, hiện thêm icon mũi tên nhỏ */}
        {href && !hasAlert && (
           <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500 transition-colors text-[18px] opacity-0 group-hover:opacity-100">
             arrow_forward
           </span>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{value}</span>
          {unit && <span className="text-sm font-medium text-gray-500 mb-1">{unit}</span>}
        </div>
        {showProgress && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progressValue)}`} style={{ width: `${progressValue}%` }} />
          </div>
        )}
      </div>
      {hasAlert && <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>}
    </div>
  );

  // Nếu truyền href vào, bọc nó bằng Link. Nếu không, trả về div bình thường.
  return href ? (
    <Link href={href} className="block h-full outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg">
      {CardContent}
    </Link>
  ) : (
    CardContent
  );
}