export interface NavAction {
  label: string;
  path: string;
}

export const CATEGORY_ACTIONS: NavAction[] = [
  { label: 'Create Category', path: '/category/create' },
  { label: 'Edit Category', path: '/category/edit' },
  { label: 'Category Detail', path: '/category/detail' },
  { label: 'Category Tree View', path: '/category/tree' },
  { label: 'Category to Zone', path: '/category/to-zone' },
  { label: 'Assign Category to SKU', path: '/category/assign-sku' },
];

export const ZONE_ACTIONS: NavAction[] = [
  { label: 'Create Zone', path: '/zone/create' },
  { label: 'Edit Zone', path: '/zone/edit' },
  { label: 'Zone Detail', path: '/zone/detail' },
];

export const BIN_ACTIONS: NavAction[] = [
  { label: 'Create Bin', path: '/bin/create' },
  { label: 'Edit Bin', path: '/bin/edit' },
  { label: 'Bin Detail', path: '/bin/detail' },
  { label: 'Bin Occupancy Overview', path: '/bin/occupancy' },
  { label: 'Search Empty Bin', path: '/bin/search-empty' },
  { label: 'Configure Bin Capacity', path: '/bin/configure' },
];