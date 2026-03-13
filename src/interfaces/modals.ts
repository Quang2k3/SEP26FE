export interface ZoneData {
  id?: number;
  code: string;
  name: string;
  type: string;
  description?: string;
  isActive: boolean;
}

export interface ZoneFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialData?: ZoneData | null;
  onClose: () => void;
  onSubmit: (data: ZoneData) => void;
}

export interface BinFormData {
  code: string;
  zoneId: string;
  capacity: string;
  length: string;
  width: string;
  height: string;
}

export interface CreateBinModalProps {
  isOpen: boolean;
  zones: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: BinFormData) => void;
}

export interface BinStats {
  occupancy: number;
  occupancyTrend: string;
  skuCount: number;
  lastPicking: string;
}

export interface EditBinData {
  code: string;
  status: 'Active' | 'Inactive' | 'Maintenance';
  zoneId: string;
  type: 'Standard Rack' | 'Floor Location' | 'Pallet Position';
  maxWeight: string;
  maxVolume: string;
  stackLimit: string;
  length: string;
  width: string;
  height: string;
  stats: BinStats;
}

export interface EditBinModalProps {
  isOpen: boolean;
  initialData: EditBinData;
  zones: { id: string; name: string }[];
  onClose: () => void;
  onSubmit: (data: EditBinData) => void;
}

export interface OutboundFormData {
  binCode: string;
  shipmentCode: string;
  customer: string;
  expectedDate: string;
  quantity: string;
  notes: string;
}

export interface CreateOutboundModalProps {
  isOpen: boolean;
  binCode?: string;
  onClose: () => void;
  onSubmit: (data: OutboundFormData) => void;
}

export interface EditOutboundModalProps {
  isOpen: boolean;
  initialData: OutboundFormData;
  onClose: () => void;
  onSubmit: (data: OutboundFormData) => void;
}

export interface CategorySummary {
  code: string;
  name: string;
  status: string;
  color: string;
}

export interface CreateCategoryModalProps {
  onClose: () => void;
}

export interface EditCategoryModalProps {
  onClose: () => void;
  categoryData: CategorySummary;
}

export interface CategoryDetailModalProps {
  onClose: () => void;
  categoryData: CategorySummary;
}

