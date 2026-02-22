'use client';

import React, { Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';

// Mock Data: Thông tin chi tiết của Bin
const MOCK_BIN_DETAIL = {
  id: 'B-104',
  zone: 'Zone A - Cold Storage',
  type: 'Standard Shelf (Medium)',
  status: 'Active',
  capacity: {
    maxWeight: 500,
    currentWeight: 375,
    occupancyPercent: 75,
  },
  lastAudited: '24h ago',
  inventory: [
    { sku: 'SKU-8821', name: 'Industrial Power Drill v4', quantity: 12, unit: 'pcs', image: 'drill' },
    { sku: 'SKU-1044', name: 'Wrench Set M10 (Chrome)', quantity: 8, unit: 'sets', image: 'wrench' },
    { sku: 'SKU-4552', name: 'Safety Gloves (Heavy Duty)', quantity: 45, unit: 'pairs', image: 'gloves' },
  ]
};

function BinDetailContent() {
  const router = useRouter();
  const params = useParams(); // Lấy ID từ URL (VD: /bin/B-104 -> params.id = B-104)
  const binId = params.id as string;

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-8 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans">
      
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-gray-500 gap-2">
        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => router.push('/dashboard')}>Warehouse</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => router.push('/zone')}>Zones</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="hover:text-blue-600 cursor-pointer transition-colors" onClick={() => router.push('/bin')}>Bins</span>
        <span className="material-symbols-outlined text-xs">chevron_right</span>
        <span className="font-semibold text-gray-900">Bin {binId}</span>
      </nav>

      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b border-gray-200 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Bin: {binId}</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">
              Active
            </span>
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">location_on</span>
              {MOCK_BIN_DETAIL.zone}
            </span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">history</span>
              Last audited: {MOCK_BIN_DETAIL.lastAudited}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">qr_code</span>
            Print Label
          </button>
          <button className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">move_up</span>
            Move All
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">fact_check</span>
            Audit Bin
          </button>
        </div>
      </div>

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Occupancy (Visual Bar) */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Occupancy</span>
            <span className="material-symbols-outlined text-gray-400">data_usage</span>
          </div>
          <div>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-bold text-gray-900">{MOCK_BIN_DETAIL.capacity.occupancyPercent}%</span>
              <span className="text-sm font-medium text-gray-500 mb-1">Full</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  MOCK_BIN_DETAIL.capacity.occupancyPercent > 90 ? 'bg-red-500' : 
                  MOCK_BIN_DETAIL.capacity.occupancyPercent > 70 ? 'bg-amber-500' : 'bg-blue-600'
                }`} 
                style={{ width: `${MOCK_BIN_DETAIL.capacity.occupancyPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {MOCK_BIN_DETAIL.capacity.currentWeight}kg / {MOCK_BIN_DETAIL.capacity.maxWeight}kg Max Capacity
            </p>
          </div>
        </div>

        {/* Card 2: Bin Type */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bin Type</span>
            <span className="material-symbols-outlined text-gray-400">shelves</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-gray-900">{MOCK_BIN_DETAIL.type.split('(')[0]}</span>
            <p className="text-sm text-gray-500 mt-1">Size: {MOCK_BIN_DETAIL.type.split('(')[1].replace(')', '')}</p>
          </div>
        </div>

        {/* Card 3: Zone Context */}
        <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">Zone Assignment</span>
            <span className="material-symbols-outlined text-blue-400">map</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-blue-900 block truncate" title={MOCK_BIN_DETAIL.zone}>
              {MOCK_BIN_DETAIL.zone}
            </span>
            <button 
              onClick={() => router.push('/zone')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1 transition-colors"
            >
              View Zone Map <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Inventory Contents Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Inventory Contents</h2>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-lg">search</span>
            <input 
              type="text" 
              placeholder="Search contents..." 
              className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-3">SKU Code</th>
                <th className="px-6 py-3">Item Description</th>
                <th className="px-6 py-3 text-center">Quantity</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MOCK_BIN_DETAIL.inventory.map((item, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">{item.sku}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {/* Placeholder Image Box */}
                      <div className="w-10 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 flex-shrink-0">
                        <span className="material-symbols-outlined text-lg">image</span>
                      </div>
                      <span className="text-sm font-medium text-gray-700">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-800 text-sm font-bold">
                      {item.quantity} <span className="text-xs font-normal text-gray-500 ml-1">{item.unit}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">Edit</button>
                      <button className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline">Transfer</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Empty State (nếu Bin rỗng) - Giữ chỗ cho logic sau này */}
        {MOCK_BIN_DETAIL.inventory.length === 0 && (
           <div className="p-8 text-center text-gray-500">
             <p>This bin is currently empty.</p>
           </div>
        )}
      </div>

    </div>
  );
}

export default function BinDetailPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">Loading Bin Details...</div>}>
      <BinDetailContent />
    </Suspense>
  );
}