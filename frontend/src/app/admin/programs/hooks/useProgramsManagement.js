import { useState, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const useProgramsManagement = (currentAdmin, refreshPrograms, setSuccessModal, resetPageMode, clearDeletingProgram) => {
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
      
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
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
      
      // Add dates if provided
      if (programData.event_start_date) {
        formData.append('event_start_date', programData.event_start_date);
      }
      if (programData.event_end_date) {
        formData.append('event_end_date', programData.event_end_date);
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
          
          const imageResponse = await fetch(`${API_BASE_URL}/api/upload?type=program`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
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
      
      // Submit through the submissions system
      const submissionData = {
        submissions: [{
          organization_id: currentAdmin.org,
          section: 'programs',
          previous_data: {}, // No previous data for new programs
          proposed_data: {
            title: programData.title.trim(),
            description: programData.description.trim(),
            category: programData.category.trim(),
            event_start_date: programData.event_start_date || null,
            event_end_date: programData.event_end_date || null,
            multiple_dates: programData.multiple_dates || null,
            status: programData.status || 'pending',
            collaborators: programData.collaborators || [],
            image: imageUrl, // Use uploaded image URL
            additionalImages: programData.additionalImages || []
          },
          submitted_by: currentAdmin.id
        }]
      };
      
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(submissionData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to submit program: ${response.status} ${errorText}`);
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
        const submissionsKey = `${API_BASE_URL}/api/submissions/${currentAdmin.org}`;
        window.swrCache.delete(submissionsKey);
      }
      
      // Reset page mode to list after successful submission
      if (resetPageMode) {
        resetPageMode();
      }
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to submit program: ${error.message}`, 
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

      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
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
          
          const imageResponse = await fetch(`${API_BASE_URL}/api/upload?type=program`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
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

      // Prepare the data for the update request
      const updateData = {
        title: programData.title?.trim() || '',
        description: programData.description?.trim() || '',
        category: programData.category?.trim() || '',
        event_start_date: programData.event_start_date || null,
        event_end_date: programData.event_end_date || null,
        multiple_dates: programData.multiple_dates || null,
        status: programData.status || 'active',
        accepts_volunteers: programData.accepts_volunteers !== undefined ? programData.accepts_volunteers : true,
        // Extract collaborator IDs from collaborator objects
        collaborators: Array.isArray(programData.collaborators) 
          ? programData.collaborators.map(collab => collab.id).filter(id => id && typeof id === 'number')
          : [],
        // Handle image properly - use uploaded URL, base64 string, or undefined to keep existing
        image: imageUrl || programData.image,
        additionalImages: programData.additionalImages || []
      };

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${editingProgram.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update program`);
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
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to update program: ${error.message}`, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal, resetPageMode]);

  // Handle mark program as completed
  const handleMarkCompleted = useCallback(async (program) => {
    try {
      // Optimistically update the UI immediately
      refreshPrograms((currentData) => {
        if (!currentData?.success || !Array.isArray(currentData.data)) {
          return currentData;
        }
        
        // Update the program status to Completed
        const updatedPrograms = currentData.data.map(p => 
          p.id === program.id ? { ...p, status: 'Completed' } : p
        );
        
        return {
          ...currentData,
          data: updatedPrograms
        };
      }, { revalidate: false });

      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${program.id}/mark-completed`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark program as completed`);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program marked as completed successfully!', 
        type: 'success' 
      });
      // Force immediate revalidation to ensure data consistency
      refreshPrograms(undefined, { revalidate: true });
    } catch (error) {
      // Revert optimistic update on error
      refreshPrograms(undefined, { revalidate: true });
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to mark program as completed: ${error.message}`, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  // Handle mark program as active
  const handleMarkActive = useCallback(async (program) => {
    try {
      // Optimistically update the UI immediately
      refreshPrograms((currentData) => {
        if (!currentData?.success || !Array.isArray(currentData.data)) {
          return currentData;
        }
        
        // Update the program status to Active
        const updatedPrograms = currentData.data.map(p => 
          p.id === program.id ? { ...p, status: 'Active' } : p
        );
        
        return {
          ...currentData,
          data: updatedPrograms
        };
      }, { revalidate: false });

      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${program.id}/mark-active`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to mark program as active`);
      }

      setSuccessModal({ 
        isVisible: true, 
        message: 'Program marked as active successfully!', 
        type: 'success' 
      });
      // Force immediate revalidation to ensure data consistency
      refreshPrograms(undefined, { revalidate: true });
    } catch (error) {
      // Revert optimistic update on error
      refreshPrograms(undefined, { revalidate: true });
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to mark program as active: ${error.message}`, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  // Confirm program deletion
  const confirmDeleteProgram = useCallback(async (deletingProgram) => {
    if (!deletingProgram) return;
    
    setIsDeleting(true);
    try {
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${deletingProgram.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete program');
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
      setSuccessModal({ 
        isVisible: true, 
        message: 'Failed to delete program. Please try again.', 
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
    try {
      // Get admin token for authentication
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setSuccessModal({ 
          isVisible: true, 
          message: 'Authentication token not found. Please log in again.', 
          type: 'error' 
        });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/admin/programs/${program.id}/toggle-volunteers`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ accepts_volunteers: acceptsVolunteers }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP ${response.status}: Failed to update volunteer acceptance`);
      }

      const result = await response.json();
      
      setSuccessModal({ 
        isVisible: true, 
        message: result.message || `Program is now ${acceptsVolunteers ? 'accepting' : 'not accepting'} volunteer applications`, 
        type: 'success' 
      });
      
      refreshPrograms();
    } catch (error) {
      setSuccessModal({ 
        isVisible: true, 
        message: `Failed to update volunteer acceptance: ${error.message}`, 
        type: 'error' 
      });
    }
  }, [refreshPrograms, setSuccessModal]);

  return {
    isSubmitting,
    isDeleting,
    handleSubmitProgram,
    handleUpdateProgram,
    handleMarkCompleted,
    handleMarkActive,
    handleToggleVolunteerAcceptance,
    confirmDeleteProgram
  };
};
