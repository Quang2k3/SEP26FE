'use client';

import React, { useState, useEffect } from 'react';
import type { EditBinData, EditBinModalProps } from '@/interfaces/modals';

export default function EditBinModal({ isOpen, initialData, zones, onClose, onSubmit }: EditBinModalProps) {
  const [formData, setFormData] = useState<EditBinData | null>(null);

  useEffect(() => {
    if (!isOpen || !initialData) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData(initialData);
  }, [isOpen, initialData]);

  if (!isOpen || !formData) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined">edit_square</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Bin: {formData.code}</h2>
              <p className="text-sm font-medium text-gray-500 mt-0.5">Update storage bin configuration and capacity parameters.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors outline-none focus:ring-2 focus:ring-gray-200">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body Split Layout */}
        <div className="flex flex-col md:flex-row flex-1 max-h-[75vh] overflow-y-auto">
          
          {/* CỘT TRÁI: FORM NHẬP LIỆU GỘP NHÓM */}
          <form id="edit-bin-form" onSubmit={handleSubmit} className="flex-1 p-6 space-y-8">
            
            {/* Group 1: General Information */}
            <div className="relative pt-4">
              <div className="absolute -top-3 left-4 bg-white px-2 text-sm font-bold text-gray-800 uppercase tracking-wider">General Information</div>
              <div className="border border-gray-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-2 gap-5 bg-gray-50/30">
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Bin Code <span className="text-gray-400 font-normal ml-1">(Read-Only)</span></label>
                  <div className="relative">
                    <input type="text" disabled value={formData.code} className="w-full px-3 py-2 bg-gray-100 border border-gray-200 text-gray-500 rounded-md text-sm border-dashed cursor-not-allowed" />
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">lock</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Status</label>
                  <div className="relative">
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as EditBinData['status'],
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Maintenance">Maintenance</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Zone Assignment</label>
                  <div className="relative">
                    <select required value={formData.zoneId} onChange={(e) => setFormData({...formData, zoneId: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer">
                      {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl">expand_more</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Bin Type</label>
                  <div className="relative">
                    <select
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as EditBinData['type'],
                        })
                      }
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
                    >
                      <option value="Standard Rack">Standard Rack</option>
                      <option value="Floor Location">Floor Location</option>
                      <option value="Pallet Position">Pallet Position</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl">expand_more</span>
                  </div>
                </div>

              </div>
            </div>

            {/* Group 2: Capacity & Dimensions */}
            <div className="relative pt-4">
              <div className="absolute -top-3 left-4 bg-white px-2 text-sm font-bold text-gray-800 uppercase tracking-wider">Capacity & Dimensions</div>
              <div className="border border-gray-200 rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-5 bg-gray-50/30">
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Max Weight (kg)</label>
                  <input type="number" step="0.01" value={formData.maxWeight} onChange={(e) => setFormData({...formData, maxWeight: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Max Volume (m³)</label>
                  <input type="number" step="0.01" value={formData.maxVolume} onChange={(e) => setFormData({...formData, maxVolume: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Stack Limit</label>
                  <input type="number" value={formData.stackLimit} onChange={(e) => setFormData({...formData, stackLimit: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Length (cm)</label>
                  <input type="number" value={formData.length} onChange={(e) => setFormData({...formData, length: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Width (cm)</label>
                  <input type="number" value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700">Height (cm)</label>
                  <input type="number" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                </div>

              </div>
            </div>

          </form>

          {/* CỘT PHẢI: LIVE STATISTICS */}
          <div className="w-full md:w-80 bg-gray-50 border-l border-gray-200 p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live Statistics</h3>
            
            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Current Occupancy</div>
              <div className={`text-4xl font-bold ${formData.stats.occupancy > 85 ? 'text-red-600' : 'text-gray-900'}`}>
                {formData.stats.occupancy}%
              </div>
              <div className="mt-1 text-xs font-medium text-gray-500">{formData.stats.occupancyTrend}</div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 mt-4 overflow-hidden">
                <div className={`h-full rounded-full ${formData.stats.occupancy > 85 ? 'bg-red-500' : 'bg-blue-600'}`} style={{ width: `${formData.stats.occupancy}%` }}></div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">SKU Count</div>
              <div className="text-4xl font-bold text-gray-900">{formData.stats.skuCount}</div>
              <div className="mt-1 text-xs font-medium text-gray-500">Active items</div>
            </div>

            <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm flex flex-col items-center justify-center text-center">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Last Picking</div>
              <div className="text-2xl font-bold text-gray-900">{formData.stats.lastPicking}</div>
              <div className="mt-1 text-xs font-medium text-gray-500">Recorded activity</div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3 rounded-b-xl">
          <button type="button" onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm outline-none focus:ring-2 focus:ring-gray-200">
            Cancel
          </button>
          <button type="submit" form="edit-bin-form" className="px-6 py-2.5 bg-gray-900 text-white rounded-md text-sm font-medium hover:bg-black transition-colors shadow-sm outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}