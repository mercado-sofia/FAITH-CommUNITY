'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const NavigationContext = createContext();

export function NavigationProvider({ children }) {
  const [loadingPath, setLoadingPath] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [pageLoadingStates, setPageLoadingStates] = useState({});
  const pathname = usePathname();

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

  const setPageLoading = (pagePath, isLoading) => {
    setPageLoadingStates(prev => ({
      ...prev,
      [pagePath]: isLoading
    }));
  };

  const isPageLoading = (pagePath) => pageLoadingStates[pagePath] || false;

  const value = {
    loadingPath,
    isNavigating,
    handleNavigation,
    isLinkLoading,
    setPageLoading,
    isPageLoading
  };

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
