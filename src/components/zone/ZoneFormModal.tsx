'use client';

import React, { useState, useEffect } from 'react';
import type { ZoneData, ZoneFormModalProps } from '@/interfaces/modals';

export default function ZoneFormModal({ isOpen, mode, initialData, onClose, onSubmit }: ZoneFormModalProps) {
  const [formData, setFormData] = useState<ZoneData>({
    code: '', name: '', type: '', description: '', isActive: true
  });

  // Tự động reset hoặc điền form dựa vào Mode
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && initialData) {
        setFormData(initialData);
      } else {
        setFormData({ code: '', name: '', type: '', description: '', isActive: true });
      }
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isEdit = mode === 'edit';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col border border-gray-100">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isEdit ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
              <span className="material-symbols-outlined">{isEdit ? 'edit_document' : 'add_box'}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{isEdit ? 'Edit Zone' : 'Create New Zone'}</h2>
              <p className="text-sm font-medium text-gray-500 mt-0.5">{isEdit ? 'Update zone settings.' : 'Define a new area.'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col md:flex-row flex-1 max-h-[75vh] overflow-y-auto">
          
          {/* Cột trái: Form */}
          <form id="zone-form" onSubmit={handleSubmit} className="flex-1 p-6 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Zone Code {isEdit ? '(Read-Only)' : '*'}</label>
                <input 
                  type="text" required disabled={isEdit}
                  placeholder="e.g. ZN-A01"
                  value={formData.code}
                  onChange={(e) => setFormData({...formData, code: e.target.value})}
                  className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${isEdit ? 'bg-gray-100 text-gray-500 border-dashed cursor-not-allowed' : 'bg-white border-gray-300 text-gray-900'}`}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Zone Name *</label>
                <input 
                  type="text" required
                  placeholder="e.g. Cold Storage Alpha"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Zone Type *</label>
              <select 
                required
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled>-- Choose Type --</option>
                <option value="Picking Zone">Picking Zone</option>
                <option value="Bulk Storage">Bulk Storage</option>
                <option value="Receiving">Receiving</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Description</label>
              <textarea 
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              ></textarea>
            </div>

            <div className="pt-4 flex items-center justify-between border-t border-gray-100">
              <span className="text-sm font-bold text-gray-900">Active Status</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={formData.isActive} onChange={(e) => setFormData({...formData, isActive: e.target.checked})} />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </form>

          {/* Cột phải: Hướng dẫn / Thống kê */}
          <div className="w-full md:w-72 bg-gray-50 border-l border-gray-200 p-6 flex flex-col gap-4">
            {!isEdit ? (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Guidelines</h3>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"><p className="text-xs text-gray-600"><strong>Format:</strong> Use uppercase chars like WH-A1.</p></div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"><p className="text-xs text-gray-600"><strong>IoT:</strong> Auto-maps sensors to zone types.</p></div>
              </>
            ) : (
              <>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Statistics</h3>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"><p className="text-xs text-gray-500">Utilization</p><p className="font-bold text-gray-900">84% Capacity</p></div>
                <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm"><p className="text-xs text-gray-500">Items</p><p className="font-bold text-gray-900">1,248 units</p></div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-100">Cancel</button>
          <button type="submit" form="zone-form" className="px-6 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">{isEdit ? 'Save Changes' : 'Create Zone'}</button>
        </div>
      </div>
    </div>
  );
}