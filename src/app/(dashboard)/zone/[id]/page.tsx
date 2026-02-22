'use client';

import React from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

const MOCK_ZONE_BINS = [
  { code: 'A1-01-A', type: 'Pallet', stock: '420 / 500', occupancy: 84, audit: 'Oct 24, 2026' },
  { code: 'A1-01-B', type: 'Pallet', stock: '480 / 500', occupancy: 96, audit: 'Oct 22, 2026' },
  { code: 'A1-02-A', type: 'Shelf', stock: '120 / 300', occupancy: 40, audit: 'Oct 25, 2026' },
  { code: 'A1-03-A', type: 'Pallet', stock: '0 / 500', occupancy: 0, audit: 'Oct 26, 2026' },
];

export default function ZoneDetailPage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans">
      
      {/* BREADCRUMBS & TOP ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-gray-200">
        <nav className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Link href="/dashboard" className="hover:text-blue-600 transition-colors">Warehouse</Link> 
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <Link href="/zone" className="hover:text-blue-600 transition-colors">Zones</Link> 
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-gray-900">Zone Detail</span>
        </nav>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/zone')}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to List
          </button>
          <button className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 shadow-sm transition-colors flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">edit</span>
            Edit Zone
          </button>
        </div>
      </div>

      {/* ZONE HEADER INFO */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 flex flex-col gap-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">North Distribution Hub</h1>
            <p className="text-sm text-gray-500 mt-1">Picking zone A1 details and capacity overview.</p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 uppercase tracking-wide">
            <span className="material-symbols-outlined text-sm mr-1">check_circle</span>
            Active
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-6 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Zone Code</label>
            <div className="text-lg font-bold text-gray-900 mt-1">{zoneId || 'ZONE-A1'}</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</label>
            <div className="text-lg font-medium text-gray-900 mt-1">Picking / High-V</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Location</label>
            <div className="text-lg font-medium text-gray-900 mt-1">Wing B - Facility 1</div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Manager</label>
            <div className="text-lg font-medium text-blue-600 mt-1 hover:underline cursor-pointer">Marcus Chen</div>
          </div>
        </div>
      </section>

      {/* KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Bins</span>
          <div className="flex items-end gap-2 mt-1">
            <span className="text-3xl font-bold text-gray-900">142</span>
            <span className="text-sm text-gray-500 mb-1">units</span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupancy</span>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold text-gray-900">78%</span>
            <span className="text-sm font-medium text-red-600 mb-1 flex items-center bg-red-50 px-2 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-xs mr-1">trending_up</span>
              +2.4%
            </span>
          </div>
        </div>
        <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-center">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Available Units</span>
          <div className="flex items-end gap-3 mt-1">
            <span className="text-3xl font-bold text-gray-900">4,200</span>
            <span className="text-sm font-medium text-green-600 mb-1 flex items-center bg-green-50 px-2 py-0.5 rounded-md">
              <span className="material-symbols-outlined text-xs mr-1">trending_down</span>
              -1.2%
            </span>
          </div>
        </div>
      </div>

      {/* LOCAL BINS INVENTORY */}
      <section className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Bins Inventory (Local)</h2>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center justify-between gap-2 border border-gray-200 rounded-md px-3 py-1.5 text-sm font-medium text-gray-700 bg-white shadow-sm cursor-pointer hover:bg-gray-50">
              Type: All
              <span className="material-symbols-outlined text-gray-400 text-lg">expand_more</span>
            </div>
            <button className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 shadow-sm flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-sm text-gray-500">download</span>
              Export
            </button>
            <button className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-sm">add</span>
              Add Bin
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Bin Code</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Storage Type</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stock Level</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Audit</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_ZONE_BINS.map((bin, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors group">
                  <td className="px-6 py-4 text-sm font-bold text-blue-600 hover:underline cursor-pointer">{bin.code}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{bin.type}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{bin.stock}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${bin.occupancy > 90 ? 'bg-red-500' : 'bg-blue-600'}`} 
                          style={{ width: `${bin.occupancy}%` }}
                        ></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600">{bin.occupancy}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{bin.audit}</td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button className="text-gray-400 hover:text-blue-600 transition-colors" title="View Bin">
                        <span className="material-symbols-outlined text-lg">visibility</span>
                      </button>
                      <button className="text-gray-400 hover:text-blue-600 transition-colors" title="Edit Bin">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  );
}