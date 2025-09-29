import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Custom hook for managing URL parameters for news page
 * @returns {object} URL state and handlers
 */
export const useNewsURL = () => {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL parameters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [sortBy, setSortBy] = useState(() => {
    const sortParam = searchParams.get('sort');
    return sortParam || 'newest';
  });
  const [showCount, setShowCount] = useState(parseInt(searchParams.get('show')) || 10);

  // Function to update URL parameters
  const updateURLParams = useCallback((newParams) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    
    Object.keys(newParams).forEach(key => {
      const value = newParams[key];
      // Only add to URL if it's not the default value
      if (value && value !== '' && 
          !((key === 'sort' && value.toLowerCase() === 'newest') ||
            (key === 'show' && value === '10'))) {
        current.set(key, value);
      } else {
        current.delete(key);
      }
    });

    const search = current.toString();
    const query = search ? `?${search}` : '';
    router.push(`/admin/news${query}`, { scroll: false });
  }, [router, searchParams]);

  // Custom setters that update URL
  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleSortChange = useCallback((value) => {
    setSortBy(value);
    updateURLParams({ sort: value.toLowerCase() });
  }, [updateURLParams]);

  const handleShowCountChange = useCallback((value) => {
    setShowCount(value);
    updateURLParams({ show: value.toString() });
  }, [updateURLParams]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSearchQuery('');
    setSortBy('newest');
    setShowCount(10);
    updateURLParams({ search: '', sort: 'newest', show: '10' });
  }, [updateURLParams]);

  // Get current URL state
  const getCurrentURLState = useCallback(() => {
    return {
      search: searchParams.get('search') || '',
      sort: searchParams.get('sort') || 'newest',
      show: parseInt(searchParams.get('show')) || 10
    };
  }, [searchParams]);

  return {
    // State
    searchQuery,
    sortBy,
    showCount,
    
    // Handlers
    handleSearchChange,
    handleSortChange,
    handleShowCountChange,
    
    // Utilities
    updateURLParams,
    resetToDefaults,
    getCurrentURLState,
    
    // Direct setters (for programmatic updates)
    setSearchQuery,
    setSortBy,
    setShowCount
  };
};
