'use client';

import React from 'react';

// Dữ liệu tĩnh cho danh sách Bin
const MOCK_BINS = [
  { code: 'A-101-01', zone: 'Cold Storage', capacity: '500kg', occupancy: 20, status: 'Active' },
  { code: 'B-202-05', zone: 'Dry Goods', capacity: '12 Units', occupancy: 85, status: 'Active' },
  { code: 'C-303-12', zone: 'Bulk Area', capacity: '1000kg', occupancy: 100, status: 'Full' },
  { code: 'D-404-01', zone: 'Restricted', capacity: '250kg', occupancy: 45, status: 'Maintenance' },
];

export default function BinPage() {
  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 p-4 md:p-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-5xl font-bold font-['Shadows_Into_Light',cursive] tracking-wider">
            Bin List
          </h1>
          <p className="mt-2 text-lg text-gray-600">Manage warehouse storage locations.</p>
        </div>
        
        {/* Search Bar - Flexbox fix applied */}
        <div className="sketch-input sketch-box flex items-center gap-2 w-64 bg-white p-2">
          <span className="material-symbols-outlined text-gray-500">search</span>
          <input 
            className="w-full border-none bg-transparent p-0 text-lg font-['Shadows_Into_Light',cursive] focus:ring-0 focus:outline-none" 
            placeholder="Search bins..." 
            type="text" 
          />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <span className="font-bold text-lg">Filters:</span>
        <div className="sketch-box flex items-center px-4 py-2 gap-2 cursor-pointer bg-white hover:bg-gray-50">
          <span className="font-bold">Zone:</span> All 
          <span className="material-symbols-outlined ml-2 text-sm">expand_more</span>
        </div>
        <div className="sketch-box flex items-center px-4 py-2 gap-2 cursor-pointer bg-white hover:bg-gray-50">
          <span className="font-bold">Status:</span> Active 
          <span className="material-symbols-outlined ml-2 text-sm">expand_more</span>
        </div>
        <div className="sketch-box flex items-center px-4 py-2 gap-2 cursor-pointer bg-white hover:bg-gray-50">
          <span className="font-bold">Sort By</span>
          <span className="material-symbols-outlined ml-2 text-sm">expand_more</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="sketch-box border-4 border-black bg-white overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b-[4px] border-black bg-gray-50">
              <th className="p-4 font-['Shadows_Into_Light',cursive] text-2xl font-bold">Bin Code</th>
              <th className="p-4 font-['Shadows_Into_Light',cursive] text-2xl font-bold">Zone</th>
              <th className="p-4 font-['Shadows_Into_Light',cursive] text-2xl font-bold">Capacity</th>
              <th className="p-4 font-['Shadows_Into_Light',cursive] text-2xl font-bold">Occupancy</th>
              <th className="p-4 font-['Shadows_Into_Light',cursive] text-2xl font-bold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y-[3px] divide-black">
            {MOCK_BINS.map((bin, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold text-lg">{bin.code}</td>
                <td className="p-4 text-lg">{bin.zone}</td>
                <td className="p-4 text-lg">{bin.capacity}</td>
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {/* Wireframe Occupancy Bar */}
                    <div className="border-[3px] border-black h-5 w-24 relative bg-gray-100">
                      <div 
                        className="absolute top-0 left-0 bottom-0 bg-black border-r-[3px] border-black" 
                        style={{ width: `${bin.occupancy}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-bold">{bin.occupancy}%</span>
                  </div>
                </td>
                <td className="p-4">
                  {/* Status Badges */}
                  {bin.status === 'Active' && (
                    <span className="sketch-box px-3 py-1 uppercase text-xs font-bold bg-green-100">
                      Active
                    </span>
                  )}
                  {bin.status === 'Full' && (
                    <span className="sketch-box px-3 py-1 uppercase text-xs font-bold bg-red-100 border-2">
                      Full
                    </span>
                  )}
                  {bin.status === 'Maintenance' && (
                    <span className="sketch-box px-3 py-1 uppercase text-xs font-bold italic bg-yellow-100">
                      Maintenance
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-4">
        <div className="sketch-box p-6 flex flex-col items-center justify-center bg-white hover:-translate-y-1 transition-transform">
          <p className="font-['Shadows_Into_Light',cursive] text-2xl font-bold">Total Bins</p>
          <p className="text-6xl font-black font-['Shadows_Into_Light',cursive] mt-2">124</p>
        </div>
        <div className="sketch-box p-6 flex flex-col items-center justify-center bg-white hover:-translate-y-1 transition-transform">
          <p className="font-['Shadows_Into_Light',cursive] text-2xl font-bold">Available</p>
          <p className="text-6xl font-black font-['Shadows_Into_Light',cursive] mt-2">82</p>
        </div>
        <div className="sketch-box p-6 flex flex-col items-center justify-center bg-white hover:-translate-y-1 transition-transform">
          <p className="font-['Shadows_Into_Light',cursive] text-2xl font-bold">Near Cap.</p>
          <p className="text-6xl font-black font-['Shadows_Into_Light',cursive] mt-2 text-yellow-600">14</p>
        </div>
        <div className="sketch-box p-6 flex flex-col items-center justify-center bg-white hover:-translate-y-1 transition-transform">
          <p className="font-['Shadows_Into_Light',cursive] text-2xl font-bold">In repair</p>
          <p className="text-6xl font-black font-['Shadows_Into_Light',cursive] mt-2 text-red-600">5</p>
        </div>
      </div>

    </div>
  );
}