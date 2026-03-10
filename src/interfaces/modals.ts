export interface ZoneData {
  id?: number;
  code: string;
  name: string;
  description?: string;
}

export interface ZoneFormModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: ZoneData | null;
}

export interface EditBinData {
  id: number;
  code: string;
  description?: string;
  capacity: number;
}

export interface BinFormData {
  code: string;
  description?: string;
  capacity: number;
}

export interface CreateBinModalProps {
  open: boolean;
  onClose: () => void;
  zoneId: number;
  onCreated?: () => void;
}

export interface EditBinModalProps {
  open: boolean;
  onClose: () => void;
  initialData: EditBinData;
  onUpdated?: () => void;
}

export interface OutboundFormData {
  referenceCode: string;
  description?: string;
  scheduledAt: string;
}

export interface CreateOutboundModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export interface EditOutboundModalProps {
  open: boolean;
  onClose: () => void;
  outboundId: number;
  onUpdated?: () => void;
}

export interface CreateCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
  onUpdated?: () => void;
}

export interface CategoryDetailModalProps {
  open: boolean;
  onClose: () => void;
  categoryId: number;
}


