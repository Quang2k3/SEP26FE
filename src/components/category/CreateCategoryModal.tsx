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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px]"
      // ĐÃ XÓA: onClick={onClose} ở đây để tránh việc click nhầm ra ngoài làm tắt form
    >
      {/* Box Form */}
      <div 
        className="sketch-box bg-white w-full max-w-lg p-6 relative animate-in fade-in zoom-in duration-200 shadow-[4px_4px_0px_#00000040]"
        // ĐÃ XÓA: onClick={(e) => e.stopPropagation()} vì không còn cần thiết nữa
      >
        
        {/* Nút X đóng Modal */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 hover:bg-gray-100 border-2 border-transparent hover:border-black transition-all rounded-full"
        >
          <span className="material-symbols-outlined font-bold text-xl">close</span>
        </button>

        <h2 className="text-xl font-bold mb-4 border-b-[3px] border-black pb-2 uppercase tracking-tight">
          Create Category
        </h2>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {/* Hàng 1: Code & Name (Layout 2 cột) */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-bold italic">Category Code *</label>
              <input className="sketch-input w-full text-sm h-9" placeholder="[e.g. ELEC-01]" type="text" required />
              <p className="text-xs text-gray-500 font-bold leading-tight">(Unique for barcode)</p>
            </div>

            <div className="flex-1 flex flex-col gap-1">
              <label className="text-sm font-bold italic">Category Name *</label>
              <input className="sketch-input w-full text-sm h-9" placeholder="[e.g. Electronics]" type="text" required />
            </div>
          </div>

          {/* Hàng 2: Parent Category */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold italic">Parent Category</label>
            <div className="relative">
              <select className="sketch-input w-full text-sm h-9 appearance-none cursor-pointer bg-white pl-3 pr-8">
                <option value="">[Select Parent Category]</option>
                <option>Hardware</option>
                <option>Software</option>
                <option>Peripherals</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-base">
                expand_more
              </span>
            </div>
            <p className="text-xs text-gray-500 font-bold italic leading-tight">Leave empty for top-level</p>
          </div>

          {/* Hàng 3: Description */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold italic">Description</label>
            <textarea className="sketch-input w-full text-sm resize-none p-2" placeholder="[Type category notes here...]" rows={3}></textarea>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t-[3px] border-black border-dashed mt-2">
            <button 
              onClick={onClose} 
              className="sketch-button px-4 py-1.5 text-sm hover:bg-gray-100" 
              type="button"
            >
              Cancel
            </button>
            <button 
              className="sketch-button bg-black text-white hover:bg-gray-800 px-6 py-1.5 text-sm font-bold shadow-[2px_2px_0px_#000]" 
              type="submit"
            >
              SAVE
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}