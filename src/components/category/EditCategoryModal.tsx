'use client';

import React from 'react';

interface EditCategoryModalProps {
  onClose: () => void;
  categoryData: {
    code: string;
    name: string;
    status: string;
  };
}

export default function EditCategoryModal({ onClose, categoryData }: EditCategoryModalProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Cập nhật Category [${categoryData.code}] thành công! (Mock)`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm font-sans">
      <div className="bg-white w-full max-w-lg p-6 md:p-8 relative animate-in fade-in zoom-in-95 duration-200 rounded-xl shadow-2xl">
        
        {/* Nút X đóng Modal */}
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors flex items-center justify-center"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600">edit_square</span>
          Edit Category
        </h2>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          
          {/* Field: Category Code (Disabled) */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Category Code</label>
            <input 
              type="text"
              className="w-full px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed text-sm" 
              value={categoryData.code} 
              disabled 
            />
          </div>

          {/* Field: Category Name */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category Name <span className="text-red-500">*</span>
            </label>
            <input 
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all" 
              defaultValue={categoryData.name} 
              required 
            />
          </div>

          {/* Field: Description */}
          <div className="flex flex-col">
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none transition-all" 
              rows={4}
              defaultValue={`Description for ${categoryData.name}...`}
            ></textarea>
          </div>

          {/* Info Callout */}
          <div className="bg-blue-50 border border-blue-100 rounded-md p-3 flex items-start gap-2 mt-1">
            <span className="material-symbols-outlined text-blue-500 text-lg shrink-0">info</span>
            <p className="text-xs text-blue-800 leading-relaxed">
              Changes to this category will be logged for auditing purposes. 
              The category code cannot be modified once created.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-6 border-t border-gray-200 mt-2">
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
              Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}