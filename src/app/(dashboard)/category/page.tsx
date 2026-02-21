'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CreateCategoryModal from '@/components/category/CreateCategoryModal';
import EditCategoryModal from '@/components/category/EditCategoryModal';
import CategoryDetailModal from '@/components/category/CategoryDetailModal';

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
  
  // Lấy các tham số từ URL
  const currentAction = searchParams.get('action'); // 'create', 'edit', 'detail'
  const currentId = searchParams.get('id');         // 'CAT-001', ...

  // Hàm dùng chung để đóng tất cả các Modal
  const closeModal = () => {
    router.push('/category');
  };

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-8 p-4 md:p-8 relative">
      
      {/* --- PHẦN 1: DANH SÁCH CATEGORY (Sẽ mờ đi khi có Modal mở) --- */}
      <div className={`flex flex-col gap-8 transition-all duration-300 ${currentAction ? 'opacity-20 blur-[1px] pointer-events-none' : 'opacity-100'}`}>
        
        {/* Tiêu đề & Search */}
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

        {/* Bảng dữ liệu */}
        <main className="sketch-box p-1 min-h-[500px] bg-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-black bg-gray-50">
                <th className="text-left p-4 border-r-2 border-black">Code</th>
                <th className="text-left p-4 border-r-2 border-black">Name</th>
                <th className="text-left p-4 border-r-2 border-black">Status</th>
                <th className="text-center p-4 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_CATEGORIES.map((cat, index) => (
                <tr key={index} className="border-b-2 border-black hover:bg-gray-100">
                  <td className="p-4 border-r-2 border-black font-bold">{cat.code}</td>
                  <td className="p-4 border-r-2 border-black">{cat.name}</td>
                  <td className="p-4 border-r-2 border-black">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full border-2 border-black ${cat.color}`}></div>
                      {cat.status}
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* Nút View Detail */}
                      <button 
                        onClick={() => router.push(`/category?action=detail&id=${cat.code}`)}
                        className="p-1.5 sketch-box hover:bg-gray-200 flex items-center justify-center transition-transform hover:-translate-y-0.5"
                        title="View Details"
                      >
                        <span className="material-symbols-outlined text-sm">visibility</span>
                      </button>
                      
                      {/* Nút Edit */}
                      <button 
                        onClick={() => router.push(`/category?action=edit&id=${cat.code}`)}
                        className="p-1.5 sketch-box hover:bg-black hover:text-white flex items-center justify-center transition-transform hover:-translate-y-0.5"
                        title="Edit Category"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>

        {/* Phân trang */}
        <div className="flex justify-center items-center gap-2">
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center bg-black text-white">1</button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">2</button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">3</button>
          <span className="px-2 font-bold">...</span>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">10</button>
          <button className="sketch-button sketch-box size-10 flex items-center justify-center hover:bg-gray-50">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {/* --- PHẦN 2: HIỂN THỊ CÁC MODAL DỰA TRÊN URL --- */}
      
      {/* Lấy toàn bộ dữ liệu của Category đang được chọn */}
      {(() => {
        const selectedCategory = MOCK_CATEGORIES.find(cat => cat.code === currentId);

        return (
          <>
            {currentAction === 'create' && (
              <CreateCategoryModal onClose={closeModal} />
            )}

            {currentAction === 'edit' && selectedCategory && (
              <EditCategoryModal onClose={closeModal} categoryData={selectedCategory} />
            )}

            {currentAction === 'detail' && selectedCategory && (
              <CategoryDetailModal onClose={closeModal} categoryData={selectedCategory} />
            )}
          </>
        );
      })()}

    </div>
  );
}

// Bắt buộc phải có thẻ Suspense bọc ngoài cùng khi dùng useSearchParams
export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-bold">Loading UI...</div>}>
      <CategoryContent />
    </Suspense>
  );
}