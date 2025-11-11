import { useEffect } from 'react';

export const useModalScrollLock = (isOpen) => {
  useEffect(() => {
    // Check for window and document to avoid SSR errors
    if (!isOpen || typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
      return;
    }

    // Store current scroll position
    const scrollY = window.scrollY;
    
    // Lock body scroll and maintain position
    document.body.style.position = 'fixed';
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore body scroll and position
      if (typeof document !== 'undefined' && document.body) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.overflow = '';
        
        // Restore scroll position
        if (typeof window !== 'undefined') {
          window.scrollTo(0, scrollY);
        }
      }
    };
  }, [isOpen]);
};
