'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

// --- DATA LAYER: English Mock Data ---
interface CategoryItem {
  id: string;
  name: string;
  skuCount: number;
  status: 'Active' | 'Inactive' | 'Draft';
  children?: CategoryItem[];
}

const MOCK_CATEGORIES: CategoryItem[] = [
  {
    id: 'CAT-1',
    name: 'Electronics',
    skuCount: 1240,
    status: 'Active',
    children: [
      {
        id: 'CAT-1-1',
        name: 'Smartphones',
        skuCount: 452,
        status: 'Active',
        children: [
          { id: 'CAT-1-1-1', name: 'iPhone 15 Pro Max', skuCount: 128, status: 'Active' },
          { id: 'CAT-1-1-2', name: 'Samsung Galaxy S24', skuCount: 324, status: 'Active' },
        ]
      },
      { 
        id: 'CAT-1-2', 
        name: 'Laptops', 
        skuCount: 788, 
        status: 'Active',
        // Khởi tạo mảng children để Laptops trở thành Parent Node
        children: [
          { id: 'CAT-1-2-1', name: 'MacBook Pro 16"', skuCount: 200, status: 'Active' },
          { id: 'CAT-1-2-2', name: 'ThinkPad X1 Carbon', skuCount: 588, status: 'Active' }
        ]
      }
    ]
  },
  {
    id: 'CAT-2',
    name: 'Food & Beverage',
    skuCount: 5410,
    status: 'Active',
    children: [
      { id: 'CAT-2-1', name: 'Canned Goods', skuCount: 2100, status: 'Active' },
      { id: 'CAT-2-2', name: 'Frozen Foods', skuCount: 3310, status: 'Active' },
    ]
  }
];

// --- COMPONENT: Category Node ---
const CategoryNode = ({ 
  node, 
  level = 0, 
  searchQuery = '' 
}: { 
  node: CategoryItem; 
  level?: number;
  searchQuery?: string;
}) => {
  const router = useRouter();
  const hasChildren = node.children && node.children.length > 0;
  
  const isMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());
  const [isExpanded, setIsExpanded] = useState(true);

  // Data Integrity Constraint: Khóa xóa nếu có node con
  const canDelete = !hasChildren;
  const paddingLeft = level === 0 ? 0 : 32;

  return (
    <div className="flex flex-col select-none">
      <div 
        className={`group flex items-center justify-between p-2 rounded-md border transition-colors ${
          isMatch ? 'bg-yellow-50 border-yellow-200' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
        } ${level === 0 ? 'mt-3 bg-gray-50/50' : ''}`}
        style={{ marginLeft: `${paddingLeft}px` }}
      >
        <div className="flex items-center gap-1.5">
          {/* Nút điều hướng Expand/Collapse */}
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className={`w-6 h-6 flex items-center justify-center rounded text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors ${!hasChildren ? 'invisible' : ''}`}
          >
            <span className="material-symbols-outlined text-[20px]">
              {isExpanded ? 'arrow_drop_down' : 'arrow_right'}
            </span>
          </button>
          
          <span className={`material-symbols-outlined text-[20px] ${level === 0 ? 'text-amber-500' : 'text-blue-400'}`}>
            {level === 0 ? 'folder_open' : hasChildren ? 'folder' : 'article'}
          </span>

          <span className={`font-semibold ${level === 0 ? 'text-gray-900 text-base' : 'text-gray-700 text-sm'}`}>
            {node.name}
          </span>
        </div>

        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Action: Add Child */}
          <button 
            onClick={() => router.push(`/category?action=create&parentId=${node.id}`)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 rounded border border-green-200 hover:bg-green-100"
          >
            <span className="material-symbols-outlined text-[14px]">add</span> Add Child
          </button>

          {/* Action: Edit */}
          <button 
            onClick={() => router.push(`/category?action=edit&id=${node.id}`)}
            className="p-1 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50"
            title="Edit Category"
          >
            <span className="material-symbols-outlined text-[18px]">edit</span>
          </button>

          {/* Action: Delete (với Data Integrity Constraint) */}
          <button 
            onClick={() => canDelete && router.push(`/category?action=delete&id=${node.id}`)}
            className={`p-1 rounded transition-colors flex items-center justify-center w-7 h-7 ${
              canDelete 
                ? 'text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer' 
                : 'text-gray-300 cursor-not-allowed bg-gray-50'
            }`}
            title={canDelete ? 'Delete Branch' : 'Constraint Error: Node contains children'}
            disabled={!canDelete}
          >
            <span className="material-symbols-outlined text-[18px]">
              {canDelete ? 'delete' : 'lock'}
            </span>
          </button>
        </div>
      </div>

      {/* Kết xuất đệ quy (Recursive Render) */}
      {isExpanded && hasChildren && (
        <div className="relative">
          <div className="absolute top-0 bottom-2 w-px bg-gray-200" style={{ left: `${paddingLeft + 11}px` }}></div>
          {node.children!.map((child) => (
            <CategoryNode key={child.id} node={child} level={level + 1} searchQuery={searchQuery} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- COMPONENT CHÍNH ---
export default function CategoryTreePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 p-4 md:p-8 min-h-screen font-sans">
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-gray-500">account_tree</span>
            Category Hierarchy
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage inheritance structure and roll-up reporting hierarchy.
          </p>
        </div>
        
        <button 
          onClick={() => router.push('/category?action=create&level=root')}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 shadow-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">add_box</span>
          Add Root Category
        </button>
      </div>

      <div className="flex flex-col gap-4 bg-white p-6 rounded-lg border border-gray-200 shadow-sm min-h-[500px] overflow-x-auto">
        
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md w-full max-w-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
          <span className="material-symbols-outlined text-gray-400 text-xl">search</span>
          <input 
            type="text" 
            placeholder="Search categories..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none p-0 text-sm text-gray-900 w-full focus:outline-none placeholder-gray-400"
          />
        </div>

        <div className="min-w-[600px] mt-2">
          {MOCK_CATEGORIES.map(category => (
            <CategoryNode key={category.id} node={category} searchQuery={searchQuery} />
          ))}
        </div>
      </div>

    </div>
  );
}