'use client';

import React, { useState, useMemo } from 'react';

// --- MOCK DATA (Giữ nguyên logic 40 Bin) ---
const MOCK_BINS = Array.from({ length: 40 }, (_, i) => {
  const id = `A-${String(i + 1).padStart(2, '0')}`;
  let capacity = 0;
  let status: 'Empty' | 'Low' | 'Busy' | 'Full' | 'Blocked' = 'Empty';

  if ([4, 8, 16, 25, 31, 38].includes(i + 1)) status = 'Blocked';
  else if ([2, 6, 13, 19, 22, 28, 34, 40].includes(i + 1)) { capacity = Math.floor(Math.random() * 10) + 90; status = 'Full'; }
  else if ([3, 5, 9, 20, 24, 29].includes(i + 1)) { capacity = Math.floor(Math.random() * 40) + 50; status = 'Busy'; }
  else if ([7, 10, 14, 21, 26, 30].includes(i + 1)) { capacity = Math.floor(Math.random() * 49) + 1; status = 'Low'; }

  return { 
    id, 
    zone: 'Zone A', 
    capacity, 
    status,
    row: `0${Math.floor(i / 10) + 1}`, 
    aisle: '04', 
    type: 'Standard Shelf',
    items: capacity > 0 && status !== 'Blocked' ? [
      { sku: '10294-B', name: 'Product Alpha', qty: 14 },
      { sku: '10442-A', name: 'Product Beta', qty: 2 }
    ] : []
  };
});

type Bin = typeof MOCK_BINS[0];

export default function BinOccupancyPage() {
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  const stats = useMemo(() => {
    const total = MOCK_BINS.length;
    const critical = MOCK_BINS.filter(b => b.status === 'Full').length;
    const empty = MOCK_BINS.filter(b => b.status === 'Empty').length;
    return { total, critical, empty, avg: 78.4 };
  }, []);

  const getBinStyle = (status: Bin['status']) => {
    switch (status) {
      case 'Full': return 'bg-red-500 text-white border-red-600';
      case 'Busy': return 'bg-amber-300 text-amber-900 border-amber-400';
      case 'Low': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Blocked': return 'bg-gray-200 text-gray-400 border-gray-300 diagonal-stripes cursor-not-allowed opacity-60';
      case 'Empty': default: return 'bg-white text-gray-400 border-gray-300 border-dashed hover:bg-gray-50';
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden font-sans bg-gray-50/50">
      
      {/* NỘI DUNG CHÍNH (Đã bỏ Header) */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 min-w-0">
        
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Bin Occupancy Overview</h2>
            <p className="text-sm text-gray-500">Visual mapping of warehouse storage slots.</p>
          </div>
        </div>

        {/* Thẻ chỉ số */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Capacity</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total} Bins</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Avg. Occupancy</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.avg}%</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-red-100 shadow-sm">
            <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Critical Bins</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.critical}</p>
          </div>
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Empty Slots</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.empty}</p>
          </div>
        </div>

        {/* Lưới Heatmap */}
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex-1">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-gray-800">Zone A Floor Plan</h3>
            <div className="flex gap-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-white border border-dashed border-gray-300 rounded-sm"></div> Empty</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-blue-100 rounded-sm"></div> Low</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-amber-300 rounded-sm"></div> Busy</span>
              <span className="flex items-center gap-1.5"><div className="w-3 h-3 bg-red-500 rounded-sm"></div> Full</span>
            </div>
          </div>
          
          <style dangerouslySetInnerHTML={{__html: `
            .diagonal-stripes {
              background-image: linear-gradient(45deg, #f3f4f6 25%, #e5e7eb 25%, #e5e7eb 50%, #f3f4f6 50%, #f3f4f6 75%, #e5e7eb 75%, #e5e7eb 100%);
              background-size: 8px 8px;
            }
          `}} />

          <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-10 gap-3">
            {MOCK_BINS.map((bin) => {
              const isSelected = selectedBin?.id === bin.id;
              const isBlocked = bin.status === 'Blocked';

              return (
                <div 
                  key={bin.id}
                  onClick={() => !isBlocked && setSelectedBin(bin)}
                  className={`relative aspect-square border-2 rounded-xl flex items-center justify-center transition-all duration-200
                    ${getBinStyle(bin.status)}
                    ${isSelected ? 'ring-4 ring-blue-500 border-blue-600 scale-110 z-10' : 'border-transparent'}
                    ${!isBlocked ? 'cursor-pointer hover:shadow-lg' : ''}
                  `}
                >
                  <span className={`text-[11px] font-bold ${isBlocked ? 'bg-white/80 px-1 rounded text-gray-400' : ''}`}>
                    {bin.id}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* CHI TIẾT BÊN PHẢI (Sidebar) */}
      {selectedBin && (
        <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shrink-0 animate-in slide-in-from-right-8 duration-300 z-10 shadow-2xl">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <h3 className="text-lg font-bold text-gray-900 tracking-tight">Bin Details</h3>
            <button onClick={() => setSelectedBin(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 text-gray-400 transition-colors">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-8">
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 flex items-center justify-center border-2 rounded-2xl font-bold text-lg ${getBinStyle(selectedBin.status)}`}>
                {selectedBin.id}
              </div>
              <div>
                <p className="font-bold text-gray-900 leading-tight">Row {selectedBin.row}, Aisle {selectedBin.aisle}</p>
                <p className="text-xs text-gray-500 mt-1">{selectedBin.type}</p>
              </div>
            </div>

            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Occupancy</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${selectedBin.capacity >= 90 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${selectedBin.capacity}%` }}></div>
                </div>
                <span className="text-sm font-bold text-gray-900">{selectedBin.capacity}%</span>
              </div>
            </div>

            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2 mb-4">Inventory</p>
              <div className="space-y-3">
                {selectedBin.items.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold text-blue-600">SKU: {item.sku}</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{item.name}</p>
                    <p className="text-xs text-gray-500 mt-1">Qty: <span className="text-gray-900 font-bold">{item.qty} units</span></p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-auto">
              <button className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-colors text-sm">Optimize Bin</button>
              <button className="w-full py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-xl hover:bg-gray-50 shadow-sm transition-colors text-sm">Move Stock</button>
            </div>
          </div>
        </aside>
      )}
    </div>
  );
}