'use client';

import React, { useState } from 'react';

// --- MOCK DATA ---
const MOCK_SKUS = [
  { id: 'SKU-001', name: 'Industrial Power Drill X-200', loc: 'Zone A-12, Bin 04', status: 'UNASSIGNED', img: 'drill' },
  { id: 'SKU-002', name: 'Pro-Vision Safety Goggles', loc: 'Zone B-03, Bin 12', status: 'UNASSIGNED', img: 'goggles' },
  { id: 'SKU-003', name: 'Steel-Toe Work Boots (Size 10)', loc: 'Zone C-01, Bin 44', status: 'DRAFT', img: 'boots' },
  { id: 'SKU-004', name: 'Compact Circular Power Saw', loc: 'Zone A-09, Bin 21', status: 'ASSIGNED', img: 'saw' },
];

export default function SKUToCategoryPage() {
  const [selectedIds, setSelectedIds] = useState<string[]>(['SKU-001', 'SKU-002', 'SKU-003']);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 font-sans relative overflow-hidden h-full">
      
      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8">
        
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight uppercase italic">Assign Category to SKU</h2>
          <p className="text-gray-500 mt-1 font-medium italic">Assign product categories to storage zones to optimize warehouse flow.</p>
        </div>

        <div className="grid grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI: DANH SÁCH SKU (8 columns) */}
          <div className="col-span-12 lg:col-span-8 flex flex-col gap-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-[0.2em]">Unassigned SKUs List</h3>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">Filter (All)</button>
                <button className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:bg-gray-50">Sort By ▼</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100">
                    <th className="px-6 py-4 w-12">
                      <input type="checkbox" className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" readOnly checked={selectedIds.length === 3} />
                    </th>
                    <th className="px-4 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Image</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">SKU / Description</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Warehouse Loc</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MOCK_SKUS.map((sku) => (
                    <tr 
                      key={sku.id} 
                      className={`transition-colors ${selectedIds.includes(sku.id) ? 'bg-blue-50/40' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" 
                          checked={selectedIds.includes(sku.id)}
                          onChange={() => toggleSelect(sku.id)}
                          disabled={sku.status === 'ASSIGNED'}
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-300">image</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`text-sm font-black ${sku.status === 'ASSIGNED' ? 'text-gray-300' : 'text-gray-900'}`}>{sku.id}</div>
                        <div className={`text-[11px] font-medium italic ${sku.status === 'ASSIGNED' ? 'text-gray-300' : 'text-gray-500'}`}>{sku.name}</div>
                      </td>
                      <td className={`px-6 py-4 text-xs font-bold ${sku.status === 'ASSIGNED' ? 'text-gray-300' : 'text-gray-600'}`}>
                        {sku.loc}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded text-[10px] font-black tracking-tighter uppercase ${
                          sku.status === 'UNASSIGNED' ? 'bg-blue-100 text-blue-700' : 
                          sku.status === 'DRAFT' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-400'
                        }`}>
                          {sku.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 flex gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <span>Total Selected: {selectedIds.length}</span>
                <button className="text-blue-600 hover:underline">Select All</button>
                <button className="hover:text-red-500">Clear</button>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: BẢNG ĐIỀU KHIỂN CATEGORY (4 columns) */}
          <div className="col-span-12 lg:col-span-4">
            <div className="bg-white rounded-2xl border-2 border-gray-900 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] p-6 sticky top-8">
              <h3 className="text-xl font-black text-gray-900 uppercase mb-1">Category Panel</h3>
              <p className="text-xs font-bold text-blue-600 italic mb-8 uppercase tracking-wider">Apply to ({selectedIds.length}) selected items</p>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Primary Category</label>
                  <select className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-700 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer">
                    <option>Choose Category...</option>
                    <option>Industrial Tools</option>
                    <option>Safety Equipment</option>
                    <option>Footwear</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 opacity-50">Sub-Category</label>
                  <select disabled className="w-full bg-gray-50 border-2 border-gray-100 rounded-xl px-4 py-3 text-sm font-bold text-gray-300 outline-none cursor-not-allowed">
                    <option>-- Select Primary First --</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Attributes / Tags</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                      Fragile <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
                    </span>
                    <span className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                      Heavy <span className="material-symbols-outlined text-[14px] cursor-pointer">close</span>
                    </span>
                  </div>
                  <button className="w-full border-2 border-dashed border-gray-200 py-3 rounded-xl text-[10px] font-black text-gray-400 uppercase hover:border-blue-300 hover:text-blue-500 transition-all">
                    + Add Custom Tag
                  </button>
                </div>

                <div className="pt-8">
                  <button className="w-full bg-gray-900 text-white py-4 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-black shadow-lg active:scale-95 transition-all">
                    Apply to SKUs
                  </button>
                  <button className="w-full mt-4 text-[10px] font-black text-gray-400 uppercase hover:text-red-500 transition-colors">
                    Cancel / Clear Selection
                  </button>
                </div>
              </div>
            </div>

            <p className="mt-6 px-4 text-[10px] font-bold text-gray-400 italic leading-relaxed">
              * Tip: Use 'Shift' key to select multiple items in the table for faster categorization.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER INFO (Đã căn chỉnh chuẩn) */}
      <div className="fixed bottom-8 left-8 bg-white border-2 border-gray-900 px-6 py-3 rounded-xl shadow-xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
          <span className="material-symbols-outlined text-blue-600 text-[20px]">info</span>
        </div>
        <span className="text-xs font-black text-gray-900 uppercase tracking-tight">Selection saved to clipboard.</span>
      </div>

    </div>
  );
}