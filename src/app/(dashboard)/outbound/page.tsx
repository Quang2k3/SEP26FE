'use client';

import React, { Suspense } from 'react';
import { useRouter } from 'next/navigation';

// Mock data tương tự inbound nhưng cho outbound shipments
const MOCK_SHIPMENTS = [
  {
    id: 1,
    shipmentCode: 'SHIP-2023-001',
    customer: 'Global Logistics inc.',
    date: '2023-10-24',
    status: 'Shipped',
  },
  {
    id: 2,
    shipmentCode: 'SHIP-2023-002',
    customer: 'Pioneer Parts Co',
    date: '2023-10-25',
    status: 'Pending',
  },
  {
    id: 3,
    shipmentCode: 'SHIP-2023-003',
    customer: 'Swift Delivery Ltd',
    date: '2023-10-25',
    status: 'In Transit',
  },
  {
    id: 4,
    shipmentCode: 'SHIP-2023-004',
    customer: 'Industrial Solutions',
    date: '2023-10-26',
    status: 'Processing',
  },
  {
    id: 5,
    shipmentCode: 'SHIP-2023-005',
    customer: 'Oceanic Supplies',
    date: '2023-10-27',
    status: 'Cancelled',
  },
  {
    id: 6,
    shipmentCode: 'SHIP-2023-006',
    customer: 'Northern Tools',
    date: '2023-10-27',
    status: 'Shipped',
  },
];

const STATUS_COLORS: Record<string, string> = {
  Shipped: 'bg-green-100 text-green-800',
  Pending: 'bg-yellow-100 text-yellow-800',
  'In Transit': 'bg-blue-100 text-blue-800',
  Processing: 'bg-purple-100 text-purple-800',
  Cancelled: 'bg-red-100 text-red-800',
};

function OutboundShipmentListContent() {
  const router = useRouter();

  const handleViewDetail = (shipmentCode: string) => {
    router.push(`/outbound/${shipmentCode}`);
  };

  const handleExport = () => {
    console.log('Export shipments');
  };

  const handleNewShipment = () => {
    router.push('/outbound/new');
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Outbound Shipment List
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage outgoing warehouse shipments and deliveries.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            Export
          </button>
          <button
            onClick={handleNewShipment}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            New Shipment
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap gap-3 items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex flex-1 max-w-md items-center gap-2 bg-gray-50 border border-gray-200 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
          <input
            className="w-full bg-transparent border-none p-0 text-sm text-gray-900 focus:outline-none placeholder-gray-400"
            placeholder="Search shipments."
            type="text"
          />
        </div>
        <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
          <span className="text-gray-500 font-normal">Status:</span> All
          <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
        </button>
        <button className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
          <span className="text-gray-500 font-normal">Date:</span> All Time
          <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Shipments</span>
          <span className="text-3xl font-bold text-gray-900 mt-1">142</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Shipped</span>
          <span className="text-3xl font-bold text-green-600 mt-1">89</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Pending</span>
          <span className="text-3xl font-bold text-amber-500 mt-1">28</span>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">In Transit</span>
          <span className="text-3xl font-bold text-blue-600 mt-1">25</span>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Shipment Code
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_SHIPMENTS.map((shipment) => (
                <tr
                  key={shipment.id}
                  className="hover:bg-gray-50 transition-colors group"
                >
                  <td
                    onClick={() => handleViewDetail(shipment.shipmentCode)}
                    className="px-6 py-4 text-sm font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    {shipment.shipmentCode}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {shipment.customer}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {shipment.date}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        STATUS_COLORS[shipment.status] ||
                        'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {shipment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleViewDetail(shipment.shipmentCode)}
                        className="text-gray-400 hover:text-blue-600 transition-colors outline-none"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-lg">visibility</span>
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
          <span className="text-sm text-gray-500">Showing 1 to 6 of 142 entries</span>
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
  );
}

// Suspense Boundary cho Next.js 13+ App Router
export default function OutboundShipmentListPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <div className="text-sm font-medium text-gray-500">Loading Shipments...</div>
        </div>
      </div>
    }>
      <OutboundShipmentListContent />
    </Suspense>
  );
}

