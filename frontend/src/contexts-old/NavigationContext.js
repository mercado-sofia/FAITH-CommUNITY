'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

const NavigationContext = createContext();

// Track visited pages globally to avoid unnecessary loaders
const visitedPages = new Set();

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
      // Mark page as visited
      visitedPages.add(pathname);
    }
  }, [pathname, loadingPath]);

  const handleNavigation = (href) => {
    // Don't show loading if already on the same page
    if (pathname === href) return;
    
    // Don't show loading for previously visited pages (instant navigation)
    if (visitedPages.has(href)) {
      return; // Skip loading state for visited pages
    }
    
    setLoadingPath(href);
    setIsNavigating(true);
    
    // Fallback timeout to clear loading state
    const timer = setTimeout(() => {
      setLoadingPath(null);
      setIsNavigating(false);
    }, 3000); // Reduced from 5 seconds to 3 seconds
    
    // Cleanup timer when component unmounts or navigation completes
    return () => clearTimeout(timer);
  };

  const isLinkLoading = (href) => {
    // Don't show loading for visited pages
    if (visitedPages.has(href)) return false;
    return loadingPath === href;
  };

  const setPageLoading = (pagePath, isLoading) => {
    setPageLoadingStates(prev => ({
      ...prev,
      [pagePath]: isLoading
    }));
  };

  const isPageLoading = (pagePath) => {
    // Don't show loading for visited pages
    if (visitedPages.has(pagePath)) return false;
    return pageLoadingStates[pagePath] || false;
  };

  const value = {
    loadingPath,
    isNavigating,
    handleNavigation,
    isLinkLoading,
    setPageLoading,
    isPageLoading,
    visitedPages
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
