'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { fetchPutawayTasks, type PutawayTask, type PutawayStatus } from '@/services/putawayService';
import toast from 'react-hot-toast';

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  OPEN:        { label: 'Open',        className: 'bg-yellow-50 text-yellow-700 border border-yellow-200' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-blue-50 text-blue-700 border border-blue-200' },
  DONE:        { label: 'Done',        className: 'bg-green-50 text-green-700 border border-green-200' },
};

function PutawayTasksContent() {
  const [tasks, setTasks] = useState<PutawayTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PutawayStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const loadTasks = async (p = 0) => {
    setLoading(true);
    try {
      const data = await fetchPutawayTasks({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page: p,
        size: 10,
      });
      setTasks(data.content ?? []);
      setTotalPages(data.totalPages ?? 0);
      setTotalElements(data.totalElements ?? 0);
    } catch {
      toast.error('Không thể tải danh sách Putaway Tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(0);
    loadTasks(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Putaway Tasks</h1>
          <p className="mt-1 text-sm text-gray-500">
            Danh sách nhiệm vụ cất hàng sau khi GRN được duyệt và nhập kho.
          </p>
        </div>
        <div className="text-sm text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-md shadow-sm">
          Tổng: <strong className="text-gray-900">{totalElements}</strong> tasks
        </div>
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['ALL', 'OPEN', 'IN_PROGRESS', 'DONE'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
              statusFilter === s
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'ALL' ? 'Tất cả' :
             s === 'OPEN' ? 'Chưa làm' :
             s === 'IN_PROGRESS' ? 'Đang làm' : 'Hoàn thành'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
            <div className="flex justify-center items-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task Code</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phiếu nhận</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Số dòng</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Trạng thái</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Giao cho</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Ngày tạo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">
                      Không có Putaway Task nào.
                    </td>
                  </tr>
                ) : (
                  tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-blue-600">
                          {task.taskCode}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        #{task.receivingId}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-medium text-gray-900">
                          {task.items?.length ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          STATUS_BADGE[task.status]?.className ?? 'bg-gray-100 text-gray-600'
                        }`}>
                          {STATUS_BADGE[task.status]?.label ?? task.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {task.assignedToName ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                              {task.assignedToName.charAt(0)}
                            </div>
                            {task.assignedToName}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Chưa giao</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-white">
            <span className="text-sm text-gray-500">
              Trang {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => { setPage(p => p - 1); loadTasks(page - 1); }}
                className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                Trước
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => { setPage(p => p + 1); loadTasks(page + 1); }}
                className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PendingTasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <PutawayTasksContent />
    </Suspense>
  );
}