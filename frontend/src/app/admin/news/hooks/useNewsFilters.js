import { useMemo } from 'react';

/**
 * Custom hook for managing news filtering, sorting, and search
 * @param {Array} news - Array of news items
 * @param {string} searchQuery - Search query string
 * @param {string} sortBy - Sort criteria ('newest', 'oldest', 'title')
 * @param {string} statusFilter - Status filter ('all', 'draft', 'published', 'scheduled', 'archived')
 * @returns {object} Filtered and sorted news data
 */
export const useNewsFilters = (news, searchQuery, sortBy, statusFilter = 'all') => {
  // Filter news based on search query and status
  const filteredNews = useMemo(() => {
    if (!news || !Array.isArray(news)) return [];
    
    return news.filter(item => {
      if (!item || !item.title) return false;
      
      // Status filter
      const normalizedStatus = (item.status || 'draft').toLowerCase();
      const normalizedFilter = statusFilter.toLowerCase();
      const matchesStatus = normalizedFilter === 'all' || normalizedStatus === normalizedFilter;
      
      // Search filter
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.excerpt && item.excerpt.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())); // Backward compatibility
      
      return matchesStatus && matchesSearch;
    });
  }, [news, searchQuery, statusFilter]);

  // Sort filtered news
  const sortedNews = useMemo(() => {
    if (!filteredNews || filteredNews.length === 0) return [];
    
    // Helper function to get date for sorting
    const getDate = (item) => new Date(item.date || item.created_at || 0);
    
    return [...filteredNews].sort((a, b) => {
      switch (sortBy.toLowerCase()) {
        case 'newest':
          // Sort by date field (newest first)
          return getDate(b) - getDate(a);
          
        case 'oldest':
          // Sort by date field (oldest first)
          return getDate(a) - getDate(b);
          
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
          
        default:
          // Default to newest
          return getDate(b) - getDate(a);
      }
    });
  }, [filteredNews, sortBy]);

  // Get displayed news (same as sorted for now, but can be extended for pagination)
  const displayedNews = useMemo(() => {
    return sortedNews || [];
  }, [sortedNews]);

  // Get statistics
  const stats = useMemo(() => {
    return {
      totalCount: news?.length || 0,
      filteredCount: filteredNews?.length || 0,
      displayedCount: displayedNews?.length || 0
    };
  }, [news?.length, filteredNews?.length, displayedNews?.length]);

  return {
    filteredNews,
    sortedNews,
    displayedNews,
    stats
  };
};
