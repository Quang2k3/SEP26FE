'use client';

import React, { useState } from 'react';

// --- MOCK DATA ---
const MOCK_CONFIG_BINS = [
  { id: 'NW-A-101', zone: 'North Wing A', weight: 500, volume: 1.2, units: 100, status: 'OK' },
  { id: 'NW-A-102', zone: 'North Wing A', weight: 500, volume: 1.2, units: 100, status: 'NEAR LIMIT' },
  { id: 'SW-B-204', zone: 'South Storage', weight: 1000, volume: 4.0, units: 50, status: 'FULL' },
  { id: 'CS-04-01', zone: 'Cold Storage', weight: 250, volume: 0.8, units: 200, status: 'EMPTY' },
];

export default function ConfigureBinCapacityPage() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      alert('Changes saved successfully!');
    }, 1000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'FULL': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-700 uppercase">Full</span>;
      case 'NEAR LIMIT': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-700 uppercase">Near Limit</span>;
      case 'EMPTY': return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-gray-100 text-gray-500 uppercase">Empty</span>;
      default: return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-green-100 text-green-700 uppercase">OK</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 md:p-8 bg-gray-50/50 font-sans overflow-y-auto">
      
      {/* PAGE HEADER & ACTIONS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Configure Bin Capacity</h2>
          <p className="text-gray-500 mt-1">Set limits for weight, volume, and units per storage location.</p>
        </div>
        <div className="flex gap-3">
          <button className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg text-sm hover:bg-gray-50 transition-all shadow-sm">
            Discard
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-sm transition-all shadow-sm flex items-center gap-2"
          >
            {isSaving ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : null}
            Save Changes
          </button>
        </div>
      </div>

      {/* BULK UPDATE SECTION */}
      <section className="mb-8">
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
          <h3 className="text-sm font-bold text-blue-600 uppercase tracking-widest mb-6">Bulk Update by Zone</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Zone</label>
              <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Select Zone...</option>
                <option>North Wing A</option>
                <option>South Storage</option>
                <option>Cold Storage</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Metric to Change</label>
              <select className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                <option>Max Weight (kg)</option>
                <option>Max Volume (m³)</option>
                <option>Max Units</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">New Value</label>
              <input 
                type="text" 
                placeholder="0.00" 
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm transition-all shadow-sm">
              Apply to Zone
            </button>
          </div>
        </div>
      </section>

      {/* DETAILED CONFIGURATION TABLE */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Bin Inventory Configuration</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input 
              type="text" 
              placeholder="Search bin ID..." 
              className="pl-9 pr-4 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 outline-none w-48"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bin ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Zone</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Weight (kg)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Volume (m³)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Max Units</th>
                <th className="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MOCK_CONFIG_BINS.map((bin) => (
                <tr key={bin.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-bold text-blue-600 text-sm">{bin.id}</td>
                  <td className="px-6 py-4 text-xs text-gray-500">{bin.zone}</td>
                  <td className="px-6 py-4">
                    <input type="number" defaultValue={bin.weight} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-6 py-4">
                    <input type="number" defaultValue={bin.volume} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-6 py-4">
                    <input type="number" defaultValue={bin.units} className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {getStatusBadge(bin.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="px-6 py-4 border-t border-gray-50 bg-gray-50/30 flex justify-between items-center">
          <p className="text-xs text-gray-500">Showing 1-4 of 150 Bins</p>
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
            <button className="w-7 h-7 rounded bg-blue-600 text-white text-[10px] font-bold shadow-sm">1</button>
            <button className="w-7 h-7 rounded hover:bg-gray-100 text-gray-600 text-[10px] font-bold">2</button>
            <button className="w-7 h-7 rounded hover:bg-gray-100 text-gray-600 text-[10px] font-bold">3</button>
            <span className="px-1 text-gray-300">...</span>
            <button className="w-7 h-7 rounded hover:bg-gray-100 text-gray-600 text-[10px] font-bold">15</button>
            <button className="p-1.5 hover:bg-gray-100 rounded text-gray-400"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
          </div>
        </div>
      </div>

      {/* DEV NOTES / ALERTS */}
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 shadow-sm">
        <span className="material-symbols-outlined text-amber-500">warning</span>
        <div className="text-xs text-amber-800 leading-relaxed">
          <p className="font-bold mb-0.5">Validation Rules:</p>
          <p>Weight and volume limits are enforced during Putaway operations. Volume calculations use the standard Euro-pallet (1.2m x 0.8m) as the base unit.</p>
        </div>
      </div>

    </div>
  );
}