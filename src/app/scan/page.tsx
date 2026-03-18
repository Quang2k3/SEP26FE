import { Suspense } from 'react';
import ScannerPage from './ScannerPage';

export default function ScanPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ScannerPage />
    </Suspense>
  );
}
