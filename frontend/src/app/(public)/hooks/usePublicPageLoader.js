'use client';

import { useState, useEffect, useRef } from 'react';
import { getPageLoaderState, markPageAsVisited } from '../utils/pageLoaderState';

/**
 * Custom hook for managing page loading states within the (public) portal
 * Provides consistent loading behavior across all public pages
 * 
 * @param {string} pageName - The name of the page (e.g., 'home', 'about', 'profile')
 * @param {Object} options - Configuration options
 * @param {number} options.initialDelay - Initial loading delay in ms (default: 500)
 * @param {number} options.firstVisitExtraDelay - Extra delay for first visits in ms (default: 1000)
 * @returns {Object} - Object containing loading states and utilities
 */
export const usePublicPageLoader = (pageName, options = {}) => {
  const {
    initialDelay = 500,
    firstVisitExtraDelay = 1000
  } = options;

  // Get initial state for this page
  const initialState = getPageLoaderState(pageName);
  
  const [loading, setLoading] = useState(!initialState.hasVisited); // Show loading for first visits
  const [pageReady, setPageReady] = useState(initialState.hasVisited); // Show content immediately for returning visits
  const timerRef = useRef(null);
  const pageReadyTimerRef = useRef(null);

  // Handle initial loading state
  useEffect(() => {
    if (!initialState.hasVisited && typeof window !== 'undefined') {
      // Mark page as visited immediately to prevent multiple instances
      markPageAsVisited(pageName);
      
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, initialDelay);
    } else {
      // If already visited, set loading to false immediately
      setLoading(false);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [pageName, initialDelay, initialState.hasVisited]);

  // Add extra delay for first visits after initial loading
  useEffect(() => {
    if (!loading) {
      const extraDelay = initialState.isFirstVisit ? firstVisitExtraDelay : 0;
      
      if (extraDelay > 0) {
        pageReadyTimerRef.current = setTimeout(() => {
          setPageReady(true);
        }, extraDelay);
      } else {
        // If no extra delay needed, set pageReady immediately
        setPageReady(true);
      }
    }

    return () => {
      if (pageReadyTimerRef.current) {
        clearTimeout(pageReadyTimerRef.current);
      }
    };
  }, [loading, initialState.isFirstVisit, firstVisitExtraDelay]);

  return {
    loading,
    pageReady,
    isFirstVisit: initialState.isFirstVisit,
    hasVisited: initialState.hasVisited
  };
};
