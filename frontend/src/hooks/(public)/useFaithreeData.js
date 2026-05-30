'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { API_TIMEOUT } from '@/app/(public)/faithree/constants';
import { fetchPublicWithFallback } from '@/utils/shared/fetchPublicWithFallback';

/**
 * Custom hook for fetching FAITHree data
 * Handles fetching organizations and featured highlights
 * @returns {Object} Data and loading states
 */
export function useFaithreeData() {
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [featuredHighlights, setFeaturedHighlights] = useState([]);

  useEffect(() => {
    const fetchAllOrganizations = async () => {
      try {
        if (typeof window === 'undefined') {
          setAllOrganizations([]);
          return;
        }

        const data = await fetchPublicWithFallback(`${API_BASE_URL || ''}/api/organizations`, {
          signal: AbortSignal.timeout(API_TIMEOUT),
        });

        const organizations = data?.success && Array.isArray(data.data) ? data.data : [];

        const sortedOrgs = organizations.sort((a, b) =>
          (a.acronym || '').localeCompare(b.acronym || '')
        );

        setAllOrganizations(sortedOrgs);
      } catch {
        setAllOrganizations([]);
      }
    };

    fetchAllOrganizations();
  }, []);

  useEffect(() => {
    const fetchFeaturedHighlights = async () => {
      try {
        if (typeof window === 'undefined') {
          setFeaturedHighlights([]);
          return;
        }

        const data = await fetchPublicWithFallback(
          `${API_BASE_URL || ''}/api/highlights/public/featured`,
          {
            signal: AbortSignal.timeout(API_TIMEOUT),
          }
        );

        const highlights = data?.highlights || [];
        const reversedHighlights = [...highlights].reverse();
        setFeaturedHighlights(reversedHighlights);
      } catch {
        setFeaturedHighlights([]);
      }
    };

    fetchFeaturedHighlights();

    const handleStarredChange = () => {
      fetchFeaturedHighlights();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('starredHighlightsChanged', handleStarredChange);
      return () => {
        window.removeEventListener('starredHighlightsChanged', handleStarredChange);
      };
    }
  }, []);

  return {
    allOrganizations,
    featuredHighlights,
  };
}
