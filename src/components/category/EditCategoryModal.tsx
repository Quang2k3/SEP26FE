'use client';

import React from 'react';

interface EditCategoryModalProps {
  onClose: () => void;
  // Khai báo kiểu dữ liệu nhận vào
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]">
      <div className="sketch-box bg-white w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200 shadow-[4px_4px_0px_#00000040]">
        
        <button onClick={onClose} className="absolute top-4 right-4 p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all rounded-full">
          <span className="material-symbols-outlined font-bold text-xl">close</span>
        </button>

        <h2 className="text-xl font-bold mb-4 border-b-[3px] border-black pb-2 uppercase tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined">edit</span>
          Edit Category
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold italic">Category Code</label>
            <div className="sketch-input w-full text-sm h-9 bg-gray-100 text-gray-500 flex items-center cursor-not-allowed">
              {categoryData.code} (Read Only)
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold italic">Category Name *</label>
            <input 
              className="sketch-input w-full text-sm h-9" 
              type="text" 
              defaultValue={categoryData.name} // <--- Hiển thị đúng tên của dòng được click
              required 
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold italic">Description</label>
            <textarea 
              className="sketch-input w-full text-sm resize-none p-2" 
              rows={4}
              defaultValue={`Description for ${categoryData.name}...`}
            ></textarea>
          </div>

          <div className="italic text-gray-500 text-xs border-l-2 border-black pl-3 mt-2">
            * Changes will be logged for auditing purposes. 
            Category code cannot be modified once created.
          </div>

          <div className="flex justify-end items-center gap-4 pt-4 border-t-[3px] border-black border-dashed mt-2">
            <button onClick={onClose} className="text-sm font-bold underline hover:text-red-600 cursor-pointer" type="button">
              Cancel
            </button>
            <button className="sketch-button bg-black text-white hover:bg-gray-800 px-6 py-1.5 text-sm font-bold shadow-[2px_2px_0px_#000] flex items-center gap-2" type="submit">
              <span className="material-symbols-outlined text-sm">save</span>
              Save Changes
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}