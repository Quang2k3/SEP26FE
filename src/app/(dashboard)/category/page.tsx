'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CreateCategoryModal from '@/components/category/CreateCategoryModal';

const MOCK_CATEGORIES = [
  { code: 'CAT-001', name: 'Electronics & Hardware', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-002', name: 'Perishables (Cold Storage)', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-003', name: 'Bulk Industrial Parts', status: 'Inactive', color: 'bg-gray-300' },
  { code: 'CAT-004', name: 'Safety Equipment', status: 'Active', color: 'bg-green-400' },
  { code: 'CAT-005', name: 'Hazardous Materials', status: 'Restricted', color: 'bg-yellow-400' },
  { code: 'CAT-006', name: 'Office Supplies', status: 'Active', color: 'bg-green-400' },
];

function CategoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Xác định action từ URL (ví dụ: ?action=create)
  const currentAction = searchParams.get('action');

  // Hàm xóa param khỏi URL để đóng Modal
  const closeModal = () => {
    router.push('/category');
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 p-4 md:p-8 relative">
      
      {/* --- PHẦN 1: GIAO DIỆN DANH SÁCH (Bị mờ khi có action trên URL) --- */}
      <div className={`flex flex-col gap-8 transition-all duration-300 ${currentAction ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
        
        {/* Header: Title & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-3xl font-bold underline decoration-2 underline-offset-4 uppercase">
            Category List
          </h1>
          <div className="sketch-input sketch-box flex items-center gap-2 w-64 bg-white p-2">
            <span className="material-symbols-outlined text-gray-500">search</span>
            <input 
              className="w-full border-none bg-transparent p-0 focus:ring-0 focus:outline-none" 
              placeholder="Search category..." 
              type="text" 
            />
          </div>
        </div>

        {/* Main Table */}
        <main className="sketch-box p-1 min-h-[500px] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="text-left p-4 border-r-2 border-black">Code</th>
                <th className="text-left p-4 border-r-2 border-black">Name</th>
                <th className="text-left p-4">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CATEGORIES.map((cat, index) => (
                <tr key={index} className="border-b-2 border-black hover:bg-gray-100">
                  <td className="p-4 border-r-2 border-black font-bold">{cat.code}</td>
                  <td className="p-4 border-r-2 border-black">{cat.name}</td>
                  <td className="p-4 flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full border-2 border-black ${cat.color}`}></div>
                    {cat.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        {/* Pagination */}
        <div className="flex justify-center items-center gap-2">
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center bg-black text-white">
            1
          </button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">2</button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">3</button>
          <span className="px-2 font-bold">...</span>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">10</button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* --- PHẦN 2: ĐIỀU HƯỚNG CÁC MODAL --- */}
      {currentAction === 'create' && (
        <CreateCategoryModal onClose={closeModal} />
      )}

      {/* Tương lai: Thêm modal edit ở đây */}
      {/* {currentAction === 'edit' && (
        <EditCategoryModal onClose={closeModal} />
      )} */}

    </div>
  );
}

// Suspense bọc ngoài cùng (Bắt buộc trong Next.js App Router khi xài useSearchParams)
export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold">Loading UI...</div>}>
      <CategoryContent />
    </Suspense>
  );
}