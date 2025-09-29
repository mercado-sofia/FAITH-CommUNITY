import { useMemo } from 'react';

/**
 * Custom hook for managing news filtering, sorting, and search
 * @param {Array} news - Array of news items
 * @param {string} searchQuery - Search query string
 * @param {string} sortBy - Sort criteria ('newest', 'oldest', 'title')
 * @returns {object} Filtered and sorted news data
 */
export const useNewsFilters = (news, searchQuery, sortBy) => {
  // Filter news based on search query
  const filteredNews = useMemo(() => {
    if (!news || !Array.isArray(news)) return [];
    
    return news.filter(item => {
      if (!item || !item.title) return false;
      
      const matchesSearch = !searchQuery || 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      return matchesSearch;
    });
  }, [news, searchQuery]);

  // Sort filtered news
  const sortedNews = useMemo(() => {
    if (!filteredNews || filteredNews.length === 0) return [];
    
    return [...filteredNews].sort((a, b) => {
      switch (sortBy.toLowerCase()) {
        case 'newest':
          // Sort by date field (newest first)
          const dateA = a.date || a.created_at || new Date(0);
          const dateB = b.date || b.created_at || new Date(0);
          return new Date(dateB) - new Date(dateA);
          
        case 'oldest':
          // Sort by date field (oldest first)
          const dateAOld = a.date || a.created_at || new Date(0);
          const dateBOld = b.date || b.created_at || new Date(0);
          return new Date(dateAOld) - new Date(dateBOld);
          
        case 'title':
          return (a.title || '').localeCompare(b.title || '');
          
        default:
          // Default to newest
          const dateADef = a.date || a.created_at || new Date(0);
          const dateBDef = b.date || b.created_at || new Date(0);
          return new Date(dateBDef) - new Date(dateADef);
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
