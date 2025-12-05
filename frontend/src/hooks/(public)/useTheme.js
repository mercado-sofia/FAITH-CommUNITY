'use client';

import { useState, useEffect, useRef } from 'react';

/**
 * Determine theme based on initial view and filtered highlights
 * @param {boolean} isInitialView - Whether in initial view (no org selected)
 * @param {number} filteredHighlightsCount - Number of filtered highlights
 * @returns {string} Theme name ('morning' or 'rainy')
 */
function getTheme(isInitialView, filteredHighlightsCount) {
  // During initial view (no org selected), keep theme as 'morning' for white background
  if (isInitialView) {
    return 'morning';
  }
  
  // After org is selected, set theme based on highlights
  // 'morning' when there are highlights, 'rainy' when there are no highlights
  return filteredHighlightsCount > 0 ? 'morning' : 'rainy';
}

/**
 * Custom hook for theme management
 * @param {boolean} isInitialView - Whether in initial view
 * @param {number} filteredHighlightsCount - Number of filtered highlights
 * @param {function} onThemeChange - Callback when theme changes (for loading state)
 * @returns {string} Current theme
 */
export function useTheme(isInitialView, filteredHighlightsCount, onThemeChange = null) {
  const [theme, setTheme] = useState('morning');
  const onThemeChangeRef = useRef(onThemeChange);

  // Keep ref updated
  useEffect(() => {
    onThemeChangeRef.current = onThemeChange;
  }, [onThemeChange]);

  // Automatically set theme based on filtered highlights
  useEffect(() => {
    const newTheme = getTheme(isInitialView, filteredHighlightsCount);
    
    // Only update if theme is actually changing
    if (newTheme !== theme) {
      // When theme changes, notify parent to reset loading state
      if (onThemeChangeRef.current) {
        onThemeChangeRef.current(newTheme, theme);
      }
      setTheme(newTheme);
    }
  }, [filteredHighlightsCount, theme, isInitialView]);

  return theme;
}
