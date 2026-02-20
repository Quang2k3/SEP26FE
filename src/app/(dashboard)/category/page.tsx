'use client';

import React from 'react';

const MOCK_CATEGORIES = [
  { code: 'CAT-001', name: 'Electronics & Hardware', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-002', name: 'Perishables (Cold Storage)', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-003', name: 'Bulk Industrial Parts', status: 'Inactive', color: 'bg-gray-300' },
  { code: 'CAT-004', name: 'Safety Equipment', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-005', name: 'Hazardous Materials', status: 'Restricted', color: 'bg-yellow-400' },
  { code: 'CAT-006', name: 'Office Supplies', status: 'Active', color: 'bg-green-400' },
];

export default function CategoryPage() {
  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 p-4 md:p-8">
      
      {/* Page Header (Search) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-3xl font-bold underline decoration-2 underline-offset-4 uppercase">
          Category List
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <input 
              className="sketch-input sketch-box px-4 py-2 pl-10 w-64 focus:ring-0 focus:outline-none" 
              placeholder="Search category..." 
              type="text" 
            />
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2">
              search
            </span>
          </div>
        </div>
      </div>

      {/* Sub-header / Filters */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-4">
          <div className="sketch-box px-3 py-1 bg-yellow-100 font-bold italic">Project: Warehouse v4.2</div>
          <div className="sketch-box px-3 py-1 font-bold">View: List</div>
        </div>
      </div>

      {/* Main Table */}
      <main className="sketch-box p-1 min-h-[500px] bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left p-4 border-r-2 border-black">Code</th>
              <th className="text-left p-4 border-r-2 border-black">Name</th>
              <th className="text-left p-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CATEGORIES.map((cat, index) => (
              <tr key={index} className="border-b-2 border-black hover:bg-gray-50">
                <td className="p-4 border-r-2 border-black">{cat.code}</td>
                <td className="p-4 border-r-2 border-black font-bold">{cat.name}</td>
                <td className="p-4 flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full border-2 border-black ${cat.color}`}></div>
                  {cat.status}
                </td>
              </tr>
            ))}
            
            {/* Empty Add Row */}
            <tr className="hover:bg-gray-50">
              <td className="p-4 border-r-2 border-black italic text-gray-400">[Add Row]</td>
              <td className="p-4 border-r-2 border-black italic text-gray-400">...</td>
              <td className="p-4 italic text-gray-400">...</td>
            </tr>
          </tbody>
        </table>
      </main>

      {/* Pagination */}
      <div className="flex justify-center items-center gap-2">
        <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
          <span className="material-symbols-outlined">chevron_left</span>
        </button>
        <button className="sketch-button sketch-box size-10 flex items-center justify-center bg-black text-white">
          1
        </button>
        <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">2</button>
        <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">3</button>
        <span className="px-2 font-bold">...</span>
        <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">10</button>
        <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>
    </div>
  );
}