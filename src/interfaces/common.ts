import type { ReactNode } from 'react';

export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: number;
};

export interface ProtectedLayoutProps {
  children: ReactNode;
}


