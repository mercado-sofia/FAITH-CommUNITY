import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentAdmin } from '../rtk/superadmin/adminSlice';
import { useAdminVolunteers, useAdminPrograms } from './useAdminData';

/**
 * Custom hook for managing loading states with intersection observer
 */
export const useOptimizedLoading = (isLoading, containerRef) => {
  const [shouldShowLoader, setShouldShowLoader] = useState(true);

  useEffect(() => {
    if (!containerRef.current || isLoading) {
      setShouldShowLoader(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldShowLoader(false);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
  }, [isLoading, containerRef]);
};

/**
 * Hook to manage dashboard loading state and signal when ready
 */
export const useDashboardLoadingState = () => {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const [isDashboardReady, setIsDashboardReady] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Fetch all required data
  const { 
    volunteers: volunteersData = [], 
    isLoading: volunteersLoading,
    error: volunteersError
  } = useAdminVolunteers(currentAdmin?.id);

  const { 
    programs: programsData = [], 
    isLoading: programsLoading,
    error: programsError
  } = useAdminPrograms(currentAdmin?.org);

  // Calculate loading progress
  useEffect(() => {
    const totalDataSources = 2; // volunteers and programs
    let loadedSources = 0;

    if (!volunteersLoading) loadedSources++;
    if (!programsLoading) loadedSources++;

    const progress = (loadedSources / totalDataSources) * 100;
    setLoadingProgress(progress);
  }, [volunteersLoading, programsLoading]);

  // Check if dashboard is ready
  useEffect(() => {
    if (!volunteersLoading && !programsLoading && currentAdmin && loadingProgress === 100) {
      // Add a small delay to ensure smooth transition
      const timer = setTimeout(() => {
        setIsDashboardReady(true);
        // Signal to parent components that dashboard is ready
        window.dispatchEvent(new CustomEvent('dashboardReady'));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [volunteersLoading, programsLoading, currentAdmin, loadingProgress]);

  return {
    isDashboardReady,
    loadingProgress,
    isLoading: !isDashboardReady,
    volunteersLoading,
    programsLoading,
    hasErrors: volunteersError || programsError
  };
};
