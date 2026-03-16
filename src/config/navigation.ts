import type { NavAction } from '@/interfaces/navigation';

// ── MANAGER ───────────────────────────────────────────────────────────────────

// Kho hàng: gộp Zone + Location (AISLE/RACK/BIN/STAGING) vào 1 section
// Zone là entry point → từ zone drill vào location bên trong
// Zone là entry point — Dãy/Kệ/BIN quản lý trong Zone Detail
export const WAREHOUSE_ACTIONS: NavAction[] = [
  { label: 'Danh sách Zone', path: '/zone' },
];

export const CATEGORY_ACTIONS: NavAction[] = [
  { label: 'Danh sách',     path: '/category' },
  { label: 'Gắn Zone',      path: '/category/to-zone' },
];

export const MANAGER_DASHBOARD: NavAction[] = [
  { label: 'Duyệt nhập kho',  path: '/manager-dashboard/grn' },
  { label: 'Sự cố',           path: '/manager-dashboard/incident' },
  { label: 'Báo cáo QC',      path: '/manager-dashboard/qc-report' },
];

// ── KEEPER ────────────────────────────────────────────────────────────────────

export const BIN_ACTIONS: NavAction[] = [
  { label: 'Sơ đồ kho',      path: '/bin/floor-plan' },
  { label: 'Bin Occupancy',   path: '/bin/occupancy' },
  { label: 'Tìm BIN trống',   path: '/bin/search' },
  { label: 'Cấu hình',        path: '/bin/configure',  roles: ['MANAGER'] },
];

export const INBOUND_ACTIONS: NavAction[] = [
  { label: 'Gate-Check / Nhập kho', path: '/inbound/gate-check' },
];

export const OUTBOUND_ACTIONS: NavAction[] = [
  { label: 'Danh sách xuất',  path: '/outbound' },
];

// ── Keep for SecondaryNav ─────────────────────────────────────────────────────
export const ZONE_ACTIONS: NavAction[] = [
  { label: 'Zone List', path: '/zone' },
];

export const LOCATION_ACTIONS: NavAction[] = [
  { label: 'Tổng quan',    path: '/location' },
  { label: 'Dãy (Aisle)', path: '/location/aisle' },
  { label: 'Kệ (Rack)',   path: '/location/rack' },
  { label: 'BIN',         path: '/location/bin' },
  { label: 'Staging',     path: '/location/staging' },
];

// ── Phân quyền sidebar theo role ──────────────────────────────────────────────
export type RoleCode = 'MANAGER' | 'KEEPER' | 'QC';

export interface SidebarSection {
  key: string;
  name: string;
  icon: string;
  path?: string;
  children?: NavAction[];
  roles: RoleCode[];
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  // ── Tất cả roles ─────────────────────────────
  {
    key: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'space_dashboard',
    roles: ['MANAGER', 'KEEPER', 'QC'],
  },

  // ── Manager ──────────────────────────────────
  {
    key: 'manager-dashboard',
    name: 'Quản lý nhập kho',
    icon: 'admin_panel_settings',
    children: MANAGER_DASHBOARD,
    roles: ['MANAGER'],
  },
  {
    key: 'outbound-manager',
    name: 'Xuất kho',
    icon: 'output_circle',
    children: OUTBOUND_ACTIONS,
    roles: ['MANAGER'],
  },
  {
    key: 'qc-inspections',
    name: 'Kiểm định QC',
    icon: 'verified',
    path: '/qc-inspections',
    roles: ['MANAGER', 'QC'],
  },
  {
    key: 'warehouse',
    name: 'Kho hàng',
    icon: 'warehouse',
    path: '/zone',
    roles: ['MANAGER'],
  },
  {
    key: 'bin-manager',
    name: 'Bin & Sơ đồ',
    icon: 'inventory_2',
    children: BIN_ACTIONS,
    roles: ['MANAGER'],
  },
  {
    key: 'category',
    name: 'Danh mục',
    icon: 'category',
    children: CATEGORY_ACTIONS,
    roles: ['MANAGER'],
  },
  {
    key: 'user-management',
    name: 'Người dùng',
    icon: 'person',
    path: '/user-management',
    roles: ['MANAGER'],
  },

  // ── Keeper ────────────────────────────────────
  {
    key: 'inbound',
    name: 'Nhập kho',
    icon: 'input_circle',
    children: INBOUND_ACTIONS,
    roles: ['KEEPER', 'QC'],
  },
  {
    key: 'tasks',
    name: 'Putaway',
    icon: 'shelves',
    path: '/tasks',
    roles: ['KEEPER'],
  },
  {
    key: 'bin',
    name: 'Kho & BIN',
    icon: 'inventory_2',
    children: BIN_ACTIONS,
    roles: ['KEEPER'],
  },
];