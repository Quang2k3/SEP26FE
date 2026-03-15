import type { NavAction } from '@/interfaces/navigation';

export const CATEGORY_ACTIONS: NavAction[] = [
  { label: 'Category List', path: '/category' },
  { label: 'Category Tree View', path: '/category/tree' },
  { label: 'Category to Zone', path: '/category/to-zone' },
  { label: 'Assign Category to SKU', path: '/category/assign-sku' },
];

export const ZONE_ACTIONS: NavAction[] = [
  { label: 'Zone List', path: '/zone' },
];

export const BIN_ACTIONS: NavAction[] = [
  { label: 'Sơ đồ kho',          path: '/bin/floor-plan' },
  { label: 'Bin Occupancy',       path: '/bin/occupancy' },
  { label: 'Tìm BIN trống',       path: '/bin/search' },
  { label: 'Bin List',            path: '/bin',            roles: ['MANAGER'] },
  { label: 'Configure Capacity',  path: '/bin/configure',  roles: ['MANAGER'] },
];

export const INBOUND_ACTIONS: NavAction[] = [
  { label: 'Gate-Check / Nhập kho', path: '/inbound/gate-check' },
];

export const OUTBOUND_ACTIONS: NavAction[] = [
  { label: 'Shipment List', path: '/outbound' },
];

export const MANAGER_DASHBOARD: NavAction[] = [
  { label: 'Duyệt đơn nhập kho', path: '/manager-dashboard/grn' },
  { label: 'Pending Incidents', path: '/manager-dashboard/incident' },
  { label: 'QC Reports', path: '/manager-dashboard/qc-report' },
];

export const USER_MANAGEMENT_ACTIONS: NavAction[] = [];

// ── Phân quyền sidebar theo role ──
export type RoleCode = 'MANAGER' | 'KEEPER' | 'QC';

export interface SidebarSection {
  key: string;
  name: string;
  icon: string;
  path?: string;
  children?: NavAction[];
  roles: RoleCode[]; // role nào được thấy menu này
}

export const SIDEBAR_SECTIONS: SidebarSection[] = [
  {
    key: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: 'space_dashboard',
    roles: ['MANAGER', 'KEEPER', 'QC'],
  },
  {
    key: 'inbound',
    name: 'Inbound',
    icon: 'input_circle',
    children: INBOUND_ACTIONS,
    roles: ['KEEPER', 'QC'],  // Manager dùng "Duyệt đơn nhập kho" thay thế
  },
  {
    key: 'outbound',
    name: 'Outbound',
    icon: 'output_circle',
    children: OUTBOUND_ACTIONS,
    roles: ['MANAGER', 'KEEPER'],
  },
  {
    key: 'qc-inspections',
    name: 'QC Inspections',
    icon: 'verified',
    path: '/qc-inspections',
    roles: ['MANAGER', 'QC'],
  },
  {
    key: 'tasks',
    name: 'Putaway',
    icon: 'shelves',
    path: '/tasks',
    roles: ['KEEPER'],      // Chỉ KEEPER thực hiện cất hàng
  },
  {
    key: 'bin',
    name: 'Bin',
    icon: 'inventory_2',
    children: BIN_ACTIONS,
    roles: ['MANAGER', 'KEEPER'],
  },
  {
    key: 'category',
    name: 'Category',
    icon: 'category',
    children: CATEGORY_ACTIONS,
    roles: ['MANAGER'],
  },
  {
    key: 'zone',
    name: 'Zone',
    icon: 'grid_view',
    children: ZONE_ACTIONS,
    roles: ['MANAGER'],
  },
  {
    key: 'location',
    name: 'Location Management',
    icon: 'location_on',
    path: '/location',
    roles: ['MANAGER'],
  },
  {
    key: 'user-management',
    name: 'User Management',
    icon: 'person',
    path: '/user-management',
    roles: ['MANAGER'],
  },
  {
    key: 'manager-dashboard',
    name: 'Manager Dashboard',
    icon: 'admin_panel_settings',
    children: MANAGER_DASHBOARD,
    roles: ['MANAGER'],
  },
];