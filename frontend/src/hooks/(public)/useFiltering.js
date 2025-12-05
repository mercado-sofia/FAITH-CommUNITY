'use client';

import { useState, useEffect, useMemo } from 'react';
import { filterHighlights, chunkHighlights, generateYears } from '@/utils/(public)/filtering';
import { CHUNK_SIZE, START_YEAR } from '@/app/(public)/faithree/constants';

/**
 * Custom hook for filtering and chunking highlights
 * @param {Array} featuredHighlights - All featured highlights
 * @returns {Object} Filter state and filtered/chunked data
 */
export function useFiltering(featuredHighlights = []) {
  const [selectedOrganization, setSelectedOrganization] = useState(null);
  const [selectedYear, setSelectedYear] = useState(null);
  const [showAllYears, setShowAllYears] = useState(false);

  // Generate all years from starting year to current year
  const uniqueYears = useMemo(() => {
    return generateYears(START_YEAR);
  }, []);

  // Auto-set to show all years when organization is first selected
  useEffect(() => {
    // Only auto-set if organization is selected and showAllYears hasn't been set yet
    // Default to showing all years initially
    if (selectedOrganization !== null && selectedYear === null && !showAllYears) {
      setShowAllYears(true);
      // Don't set selectedYear - year filter is optional
    }
  }, [selectedOrganization, selectedYear, showAllYears]);

  // Filter featured highlights based on selected organization and year
  // Organization is required - return empty array if no organization is selected
  const filteredHighlights = useMemo(() => {
    return filterHighlights(
      featuredHighlights,
      selectedOrganization,
      selectedYear,
      showAllYears
    );
  }, [featuredHighlights, selectedOrganization, selectedYear, showAllYears]);

  // Split filtered highlights into chunks of 12 (one tree per chunk)
  const highlightChunks = useMemo(() => {
    return chunkHighlights(filteredHighlights, CHUNK_SIZE);
  }, [filteredHighlights]);

  // Handle organization filter change
  const handleOrganizationChange = (orgId) => {
    setSelectedOrganization(orgId);
  };

  // Handle year filter change
  const handleYearChange = ({ year, showAllYears: newShowAllYears }) => {
    // If user unchecks "Show All Years" and no year is selected, auto-select current year
    if (!newShowAllYears && year === null && selectedYear === null) {
      const currentYear = new Date().getFullYear();
      setSelectedYear(currentYear);
      setShowAllYears(false);
    } else {
      setSelectedYear(year);
      setShowAllYears(newShowAllYears);
    }
  };

  return {
    // Filter state
    selectedOrganization,
    selectedYear,
    showAllYears,
    uniqueYears,
    // Filtered data
    filteredHighlights,
    highlightChunks,
    // Handlers
    handleOrganizationChange,
    handleYearChange,
  };
}
