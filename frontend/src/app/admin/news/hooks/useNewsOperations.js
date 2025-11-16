import { useState, useCallback } from 'react';
import { invalidateNewsCache } from '../../utils/cacheInvalidator';
import { API_BASE_URL } from '@/config/api';

/**
 * Custom hook for managing news CRUD operations
 * @param {string} orgId - Organization ID
 * @param {function} refreshNews - Function to refresh news data
 * @param {function} setSuccessModal - Function to show success/error messages
 * @returns {object} News operations and state
 */
export const useNewsOperations = (orgId, refreshNews, setSuccessModal) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Validation helper function
  const validateNewsData = useCallback((newsData) => {
    const errors = [];
    if (!newsData.title?.trim()) errors.push('News title is required.');
    if (!newsData.slug?.trim()) errors.push('News slug is required.');
    if (!newsData.content?.trim()) errors.push('News content is required.');
    if (!newsData.excerpt?.trim()) errors.push('News excerpt is required.');
    if (!newsData.publishedAt) errors.push('Published date is required.');
    return errors;
  }, []);

  // No longer need getAdminToken - using httpOnly cookies

  // Helper function to create FormData
  const createFormData = useCallback((newsData) => {
    const formData = new FormData();
    formData.append('title', newsData.title.trim());
    formData.append('slug', newsData.slug.trim());
    formData.append('content', newsData.content.trim());
    formData.append('excerpt', newsData.excerpt.trim());
    formData.append('published_at', newsData.publishedAt);
    
    // Add featured image if provided
    if (newsData.featuredImage) {
      formData.append('featured_image', newsData.featuredImage);
    }
    
    return formData;
  }, []);

  // Handle news creation
  const handleSubmitNews = useCallback(async (newsData) => {
    setIsSubmitting(true);
    try {
      if (!orgId) {
        setSuccessModal({ isVisible: true, message: 'Organization information not found. Please try again.', type: 'error' });
        return;
      }

      // Validate required fields
      const validationErrors = validateNewsData(newsData);
      if (validationErrors.length > 0) {
        setSuccessModal({ isVisible: true, message: validationErrors[0], type: 'error' });
        return;
      }

      const formData = createFormData(newsData);
      
      const response = await fetch(`${API_BASE_URL || ''}/api/news/${orgId}`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        
        if (errorData.errorCode === 'DUPLICATE_TITLE') {
          throw new Error(errorData.message || 'A post with this title already exists in your organization.');
        }
        
        throw new Error(errorData.message || `Failed to create news: ${response.status} ${response.statusText}`);
      }

      setSuccessModal({ isVisible: true, message: 'News created successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to create news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [orgId, validateNewsData, createFormData, refreshNews, setSuccessModal]);

  // Handle news update
  const handleUpdateNews = useCallback(async (newsData, editingNewsId) => {
    setIsSubmitting(true);
    try {
      if (!editingNewsId) {
        setSuccessModal({ isVisible: true, message: 'News ID not found. Please try again.', type: 'error' });
        return;
      }

      // Validate required fields
      const validationErrors = validateNewsData(newsData);
      if (validationErrors.length > 0) {
        setSuccessModal({ isVisible: true, message: validationErrors[0], type: 'error' });
        return;
      }

      const formData = createFormData(newsData);
      
      const response = await fetch(`${API_BASE_URL || ''}/api/news/${editingNewsId}`, {
        method: 'PUT',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        
        if (errorData.errorCode === 'DUPLICATE_TITLE') {
          throw new Error(errorData.message || 'A post with this title already exists in your organization.');
        }
        
        throw new Error(errorData.message || `Failed to update news: ${response.status} ${response.statusText}`);
      }

      setSuccessModal({ isVisible: true, message: 'News updated successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to update news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
      return { success: false, error: errorMessage };
    } finally {
      setIsSubmitting(false);
    }
  }, [validateNewsData, createFormData, refreshNews, setSuccessModal]);

  // Handle single news deletion
  const handleDeleteNews = useCallback(async (newsId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL || ''}/api/news/${newsId}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete news: ${response.status} ${response.statusText}`);
      }

      setSuccessModal({ isVisible: true, message: 'News deleted successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : 'Failed to delete news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  }, [refreshNews, setSuccessModal]);

  // Handle bulk news deletion
  const handleBulkDelete = useCallback(async (selectedNewsIds) => {
    setIsDeleting(true);
    try {
      // Delete each selected news item
      const deletePromises = selectedNewsIds.map(newsId => 
        fetch(`${API_BASE_URL || ''}/api/news/${newsId}`, {
          method: 'DELETE',
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
            // No Authorization header needed - httpOnly cookies handle authentication
          },
        })
      );

      const results = await Promise.allSettled(deletePromises);
      const failedDeletes = results.filter(result => result.status === 'rejected').length;
      
      if (failedDeletes > 0) {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length - failedDeletes} news items deleted successfully. ${failedDeletes} failed to delete.`, 
          type: 'warning' 
        });
      } else {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length} news items deleted successfully!`, 
          type: 'success' 
        });
      }

      refreshNews();
      invalidateNewsCache();
      return { success: true, failedCount: failedDeletes };
    } catch (error) {
      setSuccessModal({ isVisible: true, message: 'Failed to delete news items. Please try again.', type: 'error' });
      return { success: false, error: error.message };
    } finally {
      setIsDeleting(false);
    }
  }, [refreshNews, setSuccessModal]);

  return {
    // State
    isSubmitting,
    isDeleting,
    
    // Operations
    handleSubmitNews,
    handleUpdateNews,
    handleDeleteNews,
    handleBulkDelete,
    
    // Utilities
    validateNewsData
  };
};
