export interface NavAction {
  label: string;
  path: string;
}

export const CATEGORY_ACTIONS: NavAction[] = [
  { label: 'Category List', path: '/category' }, 
  { label: 'Create Category', path: '/category?action=create' },
  // Đã xóa Edit và Detail ở đây
  { label: 'Category Tree View', path: '/category/tree' }, 
  { label: 'Category to Zone', path: '/category/to-zone' }, 
  { label: 'Assign Category to SKU', path: '/category/assign-sku' }, 
];

// Làm tương tự cho ZONE và BIN để sau này chuẩn luôn
export const ZONE_ACTIONS: NavAction[] = [
  { label: 'Zone List', path: '/zone' },
  { label: 'Create Zone', path: '/zone?action=create' },
];

export const BIN_ACTIONS: NavAction[] = [
  { label: 'Bin List', path: '/bin' },
  { label: 'Create Bin', path: '/bin?action=create' },
  { label: 'Bin Occupancy', path: '/bin/occupancy' },
  { label: 'Configure Capacity', path: '/bin/configure' },
];