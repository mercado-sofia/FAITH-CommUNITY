import { useCallback } from 'react';

/**
 * Custom hook to preserve scroll position during state updates
 * This prevents the page from jumping when forms are submitted or modals are closed
 */
export const useScrollPosition = () => {
  const preserveScrollPosition = useCallback((callback) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      callback();
      return;
    }

    // Save current scroll position
    const currentScrollY = window.scrollY;
    
    // Execute the callback
    callback();
    
    // Restore scroll position after the next tick
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        window.scrollTo(0, currentScrollY);
      }
    }, 0);
  }, []);

  const preserveScrollPositionAsync = useCallback(async (asyncCallback) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      await asyncCallback();
      return;
    }

    // Save current scroll position
    const currentScrollY = window.scrollY;
    
    try {
      // Execute the async callback
      await asyncCallback();
    } finally {
      // Restore scroll position after the next tick
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          window.scrollTo(0, currentScrollY);
        }
      }, 0);
    }
  }, []);

  return {
    preserveScrollPosition,
    preserveScrollPositionAsync
  };
};

export default useScrollPosition;
