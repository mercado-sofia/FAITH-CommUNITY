import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Custom hook for form persistence in the apply section
 * - Saves form data on page refresh within apply section
 * - Persists data when navigating to other pages (selected program preview)
 * - Only clears data on page refresh, not on navigation
 */
export function useApplyFormPersistence(key, initialData) {
  const [formData, setFormData] = useState(initialData);
  const pathname = usePathname();
  const isApplySection = pathname.startsWith('/apply');
  const isInitialLoad = useRef(true);

  // Check if this is a page refresh (not navigation)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if this is a page refresh by looking at performance navigation type
      const isPageRefresh = performance.navigation?.type === 1 || 
                           (window.performance && window.performance.getEntriesByType('navigation')[0]?.type === 'reload');
      
      if (isPageRefresh && isApplySection) {
        // This is a page refresh within apply section, load saved data
        try {
          const savedData = localStorage.getItem(key);
          if (savedData) {
            const parsedData = JSON.parse(savedData);
            setFormData(parsedData);
            console.log('Form data restored from page refresh:', parsedData);
          }
        } catch (error) {
          console.error('Error loading saved form data:', error);
          localStorage.removeItem(key);
        }
      } else if (!isPageRefresh && isInitialLoad.current) {
        // This is initial navigation to apply section, clear any existing data
        localStorage.removeItem(key);
        console.log('Form data cleared on initial navigation to apply section');
      }
      
      isInitialLoad.current = false;
    }
  }, [key, isApplySection]);

  // Save form data to localStorage when it changes (only if in apply section)
  useEffect(() => {
    if (typeof window !== 'undefined' && isApplySection && !isInitialLoad.current && formData) {
      try {
        // Only save if form has meaningful data
        const hasData = Object.values(formData).some(value => 
          value !== null && value !== undefined && value !== '' && 
          (typeof value !== 'object' || Object.keys(value).length > 0)
        );
        
        if (hasData) {
          localStorage.setItem(key, JSON.stringify(formData));
          console.log('Form data saved:', formData);
        }
      } catch (error) {
        console.error('Error saving form data:', error);
      }
    }
  }, [formData, key, isApplySection]);

  // Note: Removed navigation-based clearing logic to allow selected program 
  // to persist when navigating to other pages. Data will only be cleared on page refresh.
  // This ensures the selected program preview doesn't reset when user navigates away.

  // Clear form data function
  const clearFormData = () => {
    setFormData(initialData);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key);
      console.log('Form data manually cleared');
    }
  };

  return [formData, setFormData, clearFormData];
}
