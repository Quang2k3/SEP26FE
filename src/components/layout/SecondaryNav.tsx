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

  if (actions.length === 0) return null;

  return (
    <div className="sticky top-16 z-40 bg-white sketch-box border-t-0 py-3 px-6 flex flex-wrap gap-2">
      {actions.map((action) => {
        const isActive = pathname === action.path;
        
        return (
          <Link
            key={action.path}
            href={action.path}
            className={`text-sm px-4 py-1.5 transition-all ${
              isActive 
                ? 'font-bold border-2 border-black bg-black text-white shadow-[2px_2px_0px_#000]' // Highlight hộp đen giống Header
                : 'font-bold text-gray-600 hover:text-black hover:bg-gray-100 border-2 border-transparent' // Bình thường (không gạch chân)
            }`}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}