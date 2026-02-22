'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_ACTIONS, ZONE_ACTIONS, BIN_ACTIONS, NavAction } from '@/config/navigation';

export default function SecondaryNav() {
  const pathname = usePathname();

  let actions: NavAction[] = [];
  
  if (pathname.startsWith('/category')) {
    actions = CATEGORY_ACTIONS;
  } else if (pathname.startsWith('/zone')) {
    actions = ZONE_ACTIONS;
  } else if (pathname.startsWith('/bin')) {
    actions = BIN_ACTIONS;
  }

  // Nếu không có menu phụ thì ẩn luôn
  if (actions.length === 0) return null;

  return (
    // Dính ngay dưới thanh Header chính (top-16)
    <div className="sticky top-16 z-30 bg-white/80 backdrop-blur-md border-b border-gray-200 py-2.5 px-4 md:px-8 flex flex-wrap gap-1.5 md:gap-2 shadow-sm w-full">
      {actions.map((action) => {
        const isActive = pathname === action.path;
        
        return (
          <Link
            key={action.path}
            href={action.path}
            className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
              isActive 
                ? 'bg-blue-50 text-blue-700 shadow-sm ring-1 ring-blue-100' // Tab đang chọn: Nền xanh, viền siêu mỏng xanh, chữ xanh
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80' // Tab bình thường: Chữ xám, hover lên nền xám nhạt
            }`}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}