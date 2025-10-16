import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { filterAndSortPrograms, filterAndSortCollaborations } from '../../utils/programUtils';
import { getEffectiveStatus } from '@/utils/collaborationStatusUtils';

export const useProgramFilters = (programs, collaborations) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Filter and search states
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'Active');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'newest');
  
  // Collaboration-specific filter state
  const [collaborationStatusFilter, setCollaborationStatusFilter] = useState(searchParams.get('collaborationStatus') || 'all');

  // Sync URL parameters with state when URL changes
  useEffect(() => {
    const urlStatus = searchParams.get('status');
    const urlSearch = searchParams.get('search');
    const urlSort = searchParams.get('sort');
    const urlCollaborationStatus = searchParams.get('collaborationStatus');

    if (urlStatus) {
      setStatusFilter(urlStatus);
    }
    if (urlSearch !== null) {
      setSearchQuery(urlSearch);
    }
    if (urlSort) {
      setSortBy(urlSort);
    }
    if (urlCollaborationStatus) {
      setCollaborationStatusFilter(urlCollaborationStatus);
    }
  }, [searchParams]);

  // Update URL parameters
  const updateURLParams = useCallback((params) => {
    const newSearchParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && !(key === 'sort' && value === 'newest') && !(key === 'status' && value === 'Active') && !(key === 'collaborationStatus' && value === 'all')) {
        newSearchParams.set(key, value);
      } else {
        newSearchParams.delete(key);
      }
    });
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  }, [searchParams, router]);

  // Filter and sort programs
  const filteredAndSortedPrograms = useCallback(() => {
    return filterAndSortPrograms(programs, searchQuery, statusFilter, sortBy, collaborations);
  }, [programs, searchQuery, statusFilter, sortBy, collaborations]);

  // Filter and sort collaborations
  const filteredAndSortedCollaborations = useCallback(() => {
    return filterAndSortCollaborations(collaborations, searchQuery, collaborationStatusFilter, sortBy, getEffectiveStatus);
  }, [collaborations, searchQuery, collaborationStatusFilter, sortBy]);

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
    updateURLParams({ search: value });
  }, [updateURLParams]);

  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        updateURLParams({ status: value });
        break;
      case 'sort':
        setSortBy(value);
        updateURLParams({ sort: value });
        break;
    }
  }, [updateURLParams]);

  const handleCollaborationStatusChange = useCallback((value) => {
    setCollaborationStatusFilter(value);
    updateURLParams({ collaborationStatus: value });
  }, [updateURLParams]);

  return {
    // State
    searchQuery,
    statusFilter,
    sortBy,
    collaborationStatusFilter,
    
    // Setters
    setSearchQuery,
    setStatusFilter,
    setSortBy,
    setCollaborationStatusFilter,
    
    // Computed values
    filteredAndSortedPrograms,
    filteredAndSortedCollaborations,
    
    // Handlers
    handleSearchChange,
    handleFilterChange,
    handleCollaborationStatusChange,
    updateURLParams
  };
};
