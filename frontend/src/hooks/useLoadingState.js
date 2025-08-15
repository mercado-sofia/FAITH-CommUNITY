import { useState, useEffect } from 'react';

/**
 * Custom hook for managing loading states with minimum display time
 * @param {number} minDisplayTime - Minimum time in ms to show loading state (default: 500ms)
 * @returns {object} - { isLoading, startLoading, stopLoading }
 */
export const useLoadingState = (minDisplayTime = 500) => {
  const [isLoading, setIsLoading] = useState(false);
  const [startTime, setStartTime] = useState(null);

  const startLoading = () => {
    setIsLoading(true);
    setStartTime(Date.now());
  };

  const stopLoading = () => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);

    if (remaining > 0) {
      setTimeout(() => {
        setIsLoading(false);
      }, remaining);
    } else {
      setIsLoading(false);
    }
  };

  return { isLoading, startLoading, stopLoading };
};

/**
 * Hook for managing multiple loading states simultaneously
 * @param {string[]} keys - Array of loading state keys
 * @param {number} minDisplayTime - Minimum display time for each state
 * @returns {object} - { loadingStates, startLoading, stopLoading, isAnyLoading }
 */
export const useMultiLoadingState = (keys = [], minDisplayTime = 500) => {
  const [loadingStates, setLoadingStates] = useState({});
  const [startTimes, setStartTimes] = useState({});

  const startLoading = (key) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
    setStartTimes(prev => ({ ...prev, [key]: Date.now() }));
  };

  const stopLoading = (key) => {
    const startTime = startTimes[key];
    if (startTime) {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, minDisplayTime - elapsed);

      if (remaining > 0) {
        setTimeout(() => {
          setLoadingStates(prev => ({ ...prev, [key]: false }));
        }, remaining);
      } else {
        setLoadingStates(prev => ({ ...prev, [key]: false }));
      }
    }
  };

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  return { loadingStates, startLoading, stopLoading, isAnyLoading };
};

/**
 * Hook to prevent layout shifts during loading
 * @param {boolean} isLoading - Current loading state
 * @param {React.RefObject} containerRef - Reference to the container element
 * @returns {void}
 */
export const usePreventLayoutShift = (isLoading, containerRef) => {
  useEffect(() => {
    if (containerRef.current && isLoading) {
      const container = containerRef.current;
      const originalHeight = container.style.height;
      const currentHeight = container.offsetHeight;
      
      // Set minimum height to prevent collapse
      if (currentHeight > 0) {
        container.style.minHeight = `${currentHeight}px`;
      }

      return () => {
        container.style.minHeight = originalHeight;
      };
    }
  }, [isLoading, containerRef]);
};
