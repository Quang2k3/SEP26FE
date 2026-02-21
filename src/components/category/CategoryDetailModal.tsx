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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]" onClick={onClose}>
      <div 
        className="sketch-box bg-white w-full max-w-3xl p-6 md:p-8 relative animate-in fade-in zoom-in duration-200 shadow-[4px_4px_0px_#00000040] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} 
      >
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all rounded-full">
          <span className="material-symbols-outlined font-bold text-xl">close</span>
        </button>

        <h2 className="text-2xl font-bold mb-6 border-b-[3px] border-black pb-2 uppercase tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined">visibility</span>
          Category Detail
        </h2>

        {/* --- Dữ liệu động dựa vào dòng click --- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase text-gray-500">Category Code</span>
            <span className="text-xl font-bold border-b-2 border-dashed border-gray-400 pb-1">
              {categoryData.code}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase text-gray-500">Category Name</span>
            <span className="text-xl font-bold border-b-2 border-dashed border-gray-400 pb-1">
              {categoryData.name}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold uppercase text-gray-500">Status</span>
            <div className={`text-xl font-bold flex items-center gap-2 border-b-2 border-dashed border-gray-400 pb-1`}>
              {/* Hiển thị màu chấm tròn tương ứng với status */}
              <div className={`w-3 h-3 rounded-full border-2 border-black ${categoryData.color}`}></div>
              {categoryData.status}
            </div>
          </div>
        </div>

        {/* Bảng SKU (Giữ nguyên) */}
        <div className="border-[3px] border-black p-4 bg-gray-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold uppercase tracking-tight">Assigned SKUs</h3>
          </div>
          <div className="bg-white border-2 border-black overflow-hidden">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b-[3px] border-black bg-gray-100">
                  <th className="text-left py-2 px-4 border-r-2 border-black font-bold text-sm">SKU Code</th>
                  <th className="text-left py-2 px-4 border-r-2 border-black font-bold text-sm">Description</th>
                  <th className="text-right py-2 px-4 font-bold text-sm">Stock</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_SKUS.map((sku, index) => (
                  <tr key={index} className="border-b-2 border-black hover:bg-gray-50">
                    <td className="py-2 px-4 border-r-2 border-black font-bold">{sku.code}</td>
                    <td className="py-2 px-4 border-r-2 border-black">{sku.desc}</td>
                    <td className="py-2 px-4 text-right font-bold">{sku.stock}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-6 mt-6">
          <button onClick={onClose} className="sketch-button bg-black text-white hover:bg-gray-800 px-8 py-2 text-sm font-bold shadow-[2px_2px_0px_#000]">
            Close Detail
          </button>
        </div>

      </div>
    </div>
  );
}