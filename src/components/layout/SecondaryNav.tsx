'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CATEGORY_ACTIONS, ZONE_ACTIONS, BIN_ACTIONS, LOCATION_ACTIONS, WAREHOUSE_ACTIONS, NavAction } from '@/config/navigation';
import { getStoredSession } from '@/services/authService';

export default function SecondaryNav() {
  const pathname = usePathname();
  const session  = getStoredSession();
  const userRoles: string[] = session?.user?.roleCodes ?? [];

  let allActions: NavAction[] = [];
  if (pathname.startsWith('/category'))    allActions = CATEGORY_ACTIONS;
  else if (pathname.startsWith('/bin'))    allActions = BIN_ACTIONS;
  // Zone + Location cùng section "Kho hàng" → dùng WAREHOUSE_ACTIONS
  else if (pathname.startsWith('/zone') || pathname.startsWith('/location')) allActions = WAREHOUSE_ACTIONS;

  // Lọc theo role: nếu action có roles[] thì chỉ hiện với user có ít nhất 1 role khớp
  const actions = allActions.filter(action =>
    !action.roles || action.roles.some(r => userRoles.includes(r))
  );

  if (actions.length <= 1) return null;

  return (
    <div
      className="flex-shrink-0 py-2.5 px-4 md:px-8 flex flex-wrap gap-1.5 md:gap-2 w-full"
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
