'use client';

import { useEffect, useState } from 'react';
import { isPortalDemoActive } from '@/config/portalDemo';

export function usePortalDemoMode() {
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    setIsActive(isPortalDemoActive());
  }, []);

  return {
    isActive,
    isReadOnly: isActive,
  };
}
