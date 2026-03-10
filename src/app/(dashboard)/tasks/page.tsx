'use client';

import React, { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import type { Task } from '@/interfaces/dashboard';

// Mock Data gốc
const MOCK_TASKS: Task[] = [
  { id: 'PT-8291', type: 'Putaway', status: 'In Progress', priority: 'URGENT', sku: 'LOGI-MX-2', desc: 'Wireless Mouse x48', location: 'Zone A / B12', assigned: 'M. Chen', etc: '12m' },
  { id: 'PT-8305', type: 'Putaway', status: 'Unassigned', priority: 'URGENT', sku: 'APPLE-MBP', desc: 'Laptop 14" x5', location: 'Zone A / D02', assigned: null, etc: '8m' },
  { id: 'PT-8295', type: 'Picking', status: 'Unassigned', priority: 'Medium', sku: 'DEL-U24', desc: '24" Monitor x12', location: 'Zone B / C04', assigned: null, etc: '25m' },
  { id: 'PT-8302', type: 'Picking', status: 'In Progress', priority: 'Low', sku: 'KEY-MECH', desc: 'Mechanical Keyboard x102', location: 'Zone C / A01', assigned: 'S. Jenkins', etc: '45m' },
  { id: 'PT-8310', type: 'Picking', status: 'Exceptions', priority: 'URGENT', sku: 'SAM-TV55', desc: '55" OLED TV x2', location: 'Zone B / C10', assigned: 'B. Wayne', etc: 'Blocked' },
  { id: 'IT-9001', type: 'Internal', status: 'Exceptions', priority: 'Medium', sku: 'RACK-01', desc: 'Pallet Relocation', location: 'Zone D', assigned: 'T. Stark', etc: 'Paused' },
];

function PendingTasksContent() {
  const searchParams = useSearchParams();
  
  // 2. STATE CHỨA DỮ LIỆU TỪ API
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // GIẢ LẬP GỌI API (SAU NÀY THAY BẰNG FETCH THẬT Ở ĐÂY)
  useEffect(() => {
    setIsLoading(true);
    // Giả lập delay mạng 0.5s
    const timer = setTimeout(() => {
      setTasks(MOCK_TASKS);
      setIsLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // STATES CHO BỘ LỌC
  const [activeTab, setActiveTab] = useState<Task['type']>('Picking');
  const [activeSubFilter, setActiveSubFilter] = useState<Task['status'] | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Newest');

  // 3. STATE CHO CHECKBOX
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Bắt URL Parameters
  useEffect(() => {
    const searchFromUrl = searchParams.get('search');
    const sortFromUrl = searchParams.get('sort');

    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
      if (searchFromUrl.includes('PT-')) setActiveTab('Picking');
    }
    if (sortFromUrl === 'priority') setSortOption('Priority');
  }, [searchParams]);

  // Lọc dữ liệu dựa trên các state
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (task.type !== activeTab) return false;
      if (activeSubFilter !== 'All' && task.status !== activeSubFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return task.id.toLowerCase().includes(query) || task.sku.toLowerCase().includes(query);
      }
      return true;
    });
  }, [tasks, activeTab, activeSubFilter, searchQuery]);

  // Đếm số lượng cho Sub-filters
  const countAll = tasks.filter(t => t.type === activeTab).length;
  const countUnassigned = tasks.filter(t => t.type === activeTab && t.status === 'Unassigned').length;
  const countInProgress = tasks.filter(t => t.type === activeTab && t.status === 'In Progress').length;
  const countExceptions = tasks.filter(t => t.type === activeTab && t.status === 'Exceptions').length;

  // LOGIC XỬ LÝ CHECKBOX
  const isAllSelected = filteredTasks.length > 0 && selectedTaskIds.length === filteredTasks.length;

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds([]); // Bỏ chọn tất cả
    } else {
      setSelectedTaskIds(filteredTasks.map(t => t.id)); // Chọn tất cả các dòng ĐANG HIỂN THỊ
    }
  };

  const handleSelectRow = (taskId: string) => {
    setSelectedTaskIds(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId) // Bỏ chọn dòng này
        : [...prev, taskId] // Thêm dòng này vào danh sách
    );
  };

  // Reset checkbox khi đổi tab hoặc đổi filter
  useEffect(() => {
    setSelectedTaskIds([]);
  }, [activeTab, activeSubFilter, searchQuery]);

  // Logic Nút Hành động hàng loạt (Mock)
  const handleBulkReassign = () => {
    if (selectedTaskIds.length === 0) {
      alert("Please select at least one task first.");
      return;
    }
    alert(`Mở Modal để gán lại cho ${selectedTaskIds.length} tasks: \n${selectedTaskIds.join(', ')}`);
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 font-sans">
      {/* ... Page Header & Stats Board giữ nguyên ... */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Pending Tasks Drill-down</h1>
          <p className="mt-1 text-sm text-gray-500">Overview of operational workloads and resource allocation.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-md px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500 transition-all flex-1 md:w-64 shadow-sm">
             <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
             <input 
               type="text" 
               className="w-full bg-transparent border-none p-0 text-sm focus:outline-none text-gray-900 placeholder-gray-400" 
               placeholder="Search tasks..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </div>
          <button className="px-4 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">download</span>
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* TABS CHÍNH */}
        <div className="flex border-b border-gray-200 bg-gray-50/50 px-2 pt-2">
          {(['Putaway', 'Picking', 'Internal'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button 
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setActiveSubFilter('All');
                }}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors outline-none focus:ring-inset focus:ring-2 focus:ring-blue-500 ${
                  isActive 
                    ? 'border-blue-600 text-blue-600 bg-white rounded-t-md' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-t-md'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* DẢI SUB-FILTERS */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex gap-2 overflow-x-auto">
          <button 
            onClick={() => setActiveSubFilter('All')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full shadow-sm whitespace-nowrap transition-colors ${activeSubFilter === 'All' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            All Tasks ({countAll})
          </button>
          <button 
            onClick={() => setActiveSubFilter('Unassigned')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-sm ${activeSubFilter === 'Unassigned' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeSubFilter === 'Unassigned' ? 'bg-red-600 animate-pulse' : 'bg-red-400'}`}></span>
            Unassigned ({countUnassigned})
          </button>
          <button 
            onClick={() => setActiveSubFilter('In Progress')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-sm ${activeSubFilter === 'In Progress' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeSubFilter === 'In Progress' ? 'bg-blue-600' : 'bg-blue-400'}`}></span>
            In Progress ({countInProgress})
          </button>
          <button 
            onClick={() => setActiveSubFilter('Exceptions')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap flex items-center gap-1.5 transition-colors shadow-sm ${activeSubFilter === 'Exceptions' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${activeSubFilter === 'Exceptions' ? 'bg-amber-500' : 'bg-amber-400'}`}></span>
            Exceptions ({countExceptions})
          </button>
        </div>

        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap justify-between items-center gap-4 bg-gray-50/30">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={isAllSelected}
                onChange={handleSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Select All</span>
            </label>
            <div className="w-px h-5 bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500"><strong className="text-gray-700">Filter:</strong> All Zones</span>
              <span className="text-sm text-gray-500"><strong className="text-gray-700">Sort:</strong> {sortOption}</span>
            </div>
            {/* Hiển thị số lượng đang chọn */}
            {selectedTaskIds.length > 0 && (
              <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                {selectedTaskIds.length} selected
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50" disabled={selectedTaskIds.length === 0}>
              Update Priority
            </button>
            <button 
              onClick={handleBulkReassign}
              disabled={selectedTaskIds.length === 0}
              className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:bg-gray-100 disabled:text-gray-400 disabled:border-gray-200"
            >
              Bulk Re-assign
            </button>
          </div>
        </div>

        {/* Tasks Table */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
             <div className="flex justify-center items-center h-48">
               <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
             </div>
          ) : (
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-12 px-4 py-3 text-center"></th>
                  <th className="w-28 px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Task ID</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU / Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Assigned</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">ETC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">
                      No tasks found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr 
                      key={task.id} 
                      className={`transition-colors group ${selectedTaskIds.includes(task.id) ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-4 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedTaskIds.includes(task.id)}
                          onChange={() => handleSelectRow(task.id)}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                        />
                      </td>
                      <td className="px-4 py-4">
                        {task.priority === 'URGENT' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5 animate-pulse"></span>URGENT
                          </span>
                        ) : task.priority === 'Medium' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">Medium</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">Low</span>
                        )}
                      </td>
                      <td className="px-4 py-4"><span className="text-sm font-bold text-blue-600 hover:underline cursor-pointer">{task.id}</span></td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">{task.sku}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{task.desc}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="inline-flex items-center text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                          <span className="material-symbols-outlined text-[14px] mr-1 text-gray-400">location_on</span>{task.location}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {task.assigned ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shadow-sm">{task.assigned.charAt(0)}</div>
                            <span className="text-sm text-gray-700 font-medium">{task.assigned}</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100 shadow-sm cursor-pointer hover:bg-red-100 transition-colors">UNASSIGNED</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right"><span className="text-sm font-bold text-gray-900">{task.etc}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PendingTasksPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <PendingTasksContent />
    </Suspense>
  );
}