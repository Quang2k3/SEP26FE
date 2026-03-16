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
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, loading, emptyText = "No data", page = 0, totalPages = 0, totalElements = 0, pageSize = 10, onPrev, onNext, onRowClick }: DataTableProps<T>) {
  const from = totalElements === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(totalElements, (page + 1) * pageSize);

  return (
    <div className="overflow-hidden bg-white rounded-2xl border border-indigo-100/60 shadow-sm">
      <div className="overflow-x-auto">
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
      <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="text-xs text-gray-400">
          {totalElements > 0 ? <>Showing <span className="font-semibold text-gray-600">{from}</span> to <span className="font-semibold text-gray-600">{to}</span> of <span className="font-semibold text-gray-600">{totalElements}</span></> : "No data"}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onPrev} disabled={page === 0}>Previous</Button>
          <span className="text-xs text-gray-500">Page {totalPages === 0 ? 0 : page + 1} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={onNext} disabled={page >= totalPages - 1}>Next</Button>
        </div>
      </div>
    </div>
  );
}