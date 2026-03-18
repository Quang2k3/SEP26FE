"use client";

import React from "react";
import { Button } from "./Button";

export interface Column<T> {
  key: string;
  title: string;
  align?: "left" | "center" | "right";
  width?: string | number;
  render: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyText?: string;
  page?: number;
  totalPages?: number;
  totalElements?: number;
  pageSize?: number;
  onPrev?: () => void;
  onNext?: () => void;
  onGoToPage?: (p: number) => void;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, loading, emptyText = "No data", page = 0, totalPages = 0, totalElements = 0, pageSize = 10, onPrev, onNext, onGoToPage, onRowClick }: DataTableProps<T>) {
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-indigo-100/60 shadow-sm overflow-hidden">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase text-gray-400 font-semibold tracking-wider" style={{ background: 'linear-gradient(90deg,#f8faff,#f5f3ff)' }}>
              {columns.map((col) => (
                <th key={col.key} className={`px-6 py-3 text-${col.align || "left"}`} style={{ width: col.width }}>
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 text-sm">
            {loading && data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-6 py-6 text-center text-gray-400">Loading...</td></tr>
            ) : data.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-6 py-6 text-center text-gray-400">{emptyText}</td></tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={index}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-indigo-50/40 transition-colors ${onRowClick ? "cursor-pointer" : ""}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={`px-6 py-3 text-${col.align || "left"}`}>
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 0 && (
        <div className="px-6 py-3.5 border-t border-gray-100 bg-white sticky bottom-0 z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_-1px_0_0_#f3f4f6]">
          <div className="text-xs text-gray-400">
            {totalElements > 0
              ? <><span className="font-semibold text-gray-600">{totalElements}</span> bản ghi · trang <span className="font-semibold text-gray-600">{page + 1}</span>/<span className="font-semibold text-gray-600">{totalPages}</span></>
              : "Không có dữ liệu"}
          </div>
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button onClick={onPrev} disabled={page === 0}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
              ‹
            </button>
            {/* Page numbers */}
            {(() => {
              const pages: (number | '...')[] = [];
              if (totalPages <= 7) {
                for (let i = 0; i < totalPages; i++) pages.push(i);
              } else {
                pages.push(0);
                if (page > 2) pages.push('...');
                for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) pages.push(i);
                if (page < totalPages - 3) pages.push('...');
                pages.push(totalPages - 1);
              }
              return pages.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-xs text-gray-400">…</span>
                ) : (
                  <button key={p} onClick={() => onGoToPage?.(p as number)}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors
                      ${p === page ? 'bg-indigo-600 text-white shadow-sm' : 'border border-gray-200 text-gray-600 hover:bg-indigo-50 hover:border-indigo-300'}`}>
                    {(p as number) + 1}
                  </button>
                )
              );
            })()}
            {/* Next */}
            <button onClick={onNext} disabled={page >= totalPages - 1}
              className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-sm">
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}