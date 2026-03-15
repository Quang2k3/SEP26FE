'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_ACTIONS, ZONE_ACTIONS, BIN_ACTIONS, NavAction } from '@/config/navigation';

export default function SecondaryNav() {
  const pathname = usePathname();
  let actions: NavAction[] = [];

  if (pathname.startsWith('/category'))  actions = CATEGORY_ACTIONS;
  else if (pathname.startsWith('/zone')) actions = ZONE_ACTIONS;
  else if (pathname.startsWith('/bin'))  actions = BIN_ACTIONS;

  if (actions.length <= 1) return null;

  return (
    <div
      className="sticky top-14 z-30 py-2.5 px-4 md:px-8 flex flex-wrap gap-1.5 md:gap-2 w-full"
      style={{
        position: 'relative',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        boxShadow: '0 1px 8px rgba(99,102,241,0.06)',
      }}
    >
      {/* Blur layer riêng — tránh tạo stacking context cho modal children */}
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0,
        background: 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        zIndex: -1, pointerEvents: 'none',
      }} />
      {actions.map((action) => {
        const isActive = pathname === action.path;
        return (
          <Link
            key={action.path}
            href={action.path}
            className={`text-sm font-medium px-4 py-1.5 rounded-md transition-colors ${
              isActive
                ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
            }`}
          >
            {action.label}
          </Link>
        );
      })}
    </div>
  );
}