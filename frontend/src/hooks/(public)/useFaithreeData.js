'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { API_TIMEOUT } from '@/app/(public)/faithree/constants';
import { fetchPublicWithFallback } from '@/utils/shared/fetchPublicWithFallback';
import { resolveFallbackApi } from '@/data';
import { getOrganizationsApiResponse } from '@/data/organizations';
import { getFaithreeFeaturedHighlightsResponse } from '@/data/faithree';

function parseOrganizationsResponse(data) {
  if (data?.success && Array.isArray(data.data)) {
    return data.data;
  }
  return [];
}

function parseHighlightsResponse(data) {
  if (data?.highlights && Array.isArray(data.highlights)) {
    return data.highlights;
  }
  return [];
}

/**
 * FAITHree data hook — organizations + featured highlights with static fallback
 * for live demo when the API is unavailable (see frontend/src/data/faithree.js).
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

        const url = `${API_BASE_URL || ''}/api/organizations`;
        const data = await fetchPublicWithFallback(url, {
          signal: AbortSignal.timeout(API_TIMEOUT),
        });

        let organizations = parseOrganizationsResponse(data);
        if (organizations.length === 0) {
          organizations = parseOrganizationsResponse(getOrganizationsApiResponse());
        }

        setAllOrganizations(
          [...organizations].sort((a, b) => (a.acronym || '').localeCompare(b.acronym || ''))
        );
      } catch {
        const fallback = parseOrganizationsResponse(getOrganizationsApiResponse());
        setAllOrganizations(
          [...fallback].sort((a, b) => (a.acronym || '').localeCompare(b.acronym || ''))
        );
      }
    };

    fetchAllOrganizations();
  }, []);

  useEffect(() => {
    const highlightsUrl = `${API_BASE_URL || ''}/api/highlights/public/featured`;

    const fetchFeaturedHighlights = async () => {
      try {
        if (typeof window === 'undefined') {
          setFeaturedHighlights([]);
          return;
        }

        const data = await fetchPublicWithFallback(highlightsUrl, {
          signal: AbortSignal.timeout(API_TIMEOUT),
        });

        let highlights = parseHighlightsResponse(data);
        if (highlights.length === 0) {
          highlights = parseHighlightsResponse(getFaithreeFeaturedHighlightsResponse());
        }

        setFeaturedHighlights([...highlights].reverse());
      } catch {
        const apiFallback = resolveFallbackApi(highlightsUrl, { method: 'GET' });
        const highlights = parseHighlightsResponse(
          apiFallback || getFaithreeFeaturedHighlightsResponse()
        );
        setFeaturedHighlights([...highlights].reverse());
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
