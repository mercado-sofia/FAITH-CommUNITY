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

  // Validation helper function (backup validation - form should handle primary validation)
  const validateNewsData = useCallback((newsData, isEditMode = false) => {
    const errors = [];
    if (!newsData.title?.trim()) errors.push('News title is required.');
    if (!newsData.slug?.trim()) errors.push('News slug is required.');
    // For draft saves, content/excerpt are optional
    // For schedule/publish, content and excerpt are required
    const isDraft = newsData.action === 'draft';
    const isSchedule = newsData.action === 'schedule';
    const isPublish = newsData.action === 'publish';
    
    if (!isDraft && !isEditMode) {
      if (!newsData.content?.trim()) errors.push('News content is required.');
      if (!newsData.excerpt?.trim()) errors.push('News excerpt is required.');
    }
    // Only validate publishedAt on create for schedule action (not for draft or publish)
    // Publish action uses current time, so publishedAt is not required
    if (!isEditMode && isSchedule && !newsData.publishedAt) {
      errors.push('Published date and time are required for scheduling.');
    }
    return errors;
  }, []);

  // Helper function to convert ISO datetime format to MySQL format
  const convertToMySQLFormat = useCallback((publishedAt) => {
    if (!publishedAt) return '';
    
    // Ensure we have a valid ISO format datetime string
    let isoFormat = publishedAt;
    
    // If it's already in ISO format (has T), use it directly
    if (isoFormat.includes('T')) {
      // Ensure seconds are included
      const parts = isoFormat.split('T');
      if (parts.length === 2) {
        const timePart = parts[1];
        const timeParts = timePart.split(':');
        if (timeParts.length === 2) {
          // Add seconds if missing
          isoFormat = `${parts[0]}T${timePart}:00`;
        }
      }
    } else if (isoFormat.includes(' ')) {
      // Convert MySQL format to ISO format first, then back to MySQL (normalization)
      isoFormat = isoFormat.replace(' ', 'T');
    }
    
    // Convert from ISO format (yyyy-MM-ddTHH:mm:ss) to MySQL format (yyyy-MM-dd HH:mm:ss)
    const mysqlFormat = isoFormat.replace('T', ' ').slice(0, 19);
    
    
    return mysqlFormat;
  }, []);

  // Helper function to create FormData
  const createFormData = useCallback((newsData, isEditMode = false) => {
    const formData = new FormData();
    formData.append('title', (newsData.title || '').trim());
    formData.append('slug', (newsData.slug || '').trim());
    formData.append('content', (newsData.content || '').trim());
    formData.append('excerpt', (newsData.excerpt || '').trim());
    
    // Include published_at and action based on mode
    if (!isEditMode) {
      // Create mode: Always include published_at (even if null for drafts)
      // For draft, send null explicitly; for publish/schedule, send the datetime
      if (newsData.publishedAt) {
        formData.append('published_at', convertToMySQLFormat(newsData.publishedAt));
      } else {
        // For draft, send empty string (backend will convert to null)
        formData.append('published_at', '');
      }
      
      // Always include action for create mode (draft, schedule, publish)
      const actionValue = newsData.action || '';
      formData.append('action', actionValue);
    } else {
      // Edit mode: Include published_at and action only for drafts/scheduled (not for published/archived)
      // For published/archived news, published_at is immutable and status should remain unchanged
      // For drafts/scheduled, include published_at and action to allow status changes
      if (newsData.action && newsData.action !== 'save') {
        // Draft/scheduled edit mode: include published_at and action
        if (newsData.publishedAt) {
          formData.append('published_at', convertToMySQLFormat(newsData.publishedAt));
        } else {
          formData.append('published_at', '');
        }
        formData.append('action', newsData.action);
      }
      // For published/archived news (action === 'save'), don't send published_at or action
      // Backend will preserve the current status and published_at when no action is provided
    }
    
    // Add featured image if provided (new file upload)
    // Note: If no new file is provided in edit mode, backend will preserve existing image
    if (newsData.featuredImage && newsData.featuredImage instanceof File) {
      formData.append('featured_image', newsData.featuredImage);
    }
    
    return formData;
  }, [convertToMySQLFormat]);

  // Handle news creation
  const handleSubmitNews = useCallback(async (newsData) => {
    setIsSubmitting(true);
    try {
      if (!orgId) {
        const errorMsg = 'Organization information not found. Please try again.';
        setSuccessModal({ isVisible: true, message: errorMsg, type: 'error' });
        return { success: false, error: errorMsg };
      }

      // Validate required fields
      const validationErrors = validateNewsData(newsData, false);
      if (validationErrors.length > 0) {
        const errorMsg = validationErrors[0];
        setSuccessModal({ isVisible: true, message: errorMsg, type: 'error' });
        return { success: false, error: errorMsg };
      }

      const formData = createFormData(newsData, false);
      
      const response = await fetch(`${API_BASE_URL || ''}/api/news/${orgId}`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData
      });

      // Store status and statusText before consuming the response body
      const responseStatus = response.status;
      const responseStatusText = response.statusText;
      const responseOk = response.ok;

      // Get response text first to see what we're getting
      const responseText = await response.text();
      let responseData = {};
      
      // Try to parse JSON, but handle empty or non-JSON responses
      if (responseText && responseText.trim()) {
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[handleSubmitNews] Failed to parse response as JSON:', {
              responseText: responseText.substring(0, 200), // Log first 200 chars
              parseError: parseError.message
            });
          }
          // If it's not JSON, treat it as a plain text error message
          responseData = { 
            message: responseText || `Server error: ${responseStatus} ${responseStatusText}`,
            error: responseText || `Server error: ${responseStatus} ${responseStatusText}`
          };
        }
      } else {
        // Empty response - create error object
        responseData = { 
          message: `Server error: ${responseStatus} ${responseStatusText}`,
          error: `Server returned empty response: ${responseStatus} ${responseStatusText}`
        };
      }

      if (!responseOk) {
        // Log the full error response for debugging (development only)
        if (process.env.NODE_ENV === 'development') {
          console.error('[handleSubmitNews] Error response:', {
            status: responseStatus,
            statusText: responseStatusText,
            responseText: responseText ? responseText.substring(0, 500) : '(empty)',
            responseData: responseData,
            hasError: !!responseData.error,
            hasMessage: !!responseData.message
          });
        }
        
        if (responseData.errorCode === 'DUPLICATE_TITLE') {
          throw new Error(responseData.message || 'A post with this title already exists in your organization.');
        }
        
        // Prioritize error field (more detailed), then message, then fallback
        const backendMessage = responseData.error || responseData.message || `Failed to create news: ${responseStatus} ${responseStatusText}`;
        throw new Error(backendMessage);
      }

      setSuccessModal({ isVisible: true, message: 'News created successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      // Log the full error for debugging (development only)
      if (process.env.NODE_ENV === 'development') {
        console.error('[handleSubmitNews] Error caught:', error);
      }
      
      // Preserve the actual error message from backend or validation
      let errorMessage = error.message || 'An unknown error occurred';
      
      // Only show generic message for network errors
      if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (!error.message || error.message === 'Unknown error occurred') {
        errorMessage = 'Failed to create news. Please try again.';
      }
      // Otherwise, use the actual error message (from backend validation, etc.)
      
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

      // Validate required fields (no publishedAt validation in edit mode)
      const validationErrors = validateNewsData(newsData, true);
      if (validationErrors.length > 0) {
        setSuccessModal({ isVisible: true, message: validationErrors[0], type: 'error' });
        return;
      }

      const formData = createFormData(newsData, true);
      
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

  // Handle news archiving
  const handleArchiveNews = useCallback(async (newsId) => {
    setIsDeleting(true);
    try {
      // First, fetch the current news data
      const getResponse = await fetch(`${API_BASE_URL || ''}/api/news/${newsId}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!getResponse.ok) {
        const errorData = await getResponse.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `Failed to fetch news: ${getResponse.status} ${getResponse.statusText}`);
      }

      const newsData = await getResponse.json();
      
      // Validate that we have all required fields (they should not be empty strings or null)
      if (!newsData.title || newsData.title.trim() === '') {
        throw new Error('Title is required and cannot be empty');
      }
      if (!newsData.slug || newsData.slug.trim() === '') {
        throw new Error('Slug is required and cannot be empty');
      }
      // Content and excerpt can be empty strings, but we need to ensure they're not null/undefined
      const content = newsData.content !== null && newsData.content !== undefined ? newsData.content : '';
      const excerpt = newsData.excerpt !== null && newsData.excerpt !== undefined ? newsData.excerpt : '';
      
      // Create FormData with all required fields and set status to archived
      const formData = new FormData();
      formData.append('title', newsData.title.trim());
      formData.append('slug', newsData.slug.trim());
      formData.append('content', content);
      formData.append('excerpt', excerpt);
      // Include published_at if it exists (for published news)
      if (newsData.published_at || newsData.date) {
        formData.append('published_at', newsData.published_at || newsData.date);
      }
      formData.append('action', 'archive'); // Use a special action for archiving
      
      // Update with archived status
      const response = await fetch(`${API_BASE_URL || ''}/api/news/${newsId}`, {
        method: 'PUT',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, use status text
          const errorText = await response.text().catch(() => response.statusText);
          throw new Error(`Failed to archive news: ${response.status} ${errorText}`);
        }
        
        // Extract error message from response - prioritize error field, then message
        const errorMessage = errorData.error || errorData.message || `Failed to archive news: ${response.status}`;
        
        // Log full error details in development
        if (process.env.NODE_ENV === 'development') {
          console.error('[handleArchiveNews] Error response:', errorData);
        }
        
        throw new Error(errorMessage);
      }

      setSuccessModal({ isVisible: true, message: 'News archived successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : error.message || 'Failed to archive news. Please try again.';
      setSuccessModal({ isVisible: true, message: errorMessage, type: 'error' });
      return { success: false, error: errorMessage };
    } finally {
      setIsDeleting(false);
    }
  }, [refreshNews, setSuccessModal]);

  // Handle news unarchiving (restore)
  const handleUnarchiveNews = useCallback(async (newsId) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_BASE_URL || ''}/api/news/restore/${newsId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error occurred' }));
        throw new Error(errorData.message || `Failed to unarchive news: ${response.status} ${response.statusText}`);
      }

      setSuccessModal({ isVisible: true, message: 'News unarchived successfully!', type: 'success' });
      refreshNews();
      invalidateNewsCache();
      return { success: true };
    } catch (error) {
      const errorMessage = error.message.includes('Failed to fetch') 
        ? 'Network error. Please check your connection and try again.'
        : error.message || 'Failed to unarchive news. Please try again.';
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

  // Handle bulk news archiving
  const handleBulkArchive = useCallback(async (selectedNewsIds, newsItems) => {
    setIsDeleting(true);
    try {
      // Archive each selected news item
      const archivePromises = selectedNewsIds.map(async (newsId) => {
        // Find the news item to get its data
        const newsItem = newsItems.find(item => item.id === newsId);
        if (!newsItem) {
          throw new Error(`News item with ID ${newsId} not found`);
        }

        // Create FormData with all required fields and set status to archived
        const formData = new FormData();
        formData.append('title', newsItem.title.trim());
        formData.append('slug', newsItem.slug.trim());
        formData.append('content', newsItem.content || '');
        formData.append('excerpt', newsItem.excerpt || '');
        // Include published_at if it exists
        if (newsItem.published_at || newsItem.date) {
          formData.append('published_at', newsItem.published_at || newsItem.date);
        }
        formData.append('action', 'archive');

        return fetch(`${API_BASE_URL || ''}/api/news/${newsId}`, {
          method: 'PUT',
          credentials: 'include',
          body: formData
        });
      });

      const results = await Promise.allSettled(archivePromises);
      const failedArchives = results.filter(result => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)).length;
      
      if (failedArchives > 0) {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length - failedArchives} news items archived successfully. ${failedArchives} failed to archive.`, 
          type: 'warning' 
        });
      } else {
        setSuccessModal({ 
          isVisible: true, 
          message: `${selectedNewsIds.length} news items archived successfully!`, 
          type: 'success' 
        });
      }

      refreshNews();
      invalidateNewsCache();
      return { success: true, failedCount: failedArchives };
    } catch (error) {
      setSuccessModal({ isVisible: true, message: 'Failed to archive news items. Please try again.', type: 'error' });
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
    handleArchiveNews,
    handleUnarchiveNews,
    handleBulkDelete,
    handleBulkArchive,
    
    // Utilities
    validateNewsData
  };
};
