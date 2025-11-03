'use client';

import { useEffect } from 'react';

export default function DisableTabOnButtonsLinks() {
  useEffect(() => {
    // Check for window and document to avoid SSR errors
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const activeEl = document.activeElement;
        if (
          activeEl &&
          activeEl.tagName !== 'INPUT' &&
          activeEl.tagName !== 'SELECT' &&
          activeEl.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keydown', handleKeyDown);
      }
    };
  }, []);

  return null;
}