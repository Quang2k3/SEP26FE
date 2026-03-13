'use client';

import React, { useState, useEffect } from 'react';
import type { BinFormData, CreateBinModalProps } from '@/interfaces/modals';

export default function CreateBinModal({ isOpen, zones, onClose, onSubmit }: CreateBinModalProps) {
  const [formData, setFormData] = useState<BinFormData>({
    code: '', zoneId: '', capacity: '', length: '', width: '', height: ''
  });

  // Reset form mỗi khi mở lại
  useEffect(() => {
    if (!isOpen) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormData({ code: '', zoneId: '', capacity: '', length: '', width: '', height: '' });
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined">add_box</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Create New Bin</h2>
              <p className="text-sm font-medium text-gray-500 mt-0.5">Define a new specific storage slot.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors outline-none focus:ring-2 focus:ring-gray-200">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 max-h-[75vh] overflow-y-auto">
          
          <form id="create-bin-form" onSubmit={handleSubmit} className="flex-1 p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Bin Code <span className="text-red-500">*</span></label>
                <input 
                  type="text" required
                  placeholder="e.g. A-12-04"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-900"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">Parent Zone <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select 
                    required
                    value={formData.zoneId}
                    onChange={(e) => setFormData({...formData, zoneId: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
                  >
                    <option value="" disabled>Select a Zone...</option>
                    {zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name} ({zone.id})</option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-xl">expand_more</span>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-gray-700">Max Capacity Weight (kg)</label>
              <input 
                type="number" step="0.01" placeholder="0.00"
                value={formData.capacity}
                onChange={(e) => setFormData({...formData, capacity: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
              />
            </div>

            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700">Dimensions (cm)</label>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input type="number" placeholder="Length (L)" value={formData.length} onChange={(e) => setFormData({...formData, length: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                <input type="number" placeholder="Width (W)" value={formData.width} onChange={(e) => setFormData({...formData, width: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
                <input type="number" placeholder="Height (H)" value={formData.height} onChange={(e) => setFormData({...formData, height: e.target.value})} className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 shadow-sm" />
              </div>
            </div>
          </form>

          {/* Cột phải: Hướng dẫn nhập liệu */}
          <div className="w-full md:w-72 bg-gray-50 border-l border-gray-200 p-6 flex flex-col gap-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bin Constraints</h3>
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 shadow-sm">
              <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2"><span className="material-symbols-outlined text-amber-500 text-lg">warning</span> Unique Code</h4>
              <p className="text-xs text-amber-700 mt-1">Bin Code must be strictly unique across the entire warehouse.</p>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2"><span className="material-symbols-outlined text-blue-500 text-lg">view_in_ar</span> Volume Calc</h4>
              <p className="text-xs text-gray-500 mt-1">Dimensions are used by the auto-putaway algorithm to check item fit.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button type="submit" form="create-bin-form" className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">Create Bin</button>
        </div>
      </div>
    </div>
  );
}