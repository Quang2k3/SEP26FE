'use client';

import React, { useState } from 'react';

// --- MOCK DATA ---
const MOCK_RESULTS = [
  { id: 'BN-4029-A', zone: 'Zone A', type: 'Standard Pallet', dimensions: '1.2 x 1.0 x 1.5 m', vol: '1.80 m³', status: 'EMPTY' },
  { id: 'BN-1088-B', zone: 'Zone B', type: 'Euro Pallet', dimensions: '1.2 x 0.8 x 1.4 m', vol: '0.65 m³', status: '45% FULL' },
  { id: 'BN-2241-A', zone: 'Zone A', type: 'Standard Pallet', dimensions: '1.2 x 1.0 x 1.5 m', vol: '1.80 m³', status: 'EMPTY' },
  { id: 'BN-9033-D', zone: 'Zone D', type: 'Small Parts Bin', dimensions: '0.4 x 0.4 x 0.3 m', vol: '0.04 m³', status: 'EMPTY' },
  { id: 'BN-1125-B', zone: 'Zone B', type: 'Euro Pallet', dimensions: '1.2 x 0.8 x 1.4 m', vol: '0.42 m³', status: '60% FULL' },
];

export default function SearchEmptyBinPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 800);
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-gray-50/50 font-sans overflow-y-auto">
      
      {/* Tiêu đề trang */}
      <div className="mb-8">
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Search Empty Bin</h2>
        <p className="text-gray-500 mt-1">Find available storage space based on zone and capacity.</p>
      </div>

      {/* KHỐI BỘ LỌC (Filters) */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-8">
        <div className="flex items-center gap-2 mb-6">
          <span className="material-symbols-outlined text-blue-600">filter_alt</span>
          <span className="text-lg font-bold text-gray-800">Filter Criteria</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Zone</label>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option>All Zones</option>
              <option>Zone A - General</option>
              <option>Zone B - Cold</option>
              <option>Zone C - Hazardous</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Required Capacity (m³)</label>
            <input 
              type="number" 
              placeholder="0.00" 
              className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Bin Type</label>
            <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all">
              <option>Any Type</option>
              <option>Standard Pallet</option>
              <option>Euro Pallet</option>
              <option>Small Parts</option>
            </select>
          </div>

          <div className="flex items-end gap-2">
            <button 
              onClick={handleSearch}
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm flex justify-center items-center gap-2"
            >
              {isLoading ? <span className="material-symbols-outlined animate-spin">sync</span> : 'Search Now'}
            </button>
            <button className="p-2.5 border border-gray-200 rounded-lg hover:bg-gray-100 text-gray-500 transition-all">
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>
        </div>
      </div>

      {/* KẾT QUẢ TÌM KIẾM (Table) */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <p className="text-sm font-bold text-gray-500 italic">Found 5 available bins matching criteria</p>
          <button className="flex items-center gap-2 text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span> Export Results
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bin ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Dimensions</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avail. Vol</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_RESULTS.map((bin) => (
                <tr key={bin.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="px-6 py-4 font-bold text-blue-600 text-sm">{bin.id}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{bin.zone}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bin.type}</td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-400">{bin.dimensions}</td>
                  <td className="px-6 py-4 text-sm font-bold text-gray-900">{bin.vol}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      bin.status === 'EMPTY' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {bin.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button className="bg-gray-900 hover:bg-black text-white px-3 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm">
                      RESERVE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-50 flex justify-center items-center gap-1">
            <button className="p-2 hover:bg-gray-100 rounded-md text-gray-400"><span className="material-symbols-outlined">chevron_left</span></button>
            <button className="w-8 h-8 rounded-md bg-blue-600 text-white text-xs font-bold">1</button>
            <button className="w-8 h-8 rounded-md hover:bg-gray-100 text-gray-600 text-xs font-bold">2</button>
            <button className="w-8 h-8 rounded-md hover:bg-gray-100 text-gray-600 text-xs font-bold">3</button>
            <span className="px-2 text-gray-300">...</span>
            <button className="w-8 h-8 rounded-md hover:bg-gray-100 text-gray-600 text-xs font-bold">12</button>
            <button className="p-2 hover:bg-gray-100 rounded-md text-gray-400"><span className="material-symbols-outlined">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* Ghi chú chân trang */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl flex gap-3">
        <span className="material-symbols-outlined text-blue-400">info</span>
        <div className="text-xs text-blue-700 leading-relaxed">
          <p className="font-bold mb-0.5">Reservation Policy:</p>
          <p>Bin reservations expire automatically after **12 hours** if no stock is received. Reserved bins are excluded from other search results.</p>
        </div>
      </div>

    </div>
  );
}