import type { NavAction } from '@/interfaces/navigation';

export const CATEGORY_ACTIONS: NavAction[] = [
  { label: 'Category List', path: '/category' }, 
  // Đã xóa Edit và Detail ở đây
  { label: 'Category Tree View', path: '/category/tree' }, 
  { label: 'Category to Zone', path: '/category/to-zone' }, 
  { label: 'Assign Category to SKU', path: '/category/assign-sku' }, 
];

// Làm tương tự cho ZONE và BIN để sau này chuẩn luôn
export const ZONE_ACTIONS: NavAction[] = [
  { label: 'Zone List', path: '/zone' },
];

export const BIN_ACTIONS: NavAction[] = [
  { label: 'Bin List', path: '/bin' },
  { label: 'Bin Occupancy', path: '/bin/occupancy' },
  { label: 'Configure Capacity', path: '/bin/configure' },
];

export const INBOUND_ACTIONS: NavAction[] = [
  { label: 'Receipt List', path: '/inbound' },
  { label: 'Gate-Check', path: '/inbound/gate-check' },
];

export const OUTBOUND_ACTIONS: NavAction[] = [
  { label: 'Shipment List', path: '/outbound' },
];

export const MANAGER_DASHBOARD: NavAction[] = [
  { label: 'Pending Incidents', path: '/manager-dashboard/incident' },
  { label: 'QC Reports', path: '/manager-dashboard/qc-report' },
];