'use client';

import React from 'react';

interface CreateCategoryModalProps {
  onClose: () => void;
}

export default function CreateCategoryModal({ onClose }: CreateCategoryModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Tạo Category thành công! (Mock)');
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm font-sans"
    >
      {/* Box Form */}
      <div 
        className="bg-white w-full max-w-lg p-6 md:p-8 relative animate-in fade-in zoom-in-95 duration-200 rounded-xl shadow-2xl"
      >
        
        {/* Nút X đóng Modal */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">category</span>
          Create Category
        </h2>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          {/* Hàng 1: Code & Name (Layout 2 cột) */}
          <div className="flex flex-col md:flex-row gap-5">
            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Code <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all" 
                placeholder="e.g. ELEC-01" 
                type="text" 
                required 
              />
              <p className="text-xs text-gray-500 mt-1.5">Unique identifier for barcode</p>
            </div>

            <div className="flex-1 flex flex-col">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category Name <span className="text-red-500">*</span>
              </label>
              <input 
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all" 
                placeholder="e.g. Electronics" 
                type="text" 
                required 
              />
            </div>
          </div>

          {/* Hàng 2: Parent Category */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Parent Category</label>
            <div className="relative">
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm appearance-none cursor-pointer bg-white transition-all">
                <option value="">Select Parent Category</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="peripherals">Peripherals</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none text-lg">
                expand_more
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1.5">Leave empty to create a top-level category.</p>
          </div>

          {/* Hàng 3: Description */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all" 
              placeholder="Type category notes here..." 
              rows={3}
            ></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 mt-2 border-t border-gray-200">
            <button 
              onClick={onClose} 
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-sm" 
              type="button"
            >
              Cancel
            </button>
            <button 
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2" 
              type="submit"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              Save Category
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}