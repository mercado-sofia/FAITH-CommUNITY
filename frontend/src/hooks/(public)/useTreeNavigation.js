'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for tree navigation
 * @param {Array} highlightChunks - Array of highlight chunks (one per tree)
 * @returns {Object} Navigation state and handlers
 */
export function useTreeNavigation(highlightChunks = []) {
  const [currentTreeIndex, setCurrentTreeIndex] = useState(0);

  // Reset to first tree when highlights change
  useEffect(() => {
    setCurrentTreeIndex(0);
  }, [highlightChunks.length]);

  // Handle tree selection
  const handleTreeSelect = useCallback((treeIndex) => {
    if (treeIndex >= 0 && treeIndex < highlightChunks.length) {
      setCurrentTreeIndex(treeIndex);
      return true; // Indicates loading should be shown
    }
    return false;
  }, [highlightChunks.length]);

  // Handle previous tree
  const handlePreviousTree = useCallback(() => {
    if (currentTreeIndex > 0) {
      setCurrentTreeIndex(currentTreeIndex - 1);
      return true; // Indicates loading should be shown
    }
    return false;
  }, [currentTreeIndex]);

  // Handle next tree
  const handleNextTree = useCallback(() => {
    if (currentTreeIndex < highlightChunks.length - 1) {
      setCurrentTreeIndex(currentTreeIndex + 1);
      return true; // Indicates loading should be shown
    }
    return false;
  }, [currentTreeIndex, highlightChunks.length]);

  // Get current tree's highlights
  const currentTreeHighlights = highlightChunks[currentTreeIndex] || [];

  return {
    currentTreeIndex,
    currentTreeHighlights,
    handleTreeSelect,
    handlePreviousTree,
    handleNextTree,
  };
}
