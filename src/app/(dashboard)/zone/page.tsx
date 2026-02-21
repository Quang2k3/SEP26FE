'use client';

import React from 'react';

// Chuyển dữ liệu tĩnh thành mảng
const MOCK_ZONES = [
  { code: 'ZN-101', name: 'North Wing Cold', type: 'Cold Storage', capacity: 45, status: 'Active' },
  { code: 'ZN-102', name: 'South Dry Goods', type: 'Dry Storage', capacity: 90, status: 'Full' },
  { code: 'ZN-103', name: 'Hazardous Buffer', type: 'Hazardous', capacity: 15, status: 'Maintenance' },
  { code: 'ZN-104', name: 'Main Loading Dock', type: 'Transit', capacity: 60, status: 'Active' },
];

export default function ZonePage() {
  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-10 p-4 md:p-8">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-bold tracking-tight uppercase">Zone Management</h1>
          <p className="mt-2 text-lg italic text-gray-500">[ Screen for configuring warehouse sections ]</p>
        </div>
        {/* Nút "+ Create Zone" đã được loại bỏ vì đã có trên SecondaryNav */}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="sketch-input sketch-box flex flex-1 max-w-md items-center gap-2 bg-white p-2">
          <span className="material-symbols-outlined text-gray-500">
            search
          </span>
          <input 
            className="w-full border-none bg-transparent p-0 text-lg focus:outline-none focus:ring-0" 
            placeholder="Search zones..." 
            type="text"
          />
        </div>
        <div className="sketch-input sketch-box flex items-center justify-between gap-4 cursor-pointer min-w-[150px] bg-white">
          <span className="font-bold">All Types</span>
          <span className="material-symbols-outlined">expand_more</span>
        </div>
        <div className="sketch-input sketch-box flex items-center justify-between gap-4 cursor-pointer min-w-[150px] bg-white">
          <span className="font-bold">Any Status</span>
          <span className="material-symbols-outlined">expand_more</span>
        </div>
      </div>

      {/* Stats Summary - Đưa lên trên bảng để dễ nhìn tổng quan hơn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <div className="sketch-box bg-white p-6 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-500 uppercase">Total Zones</span>
          <span className="text-5xl font-bold mt-2">42</span>
        </div>
        <div className="sketch-box bg-white p-6 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-500 uppercase">Active Capacity</span>
          <span className="text-5xl font-bold mt-2">78%</span>
        </div>
        <div className="sketch-box bg-white p-6 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-500 uppercase">Maintenance</span>
          <span className="text-5xl font-bold mt-2 text-yellow-600">03</span>
        </div>
        <div className="sketch-box bg-white p-6 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-gray-500 uppercase">Critically Full</span>
          <span className="text-5xl font-bold mt-2 text-red-600">05</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="sketch-box bg-white overflow-hidden p-1">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b-[3px] border-black">
              <th className="p-4 text-left border-r-2 border-black">Zone Code</th>
              <th className="p-4 text-left border-r-2 border-black">Zone Name</th>
              <th className="p-4 text-left border-r-2 border-black">Type</th>
              <th className="p-4 text-left border-r-2 border-black w-48">Capacity</th>
              <th className="p-4 text-left border-r-2 border-black">Status</th>
              <th className="p-4 text-center">[X]</th>
            </tr>
          </thead>
          <tbody>
            {MOCK_ZONES.map((zone, index) => (
              <tr key={index} className="border-b-2 border-black hover:bg-gray-50 transition-colors">
                <td className="p-4 font-bold border-r-2 border-black">{zone.code}</td>
                <td className="p-4 border-r-2 border-black">{zone.name}</td>
                <td className="p-4 border-r-2 border-black">{zone.type}</td>
                <td className="p-4 border-r-2 border-black">
                  {/* Wireframe Progress Bar */}
                  <div className="border-2 border-black h-4 w-full relative mb-1 bg-gray-100">
                    <div 
                      className="bg-black h-full" 
                      style={{ width: `${zone.capacity}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-bold">{zone.capacity}% Full</span>
                </td>
                <td className="p-4 border-r-2 border-black font-bold">
                  {zone.status === 'Full' && <span className="text-red-600">{zone.status}</span>}
                  {zone.status === 'Active' && <span className="text-green-600">{zone.status}</span>}
                  {zone.status === 'Maintenance' && <span className="text-yellow-600">{zone.status}</span>}
                </td>
                <td className="p-4 text-center cursor-pointer hover:bg-gray-200">
                  <span className="material-symbols-outlined">edit</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}