export interface StatsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  showProgress?: boolean;
  progressValue?: number;
  hasAlert?: boolean;
  href?: string;
}

export interface Task {
  id: number;
  type: 'PICK' | 'PUTAWAY' | 'CYCLE_COUNT' | 'TRANSFER';
  code: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  zone: string;
  createdAt: string;
  slaMinutes: number;
}

export interface OutboundDetailPageProps {
  params: {
    id: string;
  };
}


