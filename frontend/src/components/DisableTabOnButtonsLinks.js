'use client';

import { useEffect } from 'react';

export default function DisableTabOnButtonsLinks() {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Tab') {
        const activeEl = document.activeElement;
        if (
          activeEl.tagName !== 'INPUT' &&
          activeEl.tagName !== 'SELECT' &&
          activeEl.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return null;
}