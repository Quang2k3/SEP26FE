'use client';

import React, { useState } from 'react';

// --- MOCK DATA ---
const INITIAL_CATEGORIES = [
  { id: 'cat-1', name: 'ELECTRONICS', unit: '42 units', tags: ['Fragile', 'Secure'] },
  { id: 'cat-2', name: 'CHEMICALS', unit: '18 units', tags: ['Hazardous', 'Vent'] },
  { id: 'cat-3', name: 'APPAREL', unit: '120 units', tags: ['Standard Rack'] },
  { id: 'cat-4', name: 'BULK PALLETS', unit: '12 units', tags: ['Heavy', 'Floor Space'] },
];

const INITIAL_ZONES = [
  { id: 'A', name: 'ZONE A', desc: 'Ambient Floor', icon: 'warehouse', mapped: ['Home Decor'] },
  { id: 'B', name: 'ZONE B', desc: 'Cold Storage (-20C)', icon: 'ac_unit', mapped: ['Frozen Foods'] },
  { id: 'C', name: 'ZONE C', desc: 'High Security', icon: 'lock', mapped: [] },
  { id: 'D', name: 'ZONE D', desc: 'External / Bulk', icon: 'open_in_full', mapped: [] },
];

export default function CategoryMappingPage() {
  const [categories] = useState(INITIAL_CATEGORIES);
  const [zones] = useState(INITIAL_ZONES);
  const [pendingCount] = useState(3);

  return (
    <div className="flex-1 flex flex-col bg-gray-50/50 font-sans relative overflow-hidden min-h-screen">
      
      {/* NỘI DUNG CHÍNH */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 pb-36">
        <div className="mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight uppercase italic">Map Category to Zone</h2>
          <p className="text-gray-500 mt-1 font-medium">Assign product categories to storage zones to optimize warehouse flow.</p>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* CỘT TRÁI: DANH SÁCH CHƯA PHÂN BỔ */}
          <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-5 border-b border-gray-100 bg-gray-50/50">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Unassigned Categories</h3>
              </div>
              
              <div className="p-5 flex flex-col gap-4">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[20px]">search</span>
                  <input type="text" placeholder="Search..." className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>

                <div className="flex flex-col gap-3 text-sm">
                  {categories.map((cat) => (
                    <div key={cat.id} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-500 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-gray-900 tracking-wide uppercase">{cat.name}</span>
                        <span className="material-symbols-outlined text-gray-300 group-hover:text-blue-500">drag_pan</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-bold mb-3">{cat.unit}</p>
                      <div className="flex flex-wrap gap-1">
                        {cat.tags.map(tag => (
                          <span key={tag} className="px-2 py-0.5 bg-gray-100 text-[9px] font-black text-gray-400 rounded-md uppercase">{tag}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quy tắc tóm tắt */}
            <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-xl border-t-4 border-blue-500">
              <h4 className="text-xs font-black uppercase tracking-[0.2em] text-blue-400 mb-4">Storage Constraints</h4>
              <ul className="text-xs space-y-3 font-medium text-gray-400">
                <li>• Hazardous goods (Chemicals) → <span className="text-white font-bold">Zone D only</span></li>
                <li>• Electronics → <span className="text-white font-bold">Secure Zone (Zone C)</span></li>
              </ul>
            </div>
          </div>

          {/* CỘT PHẢI: CÁC ZONE TRONG KHO */}
          <div className="col-span-12 lg:col-span-8">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {zones.map((zone) => (
                  <div key={zone.id} className="border-2 border-dashed border-gray-200 rounded-2xl p-6 flex flex-col min-h-[200px] hover:border-blue-200 transition-colors">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-xl font-black text-gray-900 leading-none uppercase">{zone.name}</h4>
                        <p className="text-[11px] text-gray-400 font-bold mt-1 uppercase tracking-wider">{zone.desc}</p>
                      </div>
                      <span className="material-symbols-outlined text-gray-200 text-4xl">{zone.icon}</span>
                    </div>

                    <div className="flex-1 flex flex-col gap-2">
                      {zone.mapped.map(m => (
                        <div key={m} className="flex justify-between items-center bg-gray-50 border border-gray-200 p-2.5 rounded-lg">
                          <span className="text-xs font-bold text-gray-700">{m}</span>
                          <button className="text-gray-300 hover:text-red-500 transition-colors"><span className="material-symbols-outlined text-sm">close</span></button>
                        </div>
                      ))}
                      <div className="flex-1 border-2 border-dashed border-gray-100 rounded-xl flex items-center justify-center text-[10px] font-bold text-gray-300 uppercase italic">
                        Drop category here
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- FIX LỖI: FOOTER STICKY CĂN CHỈNH --- */}
      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-6xl bg-white border-2 border-gray-900 rounded-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col md:flex-row justify-between items-center z-50 gap-4 md:gap-0">
        
        {/* Phần thông báo: Căn chỉnh icon và text hoàn hảo */}
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-amber-50 border-2 border-amber-200 rounded-full flex items-center justify-center shadow-inner">
            <span className="material-symbols-outlined text-amber-600 text-[28px]">notification_important</span>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black text-gray-900 leading-none mb-1">
              {pendingCount} changes pending
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              Awaiting system synchronization
            </span>
          </div>
        </div>

        {/* Nhóm nút hành động */}
        <div className="flex gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none px-8 py-3 bg-white border-2 border-gray-200 text-gray-400 font-black rounded-xl text-xs uppercase hover:bg-gray-50 transition-all">
            Discard
          </button>
          <button className="flex-1 md:flex-none px-8 py-3 bg-gray-900 text-white font-black rounded-xl text-xs uppercase hover:bg-black transition-all shadow-lg active:scale-95">
            Apply Mapping
          </button>
        </div>
      </footer>

    </div>
  );
}