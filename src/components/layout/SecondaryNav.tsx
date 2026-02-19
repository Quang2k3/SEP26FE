'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_ACTIONS, ZONE_ACTIONS, BIN_ACTIONS, NavAction } from '@/config/navigation';

export default function SecondaryNav() {
  const pathname = usePathname();

  // 1. Xác định mảng actions dựa trên current route
  let actions: NavAction[] = [];
  
  if (pathname.startsWith('/category')) {
    actions = CATEGORY_ACTIONS;
  } else if (pathname.startsWith('/zone')) {
    actions = ZONE_ACTIONS;
  } else if (pathname.startsWith('/bin')) {
    actions = BIN_ACTIONS;
  }

  // 2. Nếu không ở trong các route quản lý (ví dụ: đang ở /dashboard), thì ẩn thanh này đi
  if (actions.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 bg-white sketch-box border-t-0 py-2 px-6 flex flex-wrap gap-6">
      {actions.map((action) => {
        const isActive = pathname === action.path;
        
        return (
          <Link
            key={action.path}
            href={action.path}
            className={`text-sm font-bold transition-all hover:underline ${
              isActive ? 'underline decoration-2' : ''
            }`}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}