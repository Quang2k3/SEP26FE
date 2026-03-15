'use client';

import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

export default function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [container] = useState<HTMLDivElement>(() => {
    if (typeof document === 'undefined') return null as any;
    return document.createElement('div');
  });

  useEffect(() => {
    if (!container) return;
    document.body.appendChild(container);
    setMounted(true);
    return () => {
      if (document.body.contains(container)) {
        document.body.removeChild(container);
      }
    };
  }, [container]);

  if (!mounted || !container) return null;
  return createPortal(children, container);
}
