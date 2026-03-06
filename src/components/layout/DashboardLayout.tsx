'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import DashboardHeader from './DashboardHeader';
import {
  CATEGORY_ACTIONS,
  ZONE_ACTIONS,
  BIN_ACTIONS,
  INBOUND_ACTIONS,
  OUTBOUND_ACTIONS,
  type NavAction,
  USER_MANAGEMENT_ACTIONS,
  MANAGER_DASHBOARD,
} from '@/config/navigation';

type SidebarSection = {
  key: string;
  name: string;
  icon: string;
  path?: string;
  children?: NavAction[];
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});

  // useEffect(() => {
  //   const token = localStorage.getItem('auth_token');
  //   if (!token) {
  //     router.push('/login');
  //   }
  // }, [router]);

  const sections: SidebarSection[] = [
    {
      key: 'dashboard',
      name: 'Dashboard',
      path: '/dashboard',
      icon: 'space_dashboard',
    },
    {
      key: 'category',
      name: 'Category',
      icon: 'category',
      children: CATEGORY_ACTIONS,
    },
    {
      key: 'zone',
      name: 'Zone',
      icon: 'grid_view',
      children: ZONE_ACTIONS,
    },
    {
      key: 'bin',
      name: 'Bin',
      icon: 'inventory_2',
      children: BIN_ACTIONS,
    },
    {
      key: 'inbound',
      name: 'Inbound',
      icon: 'input_circle',
      children: INBOUND_ACTIONS,
    },
    {
      key: 'outbound',
      name: 'Outbound',
      icon: 'output_circle',
      children: OUTBOUND_ACTIONS,
    },
    {
      key: 'user-management',
      name: 'User Management',
      icon: 'person',
      path: '/user-management',
    },
    {
      key: "gate-check",
      name: "GateCheck",
      icon: "qr_code_scanner",
      path: "/gate-check",
    },
    {
      key: "manager-dashboard",
      name: "Manager Dashboard",
      icon: "qr_code_scanner",
      children: MANAGER_DASHBOARD,
    },
  ];

  const toggleSection = (key: string) => {
    setOpenMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="min-h-screen bg-[#f0f0f0]">
      <DashboardHeader />

      <div className="flex gap-3 md:gap-4 lg:gap-6">
        <aside className="hidden md:block shrink-0">
          <nav
            className={`h-[calc(100vh-4rem)] sticky top-16 bg-white border-r border-gray-200 shadow-sm transition-all duration-200 flex flex-col ${
              collapsed ? 'w-[64px]' : 'w-60'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-3 border-b border-gray-100">
              {!collapsed && (
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Main menu
                </div>
              )}
              <button
                type="button"
                onClick={() => setCollapsed((v) => !v)}
                className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-gray-100 text-gray-500 border border-gray-200 text-xs"
                aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {collapsed ? 'chevron_right' : 'chevron_left'}
                </span>
              </button>
            </div>

            <div className="flex-1 overflow-auto py-2">
              <div className="flex flex-col gap-1 px-1">
                {sections.map((section) => {
                  const hasChildren = section.children && section.children.length > 0;

                  const parentActive = hasChildren
                    ? section.children!.some((child) =>
                        pathname === child.path ||
                        pathname.startsWith(child.path + '/'),
                      )
                    : section.path
                    ? pathname === section.path ||
                      pathname.startsWith(section.path + '/')
                    : false;

                  const isOpen =
                    hasChildren && !collapsed
                      ? openMenus[section.key] ?? parentActive
                      : false;

                  if (!hasChildren && section.path) {
                    return (
                      <Link
                        key={section.key}
                        href={section.path}
                        className={`flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          parentActive
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        } ${collapsed ? 'justify-center' : 'gap-3'}`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            parentActive ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        >
                          {section.icon}
                        </span>
                        {!collapsed && <span>{section.name}</span>}
                      </Link>
                    );
                  }

                  return (
                    <div key={section.key} className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => toggleSection(section.key)}
                        className={`flex w-full items-center px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                          parentActive
                            ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
                        } ${collapsed ? 'justify-center' : 'gap-3'}`}
                      >
                        <span
                          className={`material-symbols-outlined text-[20px] ${
                            parentActive ? 'text-blue-600' : 'text-gray-400'
                          }`}
                        >
                          {section.icon}
                        </span>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">{section.name}</span>
                            <span className="material-symbols-outlined text-[18px] text-gray-400">
                              {isOpen ? 'expand_less' : 'expand_more'}
                            </span>
                          </>
                        )}
                      </button>

                      {!collapsed && section.children && (
                        <div
                          className={`ml-9 overflow-hidden transition-all duration-200 ease-out ${
                            isOpen ? 'max-h-56 opacity-100 mt-1' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="flex flex-col gap-0.5">
                            {section.children.map((child) => {
                              const childActive = pathname === child.path;

                              return (
                                <Link
                                  key={child.path}
                                  href={child.path}
                                  className={`text-xs rounded-lg px-2 py-1.5 transition-colors ${
                                    childActive
                                      ? 'bg-blue-50 text-blue-700 font-semibold'
                                      : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                  }`}
                                >
                                  {child.label}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </nav>
        </aside>

        <main className="flex-1 px-1 sm:px-2 lg:px-4 pt-2">
          <div className="max-w-[1280px] mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}