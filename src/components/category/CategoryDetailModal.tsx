'use client';

import React from 'react';

interface CategoryDetailModalProps {
  onClose: () => void;
  categoryData: {
    code: string;
    name: string;
    status: string;
    color: string;
  };
}

const MOCK_SKUS = [
  { code: 'SKU-8821', desc: 'Industrial Power Drill v4', stock: 20 },
  { code: 'SKU-1044', desc: 'Wrench Set M10 (Chrome)', stock: 15 },
  { code: 'SKU-4552', desc: 'Safety Gloves (Heavy Duty)', stock: 45 },
];

export default function CategoryDetailModal({ onClose, categoryData }: CategoryDetailModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm font-sans" onClick={onClose}>
      <div 
        className="bg-white w-full max-w-3xl rounded-xl shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()} 
      >
        
        {/* Header Modal - Cố định */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
            <span className="material-symbols-outlined text-blue-600">visibility</span>
            Category Detail
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Nội dung Modal - Cho phép cuộn dọc */}
        <div className="p-6 overflow-y-auto">
          
          {/* Box thông tin Category */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 p-5 rounded-lg border border-gray-200">
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category Code</span>
              <span className="text-lg font-bold text-gray-900">
                {categoryData.code}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Category Name</span>
              <span className="text-lg font-medium text-gray-900">
                {categoryData.name}
              </span>
            </div>
            <div>
              <span className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</span>
              <div className="mt-1">
                {/* Thẻ Status kiểu Pill đồng bộ với bảng Category List */}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  categoryData.status === 'Active' ? 'bg-green-100 text-green-800' :
                  categoryData.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${categoryData.color}`}></span>
                  {categoryData.status}
                </span>
              </div>
            </div>
          </div>

          {/* Bảng SKU */}
          <div>
            <h3 className="text-sm font-bold text-gray-900 mb-3">Assigned SKUs</h3>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">SKU Code</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Stock</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {MOCK_SKUS.map((sku, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 text-sm font-medium text-blue-600 hover:underline cursor-pointer">{sku.code}</td>
                      <td className="py-3 px-4 text-sm text-gray-700">{sku.desc}</td>
                      <td className="py-3 px-4 text-sm font-bold text-gray-900 text-right">{sku.stock}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
        </div>

        {/* Footer Modal - Cố định */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end rounded-b-xl">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm flex items-center gap-2"
          >
            Close Detail
          </button>
        </div>

      </div>
    </div>
  );
}