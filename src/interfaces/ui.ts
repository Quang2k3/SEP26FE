import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
  title?: string;
  description?: string;
  padded?: boolean;
  hoverable?: boolean;
  className?: string;
  children?: ReactNode;
}

export interface ChartSeries<T extends object> {
  dataKey: keyof T;
  name?: string;
  color?: string;
}

export interface ChartProps<T extends object> {
  type?: 'line' | 'bar';
  data: T[];
  dataKeyX: keyof T;
  series: ChartSeries<T>[];
  height?: number;
  showGrid?: boolean;
}

