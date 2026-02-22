'use client';

import React, { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CreateCategoryModal from '@/components/category/CreateCategoryModal';
import EditCategoryModal from '@/components/category/EditCategoryModal';
import CategoryDetailModal from '@/components/category/CategoryDetailModal';

const MOCK_CATEGORIES = [
  { code: 'CAT-001', name: 'Electronics & Hardware', status: 'Active', color: 'bg-green-500' },
  { code: 'CAT-002', name: 'Perishables (Cold Storage)', status: 'Active', color: 'bg-green-500' },
  { code: 'CAT-003', name: 'Bulk Industrial Parts', status: 'Inactive', color: 'bg-gray-400' },
  { code: 'CAT-004', name: 'Safety Equipment', status: 'Active', color: 'bg-green-500' },
  { code: 'CAT-005', name: 'Hazardous Materials', status: 'Restricted', color: 'bg-amber-500' },
  { code: 'CAT-006', name: 'Office Supplies', status: 'Active', color: 'bg-green-500' },
];

function CategoryContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const currentAction = searchParams.get('action');
  const currentId = searchParams.get('id');

  const closeModal = () => {
    router.push('/category');
  };

  return (
    <div className="max-w-7xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 bg-gray-50/50 min-h-screen font-sans">
      
      <div className={`flex flex-col gap-6 transition-all duration-300 ${currentAction ? 'opacity-20 blur-[2px] pointer-events-none' : 'opacity-100'}`}>
        
        {/* Header & Search */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Category List</h1>
            <p className="mt-1 text-sm text-gray-500">Manage product categories and classifications.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="flex flex-1 md:w-64 items-center gap-2 bg-white border border-gray-200 rounded-md px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 shadow-sm transition-all">
              <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
              <input 
                className="w-full bg-transparent border-none p-0 text-sm text-gray-900 focus:outline-none focus:ring-0 placeholder-gray-400" 
                placeholder="Search category..." 
                type="text" 
              />
            </div>
            {/* Nút Create chuẩn Enterprise */}
            <button 
              onClick={() => router.push('/category?action=create')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              Create
            </button>
          </div>
        </div>

        {/* Main Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {MOCK_CATEGORIES.map((cat, index) => (
                  <tr key={index} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{cat.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{cat.name}</td>
                    <td className="px-6 py-4">
                      {/* Thẻ Status kiểu Pill */}
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        cat.status === 'Active' ? 'bg-green-100 text-green-800' :
                        cat.status === 'Inactive' ? 'bg-gray-100 text-gray-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${cat.color}`}></span>
                        {cat.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => router.push(`/category?action=detail&id=${cat.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                        <button 
                          onClick={() => router.push(`/category?action=edit&id=${cat.code}`)}
                          className="text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit Category"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Tối giản */}
        <div className="flex justify-between items-center py-2">
          <span className="text-sm text-gray-500">Showing 1 to 6 of 45 results</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">Prev</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm bg-blue-50 text-blue-600 font-medium border-blue-200">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-700 hover:bg-gray-50">2</button>
            <button className="px-3 py-1 border border-gray-200 rounded text-sm text-gray-500 hover:bg-gray-50">Next</button>
          </div>
        </div>

      </div>

      {/* Gọi Modal hiện tại (Các Modal này cũng cần được lột xác ở bước sau) */}
      {(() => {
        const selectedCategory = MOCK_CATEGORIES.find(cat => cat.code === currentId);
        return (
          <>
            {currentAction === 'create' && <CreateCategoryModal onClose={closeModal} />}
            {currentAction === 'edit' && selectedCategory && <EditCategoryModal onClose={closeModal} categoryData={selectedCategory} />}
            {currentAction === 'detail' && selectedCategory && <CategoryDetailModal onClose={closeModal} categoryData={selectedCategory} />}
          </>
        );
      })()}

    </div>
  );
}

export default function CategoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading UI...</div>}>
      <CategoryContent />
    </Suspense>
  );
}