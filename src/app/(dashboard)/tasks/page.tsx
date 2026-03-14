'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession } from '@/services/authService';
import PutawayPage from '@/components/putaway/PutawayPage';

export default function Page() {
  const router = useRouter();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    const session = getStoredSession();
    const roles = session?.user?.roleCodes ?? [];
    if (roles.includes('KEEPER')) {
      setAllowed(true);
    } else {
      setAllowed(false);
      router.replace('/dashboard');
    }
  }, [router]);

  if (allowed === null) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <span className="material-symbols-outlined animate-spin text-indigo-400 text-[36px]">
          progress_activity
        </span>
      </div>
    );
  }

  if (!allowed) return null;

  return <PutawayPage />;
}
