'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SIDEBAR_SECTIONS, type RoleCode } from '@/config/navigation';
import { getStoredSession, clearAuthToken } from '@/services/authService';
import { useConfirm } from '@/components/ui/ModalProvider';
import NotificationBell from './NotificationBell';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
const API_ORIGIN = API_BASE.replace(/\/v1\/?$/, '');

function resolveAvatarUrl(url?: string | null) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${API_ORIGIN}${url}`;
}
function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem('auth_user') ?? '{}'); } catch { return null; }
}

const ROLE_CONFIG: Record<string, { label: string; badge: string }> = {
  MANAGER: { label: 'Manager',      badge: 'bg-violet-100 text-violet-600' },
  KEEPER:  { label: 'Keeper',       badge: 'bg-emerald-100 text-emerald-600' },
  QC:      { label: 'Quality Ctrl', badge: 'bg-amber-100 text-amber-600' },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [collapsed,  setCollapsed]  = useState(false);
  const [openMenus,  setOpenMenus]  = useState<Record<string, boolean>>({});
  const [userRoles,  setUserRoles]  = useState<RoleCode[]>([]);
  const [userName,   setUserName]   = useState('');
  const [userEmail,  setUserEmail]  = useState('');
  const [avatarUrl,  setAvatarUrl]  = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      const session = getStoredSession();
      if (session?.user?.roleCodes) setUserRoles(session.user.roleCodes as RoleCode[]);
      const u = getStoredUser();
      if (u) {
        setUserName(u.fullName ?? u.email ?? '');
        setUserEmail(u.email ?? '');
        setAvatarUrl(resolveAvatarUrl(u.avatarUrl));
      }
    };
    load();
    window.addEventListener('profile-updated', load);
    return () => window.removeEventListener('profile-updated', load);
  }, []);

  const visibleSections = SIDEBAR_SECTIONS.filter(s => s.roles.some(r => userRoles.includes(r)));
  const toggleSection   = (key: string) => setOpenMenus(p => ({ ...p, [key]: !p[key] }));
  const initials        = userName.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase() || '?';
  const confirm         = useConfirm();
  const primaryRole     = userRoles[0];

  const handleLogout = () => {
    confirm({
      title: 'Xác nhận đăng xuất',
      description: 'Bạn có chắc muốn đăng xuất khỏi hệ thống không?',
      variant: 'warning',
      icon: 'logout',
      confirmText: 'Đăng xuất',
      onConfirm: () => { clearAuthToken(); router.push('/login'); },
    });
  };
  const roleConf        = primaryRole ? ROLE_CONFIG[primaryRole] : null;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f6fa' }}>

      {/* ════════ TOP HEADER ════════ */}
      <header className="h-14 bg-white border-b border-gray-200/80 sticky top-0 z-50 flex items-center px-5 gap-4"
        style={{ boxShadow: '0 1px 3px 0 rgba(0,0,0,.06)' }}>

        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2.5 group flex-shrink-0 mr-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)' }}>
            <span className="material-symbols-outlined text-[20px]">warehouse</span>
          </div>
          {!collapsed && (
            <span className="text-[16px] font-extrabold tracking-tight text-gray-900 hidden md:block">WMS Portal</span>
          )}
        </Link>

        <div className="flex-1" />

        {/* Notification */}
        <NotificationBell />

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* User pill */}
        <Link href="/profile"
          className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-200 group">
          <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white"
            style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
            {avatarUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
              : <span className="text-white text-[11px] font-bold">{initials}</span>}
          </div>
          <div className="hidden sm:block leading-tight">
            <p className="text-xs font-semibold text-gray-800 truncate max-w-[110px] leading-snug">{userName || '—'}</p>
            {roleConf && <p className="text-[10px] text-gray-400 leading-snug">{roleConf.label}</p>}
          </div>
          <span className="material-symbols-outlined text-[14px] text-gray-300 group-hover:text-gray-500 transition-colors hidden sm:block">open_in_new</span>
        </Link>

        {/* Logout */}
        <button onClick={handleLogout}
          title="Đăng xuất"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100">
          <span className="material-symbols-outlined text-[18px]">logout</span>
        </button>
      </header>

      {/* ════════ BODY ════════ */}
      <div className="flex flex-1 min-h-0">

        {/* ════════ SIDEBAR ════════ */}
        <aside className={`hidden md:flex flex-col flex-shrink-0 sticky top-14 self-start h-[calc(100vh-3.5rem)]
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-[60px]' : 'w-[220px]'}`}
          style={{
            background: 'linear-gradient(180deg, #1e2d4e 0%, #1a253f 100%)',
            boxShadow: '2px 0 12px 0 rgba(0,0,0,.08)',
          }}>

          {/* Collapse toggle */}
          <div className={`flex ${collapsed ? 'justify-center' : 'justify-end'} px-2.5 pt-3 pb-1`}>
            <button onClick={() => setCollapsed(v => !v)}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/15 transition-all">
              <span className="material-symbols-outlined text-[15px]">
                {collapsed ? 'chevron_right' : 'chevron_left'}
              </span>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-2.5 py-1.5 space-y-0.5 overflow-y-auto overflow-x-hidden
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/10">
            {visibleSections.map(section => {
              const hasChildren = !!section.children?.length;
              const parentActive = hasChildren
                ? section.children!.some(c => pathname === c.path || pathname.startsWith(c.path + '/'))
                : section.path ? pathname === section.path || pathname.startsWith(section.path + '/') : false;
              const isOpen = hasChildren && !collapsed ? (openMenus[section.key] ?? parentActive) : false;

              const itemBase = `flex items-center gap-3 px-2.5 py-2 rounded-xl text-[13px] font-medium transition-all duration-150 w-full group`;
              const itemActive = 'bg-white/15 text-white shadow-sm';
              const itemInactive = 'text-slate-300 hover:text-white hover:bg-white/10';

              /* Leaf */
              if (!hasChildren && section.path) {
                return (
                  <Link key={section.key} href={section.path}
                    title={collapsed ? section.name : undefined}
                    className={`${itemBase} ${parentActive ? itemActive : itemInactive} ${collapsed ? 'justify-center px-0' : ''}`}>
                    <span className={`material-symbols-outlined text-[18px] flex-shrink-0 transition-colors
                      ${parentActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'}`}>
                      {section.icon}
                    </span>
                    {!collapsed && <span className="truncate flex-1">{section.name}</span>}
                    {!collapsed && parentActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    )}
                  </Link>
                );
              }

              /* Parent */
              return (
                <div key={section.key}>
                  <button type="button"
                    onClick={() => { if (!collapsed) toggleSection(section.key); }}
                    title={collapsed ? section.name : undefined}
                    className={`${itemBase} ${parentActive ? itemActive : itemInactive} ${collapsed ? 'justify-center px-0' : ''}`}>
                    <span className={`material-symbols-outlined text-[18px] flex-shrink-0 transition-colors
                      ${parentActive ? 'text-blue-300' : 'text-slate-400 group-hover:text-white'}`}>
                      {section.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{section.name}</span>
                        <span className={`material-symbols-outlined text-[15px] flex-shrink-0 transition-transform duration-200
                          ${isOpen ? 'rotate-180' : ''} ${parentActive ? 'text-slate-300' : 'text-slate-600'}`}>
                          expand_more
                        </span>
                      </>
                    )}
                  </button>

                  {/* Sub-items */}
                  {!collapsed && section.children && (
                    <div className={`overflow-hidden transition-all duration-200 ease-out
                      ${isOpen ? 'max-h-64 opacity-100' : 'max-h-0 opacity-0'}`}>
                      <div className="mt-0.5 ml-4 pl-3 border-l border-white/10 space-y-0.5 py-0.5">
                        {section.children.map(child => {
                          const active = pathname === child.path || pathname.startsWith(child.path + '/');
                          return (
                            <Link key={child.path} href={child.path}
                              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150
                                ${active
                                  ? 'bg-blue-500/25 text-blue-200'
                                  : 'text-slate-300 hover:text-white hover:bg-white/10'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors
                                ${active ? 'bg-blue-400' : 'bg-slate-500'}`} />
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
          </nav>

          {/* Bottom user info */}
          {!collapsed && (
            <div className="mx-2.5 mb-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-white/20"
                  style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1)' }}>
                  {avatarUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={avatarUrl} alt={userName} className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold">{initials}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-semibold text-white truncate leading-tight">{userName || '—'}</p>
                  <p className="text-[10px] text-slate-300 truncate leading-tight">{userEmail}</p>
                </div>
              </div>
              {userRoles.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {userRoles.map(role => {
                    const rc = ROLE_CONFIG[role];
                    return (
                      <span key={role}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white/15 text-slate-200">
                        {rc?.label ?? role}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>

        {/* ════════ MAIN CONTENT ════════ */}
        <main className="flex-1 min-w-0 p-4 md:p-5 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
