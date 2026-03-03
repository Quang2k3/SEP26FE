'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CreateBinModal, { BinFormData } from '@/components/bin/CreateBinModal';
import EditBinModal, { EditBinData } from '@/components/bin/EditBinModal';

// Dữ liệu tĩnh cho danh sách Bin
const MOCK_BINS = [
  { code: 'A-101-01', zone: 'Zone-A', capacity: '500kg', occupancy: 20, status: 'Active' },
  { code: 'B-202-05', zone: 'Zone-B', capacity: '12 Units', occupancy: 85, status: 'Active' },
  { code: 'C-303-12', zone: 'Zone-C', capacity: '1000kg', occupancy: 100, status: 'Full' },
  { code: 'D-404-01', zone: 'Zone-D', capacity: '250kg', occupancy: 45, status: 'Maintenance' },
];

// Mock Zones để truyền vào Dropdown của Modal
const MOCK_ZONES = [
  { id: 'Zone-A', name: 'Cold Storage' },
  { id: 'Zone-B', name: 'Dry Goods' },
  { id: 'Zone-C', name: 'Bulk Area' },
  { id: 'Zone-D', name: 'Restricted' },
];

function BinListContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const currentAction = searchParams.get('action'); // 'create' hoặc 'edit'
  const currentId = searchParams.get('id');

  const closeModal = () => {
    router.push('/bin');
  };

  const handleCreateBin = (data: BinFormData) => {
    console.log('API Call: Tạo Bin mới:', data);
    closeModal();
  };

  const handleEditBin = (data: EditBinData) => {
    console.log('API Call: Cập nhật Bin:', data);
    closeModal();
  };

  // Giả lập lấy dữ liệu cũ để đưa vào form Edit
  const getMockInitialDataForEdit = (): EditBinData => ({
    code: currentId || 'A-101-01',
    status: 'Active',
    zoneId: 'Zone-A',
    type: 'Standard Rack',
    maxWeight: '500',
    maxVolume: '2.5',
    stackLimit: '3',
    length: '120',
    width: '80',
    height: '100',
    stats: {
      occupancy: 85,
      occupancyTrend: '-5% since yesterday',
      skuCount: 12,
      lastPicking: '2h ago'
    }
  });

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans relative">

      {/* Khối nền nội dung - Sẽ mờ đi khi bật Modal */}
      <div className={`flex flex-col gap-6 transition-all duration-300 ${currentAction ? 'opacity-30 blur-[2px] pointer-events-none' : 'opacity-100'}`}>

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Bin Management</h1>
            <p className="mt-1 text-sm text-gray-500">Manage individual warehouse storage locations.</p>
          </div>
          <button
            onClick={() => router.push('/bin?action=create')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Add New Bin
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex flex-1 max-w-md items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
            <input
              className="w-full bg-transparent border-none p-0 text-sm text-gray-900 focus:outline-none placeholder-gray-400"
              placeholder="Search bins by code or capacity..."
              type="text"
            />
          </div>
          <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <span className="text-gray-500 font-normal">Zone:</span> All
            <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
          </button>
          <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <span className="text-gray-500 font-normal">Status:</span> Active
            <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bins</span>
            <span className="text-3xl font-bold text-gray-900 mt-1">124</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available</span>
            <span className="text-3xl font-bold text-green-600 mt-1">82</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Near Capacity</span>
            <span className="text-3xl font-bold text-amber-500 mt-1">14</span>
          </div>
          <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Repair</span>
            <span className="text-3xl font-bold text-red-600 mt-1">05</span>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bin Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Capacity</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-48">Occupancy</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MOCK_BINS.map((bin, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors group">
                    <td
                      onClick={() => router.push(`/bin/${bin.code}`)}
                      className="px-6 py-4 text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      {bin.code}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{bin.zone}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{bin.capacity}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${bin.occupancy >= 90 ? 'bg-red-500' : bin.occupancy >= 75 ? 'bg-amber-500' : 'bg-blue-600'}`}
                            style={{ width: `${bin.occupancy}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-medium text-gray-600 whitespace-nowrap">{bin.occupancy}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bin.status === 'Full' ? 'bg-red-100 text-red-800' :
                          bin.status === 'Active' ? 'bg-green-100 text-green-800' :
                            'bg-amber-100 text-amber-800'
                        }`}>
                        {bin.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => router.push(`/bin/${bin.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors outline-none"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button
                          onClick={() => router.push(`/bin?action=edit&id=${bin.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors outline-none"
                          title="Edit Bin"
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

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between bg-white">
            <span className="text-sm text-gray-500">Showing 1 to 4 of 124 entries</span>
            <div className="flex gap-1">
              <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">Previous</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm bg-blue-50 text-blue-600 font-medium border-blue-200">1</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50">2</button>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50">3</button>
              <span className="px-2 py-1 text-gray-500">...</span>
              <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">Next</button>
            </div>
          </div>
        </div>
      </div>

      {/* TÍCH HỢP MODAL CREATE BIN */}
      <CreateBinModal
        isOpen={currentAction === 'create'}
        zones={MOCK_ZONES}
        onClose={closeModal}
        onSubmit={handleCreateBin}
      />

      {/* TÍCH HỢP MODAL EDIT BIN */}
      {currentAction === 'edit' && (
        <EditBinModal
          isOpen={true}
          initialData={getMockInitialDataForEdit()}
          zones={MOCK_ZONES}
          onClose={closeModal}
          onSubmit={handleEditBin}
        />
      )}

    </div>
  );
}

// Suspense Boundary cho Next.js 13+ App Router
export default function BinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-sm font-medium text-gray-500">Loading Bins...</div>
        </div>
      </div>
    }>
      <BinListContent />
    </Suspense>
  );
}