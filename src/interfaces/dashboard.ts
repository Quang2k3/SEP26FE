export interface StatsCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: string;
  color?: 'blue' | 'violet' | 'amber' | 'emerald' | 'red';
  hasAlert?: boolean;
  showProgress?: boolean;
  progressValue?: number;
  href?: string;
}
