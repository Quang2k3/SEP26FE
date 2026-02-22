'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

// Dữ liệu tĩnh mô phỏng
const MOCK_ZONES = [
  { code: 'ZN-101', name: 'North Wing Cold', type: 'Cold Storage', capacity: 45, status: 'Active' },
  { code: 'ZN-102', name: 'South Dry Goods', type: 'Dry Storage', capacity: 90, status: 'Full' },
  { code: 'ZN-103', name: 'Hazardous Buffer', type: 'Hazardous', capacity: 15, status: 'Maintenance' },
  { code: 'ZN-104', name: 'Main Loading Dock', type: 'Transit', capacity: 60, status: 'Active' },
];

function ZoneListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentAction = searchParams.get('action');

  const closeModal = () => {
    router.push('/zone');
  };

  return (
    // Đổi background nền tổng thể sang màu xám thật nhạt để làm nổi bật các Box trắng
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans">
      
      <div className={`flex flex-col gap-6 transition-all duration-300 ${currentAction ? 'opacity-20 blur-[2px] pointer-events-none' : 'opacity-100'}`}>
        
        {/* Page Header - Tối giản, chuyên nghiệp */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Zone Management</h1>
            <p className="mt-1 text-sm text-gray-500">Configure and monitor all warehouse sections.</p>
          </div>
          {/* Nút Create Zone chuẩn Enterprise */}
          <button 
            onClick={() => router.push('/zone?action=create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Zone
          </button>
        </div>

        {/* Filters & Search - Bo góc, viền xám nhạt, focus ring xanh */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-1 max-w-md items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
            <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
            <input 
              className="w-full bg-transparent border-none p-0 text-sm text-gray-900 focus:outline-none focus:ring-0 placeholder-gray-400" 
              placeholder="Search zones by code or name..." 
              type="text"
            />
          </div>
          <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            All Types
            <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
          </button>
          <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            Any Status
            <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
          </button>
        </div>

        {/* Stats Summary - Sạch sẽ, số liệu nổi bật */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Zones</span>
            <span className="text-3xl font-bold text-gray-900 mt-1">42</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Active Capacity</span>
            <span className="text-3xl font-bold text-gray-900 mt-1">78%</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Maintenance</span>
            <span className="text-3xl font-bold text-amber-600 mt-1">03</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Critically Full</span>
            <span className="text-3xl font-bold text-red-600 mt-1">05</span>
          </div>
        </div>

        {/* Main Table - Không còn viền đen, dùng màu xám dịu mắt */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Capacity</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MOCK_ZONES.map((zone, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{zone.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{zone.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{zone.type}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${zone.capacity > 85 ? 'bg-red-500' : 'bg-blue-600'}`} 
                            style={{ width: `${zone.capacity}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{zone.capacity}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {/* Thẻ Status kiểu Pill hiện đại */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        zone.status === 'Full' ? 'bg-red-100 text-red-800' :
                        zone.status === 'Active' ? 'bg-green-100 text-green-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {zone.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => router.push(`/zone/${zone.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button 
                          onClick={() => router.push(`/zone?action=edit&id=${zone.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Zone"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Placeholder Modal giữ nguyên logic */}
      {currentAction === 'create' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
             <h2 className="text-xl font-bold text-gray-900 mb-4">Create Zone</h2>
             <p className="text-sm text-gray-500 mb-6">Form fields will be generated here.</p>
             <div className="flex justify-end gap-3">
               <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
               <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Zone</button>
             </div>
           </div>
        </div>
      )}

      {currentAction === 'edit' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg">
             <h2 className="text-xl font-bold text-gray-900 mb-4">Edit Zone ({searchParams.get('id')})</h2>
             <p className="text-sm text-gray-500 mb-6">Form fields will be generated here.</p>
             <div className="flex justify-end gap-3">
               <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
               <button onClick={closeModal} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">Save Changes</button>
             </div>
           </div>
        </div>
      )}

    </div>
  );
}

export default function ZonePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading Zones...</div>}>
      <ZoneListContent />
    </Suspense>
  );
}