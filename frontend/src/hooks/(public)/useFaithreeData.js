'use client';

import { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/config/api';
import { API_TIMEOUT } from '@/app/(public)/faithree/constants';

/**
 * Custom hook for fetching FAITHree data
 * Handles fetching organizations and featured highlights
 * @returns {Object} Data and loading states
 */
export function useFaithreeData() {
  const [allOrganizations, setAllOrganizations] = useState([]);
  const [featuredHighlights, setFeaturedHighlights] = useState([]);

  // Fetch all active organizations from API
  useEffect(() => {
    const fetchAllOrganizations = async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          setAllOrganizations([]);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL || ''}/api/organizations`, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch organizations: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const organizations = data.success && Array.isArray(data.data) ? data.data : [];
        
        // Sort organizations by acronym
        const sortedOrgs = organizations.sort((a, b) => 
          (a.acronym || '').localeCompare(b.acronym || '')
        );
        
        setAllOrganizations(sortedOrgs);
      } catch (error) {
        // Set empty array on error - filters won't show but page will still load
        setAllOrganizations([]);
      }
    };

    fetchAllOrganizations();
  }, []);

  // Fetch featured highlights from API
  useEffect(() => {
    const fetchFeaturedHighlights = async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          setFeaturedHighlights([]);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL || ''}/api/highlights/public/featured`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
          signal: AbortSignal.timeout(API_TIMEOUT),
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch featured highlights: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
        // API already returns highlights in order (by display_order)
        // No limit - can feature unlimited highlights
        setFeaturedHighlights(highlights);
      } catch (error) {
        // Set empty array on error - stars won't show but page will still load
        setFeaturedHighlights([]);
      }
    };

    fetchFeaturedHighlights();

    // Listen for changes to featured highlights
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
