import { useCallback } from 'react';

export const useCollaborationManagement = (
  acceptCollaboration,
  declineCollaboration,
  fetchCollaborations,
  refreshPrograms,
  setSuccessModal
) => {
  // Handle opt-out callback - refresh both programs and collaborators
  const handleOptOut = useCallback(async (programIdToRemove, refreshCollaboratorsFn, pageMode) => {
    // If a specific program ID is provided, optimistically remove it from the cache
    if (programIdToRemove) {
      try {
        // Optimistically update the SWR cache to remove the program immediately
        refreshPrograms((currentData) => {
          if (!currentData?.success || !Array.isArray(currentData.data)) {
            return currentData;
          }
          
          // Remove the program with the specified ID
          const updatedPrograms = currentData.data.filter(program => program.id !== programIdToRemove);
          
          return {
            ...currentData,
            data: updatedPrograms
          };
        }, { revalidate: false }); // Don't revalidate immediately, we'll do it after the API call
      } catch (error) {
        // Failed to optimistically remove program
      }
    } else {
      // Full refresh of the programs list
      await refreshPrograms();
    }
    
    // Always refresh collaborations list after opt-out to ensure UI consistency
    try {
      await fetchCollaborations();
    } catch (error) {
      // Handle error silently in production
    }
    
    // If we're in edit mode and have a refresh function, also refresh collaborators
    if (pageMode === 'edit' && refreshCollaboratorsFn) {
      try {
        await refreshCollaboratorsFn();
      } catch (error) {
        // Handle error silently in production
      }
    }
  }, [refreshPrograms, fetchCollaborations]);

  // Handle collaboration action (accept/decline)
  const handleCollaborationAction = useCallback(async (collaborationId, action) => {
    if (!collaborationId) {
      setSuccessModal({
        isVisible: true,
        message: 'Collaboration ID is missing. Please refresh the page and try again.',
        type: 'error'
      });
      return;
    }
    
    try {
      let result;
      if (action === 'accept') {
        result = await acceptCollaboration(collaborationId);
      } else if (action === 'decline') {
        result = await declineCollaboration(collaborationId);
      }
      
      let message = result?.message || `Collaboration request ${action}ed successfully!`;
      
      // Add specific message for acceptance
      if (action === 'accept') {
        message = 'Collaboration request accepted! The program will be created once all collaborators accept.';
      } else if (action === 'decline') {
        message = 'Collaboration request declined. The program will not be created if no collaborators accept.';
      }
      
      setSuccessModal({
        isVisible: true,
        message: message,
        type: 'success'
      });

      // Refresh collaboration data
      await fetchCollaborations();
      
      // Also refresh programs data to update program statuses
      await refreshPrograms();
    } catch (error) {
      setSuccessModal({
        isVisible: true,
        message: `Failed to ${action} collaboration request: ${error.message}`,
        type: 'error'
      });
    }
  }, [acceptCollaboration, declineCollaboration, fetchCollaborations, refreshPrograms, setSuccessModal]);

  return {
    handleOptOut,
    handleCollaborationAction
  };
};
