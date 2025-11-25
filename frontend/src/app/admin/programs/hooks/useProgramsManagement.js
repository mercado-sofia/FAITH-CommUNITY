import { useState, useCallback } from 'react';
import { getAdminTokenOrRedirect, handleApiError, API_CONFIG } from '../../utils';

// Helper function to convert date to MySQL format (YYYY-MM-DD)
const formatDateForMySQL = (dateValue) => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string') {
    // If it's already in YYYY-MM-DD format, return as is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
      return dateValue;
    }
    // If it's an ISO string, extract the date part
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0];
  }
  // If it's a Date object
  if (dateValue instanceof Date) {
    if (isNaN(dateValue.getTime())) return null;
    return dateValue.toISOString().split('T')[0];
  }
  return null;
};

// Helper function to format multiple dates array
const formatMultipleDates = (dates) => {
  if (!dates || !Array.isArray(dates)) return null;
  const formatted = dates.map(date => formatDateForMySQL(date)).filter(date => date !== null);
  return formatted.length > 0 ? formatted : null;
};

export const useProgramsManagement = (currentAdmin, refreshPrograms, setSuccessModal, resetPageMode, clearDeletingProgram, clearArchivingProgram = null, clearUnarchivingProgram = null) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Handle program submission for approval
  const handleSubmitProgram = useCallback(async (programData) => {
    // Prevent duplicate submissions
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      if (!currentAdmin?.org || !currentAdmin?.id) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Missing organization or admin ID. Please log in again.', 
          type: 'error' 
        });
        return;
      }
      
      // Check for window to avoid SSR errors
      if (typeof window === 'undefined') {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Cannot perform this action on server side.', 
          type: 'error' 
        });
        return;
      }
      
      // Validate required fields
      if (!programData.title || !programData.description || !programData.category) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Please fill in all required fields (Title, Description, Category).', 
          type: 'error' 
        });
        return;
      }

      // Use FormData for file uploads
      const formData = new FormData();
      formData.append('title', programData.title.trim());
      formData.append('description', programData.description.trim());
      formData.append('category', programData.category.trim());
      
      // Add dates if provided (formatted for MySQL)
      if (programData.event_start_date) {
        const formattedDate = formatDateForMySQL(programData.event_start_date);
        if (formattedDate) {
          formData.append('event_start_date', formattedDate);
        }
      }
      if (programData.event_end_date) {
        const formattedDate = formatDateForMySQL(programData.event_end_date);
        if (formattedDate) {
          formData.append('event_end_date', formattedDate);
        }
      }
      
      // Add collaborators if any
      if (programData.collaborators && Array.isArray(programData.collaborators) && programData.collaborators.length > 0) {
        const collaboratorIds = programData.collaborators
          .filter(collaborator => collaborator && collaborator.id)
          .map(collaborator => collaborator.id);
        
        if (collaboratorIds.length > 0) {
          formData.append('collaborators', JSON.stringify(collaboratorIds));
        }
      }
      
      // Add image if provided
      if (programData.image && programData.image instanceof File) {
        formData.append('image', programData.image);
      }
      
      
      // First, upload the image if provided
      let imageUrl = null;
      if (programData.image && programData.image instanceof File) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('file', programData.image);
          
          const imageResponse = await fetch(`${API_CONFIG.BASE_URL || ''}/api/upload?type=program`, {
            method: 'POST',
            credentials: 'include', // CRITICAL: Include httpOnly cookies
            // Don't set Content-Type - browser will set it with boundary for FormData
            body: imageFormData,
          });
          
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            imageUrl = imageResult.url || imageResult.public_id;
          }
        } catch (imageError) {
          // Image upload failed, proceeding without image
        }
      }
      
      // Upload post-act report file if provided
      let postActReportUrl = null;
      let postActReportPublicId = null;
      if (programData.postActReport && programData.postActReport instanceof File) {
        try {
          const reportFormData = new FormData();
          reportFormData.append('file', programData.postActReport);
          
          // Upload to S3 (using the same upload endpoint, but we'll specify it's for post-act report)
          const reportResponse = await fetch(`${API_CONFIG.BASE_URL || ''}/api/upload?type=program_post_act`, {
            method: 'POST',
            credentials: 'include',
            body: reportFormData,
          });
          
          if (!reportResponse.ok) {
            const errorInfo = handleApiError({ status: reportResponse.status }, 'post_act_report_upload', {
              redirectOnAuth: true,
              logError: true
            });
            throw new Error(errorInfo.message || 'Failed to upload post-act report');
          }
          
          const reportResult = await reportResponse.json();
          if (!reportResult.url && !reportResult.public_id) {
            throw new Error('Post-act report upload failed: No URL returned');
          }
          
          postActReportUrl = reportResult.url || reportResult.public_id;
          postActReportPublicId = reportResult.public_id || null;
        } catch (reportError) {
          // Post-act report upload failed - show error and stop submission
          setSuccessModal({ 
            isVisible: true, 
            message: reportError.message || 'Failed to upload post-act report. Please try again.', 
            type: 'error' 
          });
          setIsSubmitting(false);
          return;
        }
      }
      
      // Submit through the submissions system
      const submissionData = {
        submissions: [{
          organization_id: currentAdmin.org,
          section: 'programs',
          // No previous_data needed for programs - they are always new submissions
          proposed_data: {
            title: programData.title.trim(),
            description: programData.description.trim(),
            category: programData.category.trim(),
            event_start_date: formatDateForMySQL(programData.event_start_date),
            event_end_date: formatDateForMySQL(programData.event_end_date),
            multiple_dates: formatMultipleDates(programData.multiple_dates),
            status: programData.status || 'pending',
            collaborators: programData.collaborators || [],
            image: imageUrl, // Use uploaded image URL
            additionalImages: programData.additionalImages || [],
            submitted_by_name: programData.submitted_by_name?.trim() || '',
            submitted_by_role: programData.submitted_by_role?.trim() || '',
            // Include post-act report data if provided
            ...(postActReportUrl && {
              postActReport: {
                file_url: postActReportUrl,
                file_public_id: postActReportPublicId
              }
            })
          },
          submitted_by: currentAdmin.id
        }]
      };
      
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/submissions`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        // Try to extract error message from response
        let errorMessage = '';
        try {
          const errorData = await response.json().catch(() => null);
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If JSON parsing fails, try text
          const errorText = await response.text().catch(() => '');
          if (errorText) {
            errorMessage = errorText;
          }
        }
        
        const errorInfo = handleApiError({ status: response.status }, 'program_submit', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorMessage || errorInfo.message || `Failed to submit program: ${response.status}`);
      }

      const responseData = await response.json();
      
      // Check if it's a collaborative program
      if (programData.collaborators && programData.collaborators.length > 0) {
        setSuccessModal({ 
          isVisible: true, 
          message: `Your collaborative program "${programData.title}" has been submitted for approval. Collaboration requests will be sent to invited organizations once the superadmin approves the program.`, 
          type: 'success' 
        });
      } else {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Program submitted for approval successfully! It will appear in your submissions page.', 
          type: 'success' 
        });
      }

      refreshPrograms();
      
      // Also refresh submissions data if available
      if (typeof window !== 'undefined' && window.swrCache) {
        // Invalidate submissions cache to refresh submissions page
        const submissionsKey = `${API_CONFIG.BASE_URL}/api/submissions/${currentAdmin.org}`;
        window.swrCache.delete(submissionsKey);
      }
      
      // Reset page mode to list after successful submission
      if (resetPageMode) {
        resetPageMode();
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_submit', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentAdmin, refreshPrograms, setSuccessModal, isSubmitting, resetPageMode]);

  // Handle program update
  const handleUpdateProgram = useCallback(async (programData, editingProgram) => {
    try {
      if (!editingProgram?.id) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Program ID not found. Please try again.', 
          type: 'error' 
        });
        return;
      }

      // Check for window to avoid SSR errors
      if (typeof window === 'undefined') {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Cannot perform this action on server side.', 
          type: 'error' 
        });
        return;
      }

      // Handle image upload if it's a File object
      let imageUrl = null;
      if (programData.image && programData.image instanceof File) {
        try {
          const imageFormData = new FormData();
          imageFormData.append('file', programData.image);
          
          const imageResponse = await fetch(`${API_CONFIG.BASE_URL || ''}/api/upload?type=program`, {
            method: 'POST',
            credentials: 'include', // CRITICAL: Include httpOnly cookies
            // Don't set Content-Type - browser will set it with boundary for FormData
            body: imageFormData,
          });
          
          if (imageResponse.ok) {
            const imageResult = await imageResponse.json();
            // Prefer public_id over url since database stores public_id
            // If public_id is not available, extract it from url or use url
            imageUrl = imageResult.cloudinary_info?.public_id || imageResult.public_id || imageResult.url || imageResult.filePath;
          } else {
            // If upload fails, show error and return early
            const errorData = await imageResponse.json().catch(() => ({ message: 'Failed to upload image' }));
            throw new Error(errorData.message || 'Failed to upload image');
          }
        } catch (imageError) {
          // Image upload failed - show error and return
          setSuccessModal({ 
            isVisible: true, 
            message: imageError.message || 'Failed to upload image. Please try again.', 
            type: 'error' 
          });
          return;
        }
      }

      // Prepare the data for the update request
      // Handle image properly:
      // - If imageUrl exists (uploaded successfully), use it
      // - Else if programData.image is a string (base64 or URL), use it
      // - Else if programData.image is undefined, use undefined (to keep existing image)
      // - Never send File objects in JSON body
      let imageValue = undefined;
      if (imageUrl) {
        imageValue = imageUrl;
      } else if (programData.image !== undefined && programData.image !== null) {
        // Only use programData.image if it's a string (base64 or URL), not a File object
        if (typeof programData.image === 'string') {
          imageValue = programData.image;
        } else {
          // If it's not a string and not undefined/null, it's likely a File object that wasn't uploaded
          // In this case, keep existing image (undefined)
          imageValue = undefined;
        }
      } else {
        // programData.image is undefined or null - keep existing image
        imageValue = undefined;
      }

      const updateData = {
        title: programData.title?.trim() || '',
        description: programData.description?.trim() || '',
        category: programData.category?.trim() || '',
        event_start_date: formatDateForMySQL(programData.event_start_date),
        event_end_date: formatDateForMySQL(programData.event_end_date),
        multiple_dates: formatMultipleDates(programData.multiple_dates),
        status: programData.status || 'active',
        accepts_volunteers: programData.accepts_volunteers !== undefined ? programData.accepts_volunteers : true,
        // The form sends edited_by_name/role as submitted_by_name/role in edit mode
        // So we use programData.submitted_by_name/role (which contains the edited_by values)
        submitted_by_name: programData.submitted_by_name?.trim() || '',
        submitted_by_role: programData.submitted_by_role?.trim() || '',
        // DO NOT send collaborators in Edit mode - they are handled separately via the invite-collaborator endpoint
        // This prevents overwriting collaborators that were just added
        // Handle image properly - use uploaded URL, base64 string, or undefined to keep existing
        image: imageValue,
        additionalImages: programData.additionalImages || []
      };

      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${editingProgram.id}`, {
        method: 'PUT',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_update', {
          redirectOnAuth: true,
          logError: true
        });
        const errorData = await response.json().catch(() => ({ message: errorInfo.message }));
        // Include the actual error message from the backend if available
        const errorMessage = errorData.error || errorData.message || errorInfo.message;
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      setSuccessModal({ 
        isVisible: true, 
        message: 'Program updated successfully!', 
        type: 'success' 
      });
      
      refreshPrograms();
      
      // Reset page mode to list after successful update
      if (resetPageMode) {
        resetPageMode();
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_update', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal, resetPageMode]);

  // Handle mark program as completed: now uploads Post Act Report and submits for approval
  const handleMarkCompleted = useCallback(async (program, reportFile) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }

    try {
      let effectiveFile = reportFile;
      if (!effectiveFile && typeof document !== 'undefined') {
        const input = document.querySelector('input[data-post-act-input="true"]');
        if (input && input.files && input.files[0]) {
          effectiveFile = input.files[0];
        }
      }

      if (!effectiveFile) {
        setSuccessModal({
          isVisible: true,
          message: 'Please attach a Post Act Report file before submitting.',
          type: 'error'
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', effectiveFile);

      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${program.id}/post-act-report`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        // Don't set Content-Type - browser will set it with boundary for FormData
        body: formData
      });

      if (!response.ok) {
        let errorMessage;
        try {
          const errorData = await response.json();
          // Check for both 'message' and 'error' fields in error response
          errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
        } catch (parseError) {
          // If response is not JSON, use status-based error message
          const errorInfo = handleApiError({ status: response.status }, 'program_post_act_report', {
            redirectOnAuth: true,
            logError: true
          });
          errorMessage = errorInfo.message;
        }
        throw new Error(errorMessage);
      }

      // Optimistically update UI to reflect pending state to avoid duplicate submissions
      refreshPrograms((currentData) => {
        if (!currentData?.success || !Array.isArray(currentData.data)) return currentData;
        const updated = currentData.data.map(p => (
          p.id === program.id ? { ...p, has_pending_post_act_report: true } : p
        ));
        return { ...currentData, data: updated };
      }, { revalidate: true });

      setSuccessModal({
        isVisible: true,
        message: 'Post Act Report submitted for superadmin approval. Program will be marked Completed after approval.',
        type: 'success'
      });
      // Revalidation already requested above
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_post_act_report', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  // Handle mark program as active
  const handleMarkActive = useCallback(async (program) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }

    // Store the original data for potential rollback
    let originalData = null;
    
    try {
      // Optimistically update the UI immediately
      refreshPrograms((currentData) => {
        if (!currentData?.success || !Array.isArray(currentData.data)) {
          return currentData;
        }
        
        // Store original data for potential rollback
        originalData = currentData;
        
        // Update the program status to Active with manual override flag
        const updatedPrograms = currentData.data.map(p => 
          p.id === program.id ? { ...p, status: 'Active', manual_status_override: true } : p
        );
        
        return {
          ...currentData,
          data: updatedPrograms
        };
      }, { revalidate: false });

      // Make the API call
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${program.id}/mark-active`, {
        method: 'PUT',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_mark_active', {
          redirectOnAuth: true,
          logError: true
        });
        const errorData = await response.json().catch(() => ({ message: errorInfo.message }));
        throw new Error(errorData.message || errorInfo.message);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program marked as active successfully!', 
        type: 'success' 
      });
      
      // Force immediate revalidation to ensure data consistency with server
      refreshPrograms(undefined, { revalidate: true });
    } catch (error) {
      // Revert optimistic update on error by revalidating from server
      if (originalData) {
        refreshPrograms(originalData, { revalidate: false });
      }
      refreshPrograms(undefined, { revalidate: true });
      
      const errorInfo = handleApiError(error, 'program_mark_active', {
        redirectOnAuth: true,
        logError: true
      });
      
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message || `Failed to mark program as active: ${error.message}`, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  // Confirm program deletion
  const confirmDeleteProgram = useCallback(async (deletingProgram) => {
    if (!deletingProgram) return;
    
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setIsDeleting(false);
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }
    
    setIsDeleting(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${deletingProgram.id}`, {
        method: 'DELETE',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_delete', {
          redirectOnAuth: true,
          logError: true
        });
        throw new Error(errorInfo.message || 'Failed to delete program');
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program deleted successfully!', 
        type: 'success' 
      });
      
      // Clear the deleting program state to close the confirmation modal
      if (clearDeletingProgram) {
        clearDeletingProgram();
      }
      
      refreshPrograms();
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_delete', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
      // Clear the deleting program state even on error to close the confirmation modal
      if (clearDeletingProgram) {
        clearDeletingProgram();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [refreshPrograms, setSuccessModal, clearDeletingProgram]);

  // Handle toggle volunteer acceptance
  const handleToggleVolunteerAcceptance = useCallback(async (program, acceptsVolunteers) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }

    try {
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${program.id}/toggle-volunteers`, {
        method: 'PUT',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
          // No Authorization header needed - httpOnly cookies handle authentication
        },
        body: JSON.stringify({ accepts_volunteers: acceptsVolunteers }),
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_toggle_volunteers', {
          redirectOnAuth: true,
          logError: true
        });
        const errorData = await response.json().catch(() => ({ message: errorInfo.message }));
        throw new Error(errorData.message || errorInfo.message);
      }

      const result = await response.json();
      
      setSuccessModal({ 
        isVisible: true, 
        message: result.message || `Program is now ${acceptsVolunteers ? 'accepting' : 'not accepting'} volunteer applications`, 
        type: 'success' 
      });
      
      refreshPrograms();
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_toggle_volunteers', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  // Handle program archiving
  const handleArchiveProgram = useCallback(async (programId) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${programId}/archive`, {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_archive', {
          redirectOnAuth: true,
          logError: true
        });
        const errorData = await response.json().catch(() => ({ message: errorInfo.message }));
        throw new Error(errorData.message || errorInfo.message);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program archived successfully!', 
        type: 'success' 
      });
      
      refreshPrograms();
      
      // Close the modal by clearing the archiving program
      if (clearArchivingProgram) {
        clearArchivingProgram();
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_archive', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
      // Close the modal on error as well
      if (clearArchivingProgram) {
        clearArchivingProgram();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [refreshPrograms, setSuccessModal, clearArchivingProgram]);

  // Handle program unarchiving
  const handleUnarchiveProgram = useCallback(async (programId) => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') {
      setSuccessModal({ 
        isVisible: true, 
        message: 'Cannot perform this action on server side.', 
        type: 'error' 
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL || ''}/api/admin/programs/${programId}/unarchive`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorInfo = handleApiError({ status: response.status }, 'program_unarchive', {
          redirectOnAuth: true,
          logError: true
        });
        const errorData = await response.json().catch(() => ({ message: errorInfo.message }));
        throw new Error(errorData.message || errorInfo.message);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program unarchived successfully!', 
        type: 'success' 
      });
      
      refreshPrograms();
      
      // Close the modal by clearing the unarchiving program
      if (clearUnarchivingProgram) {
        clearUnarchivingProgram();
      }
    } catch (error) {
      const errorInfo = handleApiError(error, 'program_unarchive', {
        redirectOnAuth: true,
        logError: true
      });
      setSuccessModal({ 
        isVisible: true, 
        message: errorInfo.message, 
        type: 'error' 
      });
      // Close the modal on error as well
      if (clearUnarchivingProgram) {
        clearUnarchivingProgram();
      }
    } finally {
      setIsDeleting(false);
    }
  }, [refreshPrograms, setSuccessModal, clearUnarchivingProgram]);

  return {
    isSubmitting,
    isDeleting,
    handleSubmitProgram,
    handleUpdateProgram,
    handleMarkCompleted,
    handleMarkActive,
    handleToggleVolunteerAcceptance,
    confirmDeleteProgram,
    handleArchiveProgram,
    handleUnarchiveProgram
  };
};
