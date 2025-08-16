'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function useNavigationLoading() {
  const [loadingPath, setLoadingPath] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    // Clear loading when pathname changes (navigation complete)
    if (loadingPath && pathname === loadingPath) {
      setLoadingPath(null);
      setIsNavigating(false);
    }
  }, [pathname, loadingPath]);

  const handleNavigation = (href) => {
    // Don't show loading if already on the same page
    if (pathname === href) return;
    
    setLoadingPath(href);
    setIsNavigating(true);
    
    // Fallback timeout to clear loading state
    const timer = setTimeout(() => {
      setLoadingPath(null);
      setIsNavigating(false);
    }, 5000); // 5 second fallback
    
    // Cleanup timer when component unmounts or navigation completes
    return () => clearTimeout(timer);
  };

  const isLinkLoading = (href) => loadingPath === href;

  return {
    loadingPath,
    isNavigating,
    handleNavigation,
    isLinkLoading
  };
}
