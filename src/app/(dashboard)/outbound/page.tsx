import { Suspense } from 'react';
import OutboundList from '@/components/outbound/OutboundList';

export default function OutboundPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    }>
      <OutboundList />
    </Suspense>
  );
}
