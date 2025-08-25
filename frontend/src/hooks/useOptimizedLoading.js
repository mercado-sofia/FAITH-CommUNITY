import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

/**
 * Optimized loading hook for better perceived performance
 * Provides instant feedback and smart loading states
 */
export const useOptimizedLoading = (options = {}) => {
  const {
    minDisplayTime = 200, // Reduced from 500ms for faster perceived performance
    instantFeedback = true, // Show loading immediately (reserved for future use)
    cacheKey = null, // For caching loading states
  } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const timeoutRef = useRef(null);
  const cacheRef = useRef(new Map());

  // Memoize the cached data check to prevent infinite re-renders
  const hasCachedData = useMemo(() => {
    return cacheKey && cacheRef.current.has(cacheKey);
  }, [cacheKey]);

  const startLoading = useCallback(() => {
    // If we have cached data, show it immediately
    if (hasCachedData) return;

    setIsLoading(true);
    setStartTime(Date.now());
  }, [hasCachedData]);

  const stopLoading = useCallback(() => {
    if (!startTime) {
      setIsLoading(false);
      return;
    }

    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (remaining > 0) {
      timeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setStartTime(null);
      }, remaining);
    } else {
      setIsLoading(false);
      setStartTime(null);
    }
  }, [startTime, minDisplayTime]);

  // Cleanup on unmount — capture a snapshot of the ref
  useEffect(() => {
    const tRef = timeoutRef; // snapshot the ref object (not its .current value)
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  return {
    isLoading: isLoading || false,
    startLoading,
    stopLoading,
    hasCachedData,
  };
};

/**
 * Hook for managing multiple optimized loading states
 */
export const useMultiOptimizedLoading = (keys = [], options = {}) => {
  const { minDisplayTime = 200, instantFeedback = true } = options;

  const [loadingStates, setLoadingStates] = useState({});
  const [startTimes, setStartTimes] = useState({});
  const timeoutRefs = useRef({});

  const startLoading = useCallback((key) => {
    setLoadingStates((prev) => ({ ...prev, [key]: true }));
    setStartTimes((prev) => ({ ...prev, [key]: Date.now() }));
  }, []);

  const stopLoading = useCallback(
    (key) => {
      const startTime = startTimes[key];
      if (!startTime) {
        setLoadingStates((prev) => ({ ...prev, [key]: false }));
        return;
      }

      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      // Clear existing timeout
      if (timeoutRefs.current[key]) {
        clearTimeout(timeoutRefs.current[key]);
      }

      if (remaining > 0) {
        timeoutRefs.current[key] = setTimeout(() => {
          setLoadingStates((prev) => ({ ...prev, [key]: false }));
          setStartTimes((prev) => {
            const newTimes = { ...prev };
            delete newTimes[key];
            return newTimes;
          });
        }, remaining);
      } else {
        setLoadingStates((prev) => ({ ...prev, [key]: false }));
        setStartTimes((prev) => {
          const newTimes = { ...prev };
          delete newTimes[key];
          return newTimes;
        });
      }
    },
    [startTimes, minDisplayTime]
  );

  // Cleanup on unmount — snapshot the ref's current object
  useEffect(() => {
    const currentTimeouts = timeoutRefs.current; // snapshot the current object
    return () => {
      Object.values(currentTimeouts).forEach((timeout) => {
        if (timeout) clearTimeout(timeout);
      });
    };
  }, []);

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return {
    loadingStates,
    startLoading,
    stopLoading,
    isAnyLoading,
  };
};

/**
 * Hook for instant page transitions with skeleton loading
 */
export const useInstantPageTransition = (pageKey) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const transitionTimeoutRef = useRef(null);

  const startTransition = useCallback(() => {
    setIsTransitioning(true);
    setShowSkeleton(true);

    // Clear any pending hide timer to avoid flicker
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
  }, []);

  const completeTransition = useCallback(() => {
    setIsTransitioning(false);

    // Hide skeleton after a short delay to prevent flicker
    transitionTimeoutRef.current = setTimeout(() => {
      setShowSkeleton(false);
    }, 100);
  }, []);

  // Cleanup — capture a snapshot of the ref object
  useEffect(() => {
    const tRef = transitionTimeoutRef;
    return () => {
      if (tRef.current) clearTimeout(tRef.current);
    };
  }, []);

  return {
    isTransitioning,
    showSkeleton,
    startTransition,
    completeTransition,
  };
};