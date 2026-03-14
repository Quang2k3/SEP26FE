'use client';

import type { ReactNode } from 'react';

interface AdminPageProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  headerMeta?: ReactNode;
  children: ReactNode;
}

export function AdminPage({
  title, description, actions, breadcrumb, headerMeta, children,
}: AdminPageProps) {
  return (
    <div className="w-full flex flex-col gap-5 font-sans page-enter">

      {/* Page header — outside card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          {breadcrumb && <div className="text-xs text-gray-400 mb-1">{breadcrumb}</div>}
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">{title}</h1>
            {headerMeta}
          </div>
          {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
        </div>
        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap justify-end flex-shrink-0">{actions}</div>
        )}
      </div>

      {/* Content */}
      {children}
    </div>
  );
}
