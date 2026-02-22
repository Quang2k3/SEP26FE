'use client';

import React from 'react';

interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  hasAlert?: boolean;
  showProgress?: boolean;
  progressValue?: number;
}

export default function StatsCard({
  title,
  value,
  unit,
  hasAlert,
  showProgress,
  progressValue = 0,
}: StatsCardProps) {
  // Logic tự động đổi màu thanh progress dựa trên chỉ số phần trăm
  const getProgressColor = (val: number) => {
    if (val >= 85) return 'bg-red-500';
    if (val >= 60) return 'bg-amber-500';
    return 'bg-blue-600';
  };

  return (
    <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between min-h-[140px] group hover:shadow-md transition-shadow relative overflow-hidden">
      
      {/* Header của Card */}
      <div className="flex justify-between items-start">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        
        {/* Nút Alert */}
        {hasAlert && (
          <span className="material-symbols-outlined text-red-500 bg-red-50 p-1 rounded-md text-[18px] shadow-sm animate-pulse" title="Attention Required">
            warning
          </span>
        )}
      </div>

      {/* Nội dung chính (Số liệu & Thanh Progress) */}
      <div className="mt-4 flex flex-col gap-1">
        <div className="flex items-end gap-2">
          <span className="text-3xl font-bold text-gray-900 tracking-tight">{value}</span>
          {unit && (
            <span className="text-sm font-medium text-gray-500 mb-1">{unit}</span>
          )}
        </div>
        
        {/* Progress Bar hiện đại */}
        {showProgress && (
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(progressValue)}`}
              style={{ width: `${progressValue}%` }}
            />
          </div>
        )}
      </div>

      {/* Điểm nhấn UX: Thanh viền màu ở đáy nếu có Alert */}
      {hasAlert && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-red-500"></div>
      )}
    </div>
  );
}