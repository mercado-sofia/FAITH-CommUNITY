import { useState, useCallback } from 'react';
import { optOutCollaboration } from '../services/collaborationService';

export const useProgramActions = ({
  normalizedData,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkActive,
  onOptOut,
  onShowSuccessModal,
  onToggleVolunteerAcceptance,
  onAcceptCollaboration,
  onDeclineCollaboration,
  isCollaborationCard
}) => {
  // State for loading states
  const [isDeleting, setIsDeleting] = useState(false);
  const [isOptingOut, setIsOptingOut] = useState(false);
  const [isAcceptingCollaboration, setIsAcceptingCollaboration] = useState(false);
  const [isDecliningCollaboration, setIsDecliningCollaboration] = useState(false);
  const [isMarkingCompleted, setIsMarkingCompleted] = useState(false);

  // State for modals
  const [showMarkCompletedModal, setShowMarkCompletedModal] = useState(false);
  const [postActReportFile, setPostActReportFile] = useState(null);
  const [showMarkActiveModal, setShowMarkActiveModal] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [showVolunteerAcceptanceModal, setShowVolunteerAcceptanceModal] = useState(false);
  const [showAcceptCollaborationModal, setShowAcceptCollaborationModal] = useState(false);
  const [showDeclineCollaborationModal, setShowDeclineCollaborationModal] = useState(false);
  const [pendingVolunteerAction, setPendingVolunteerAction] = useState(null);

  // Delete handler
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
    }
  }, [onDelete]);

  // Mark as completed handlers
  const handleMarkCompletedClick = useCallback(() => {
    setShowMarkCompletedModal(true);
  }, []);

  const confirmMarkCompleted = useCallback(async () => {
    if (isMarkingCompleted) return; // Prevent duplicate submissions
    
    setIsMarkingCompleted(true);
    try {
      await onMarkCompleted(normalizedData, postActReportFile);
      setShowMarkCompletedModal(false);
      setPostActReportFile(null);
      // Clear file input if it exists
      if (typeof document !== 'undefined') {
        const input = document.querySelector('input[data-post-act-input="true"]');
        if (input) {
          input.value = '';
        }
      }
    } catch (error) {
      // Keep modal open on error so user can retry
    } finally {
      setIsMarkingCompleted(false);
    }
  }, [onMarkCompleted, normalizedData, postActReportFile, isMarkingCompleted]);

  const cancelMarkCompleted = useCallback(() => {
    setShowMarkCompletedModal(false);
    setPostActReportFile(null);
    // Clear file input if it exists
    if (typeof document !== 'undefined') {
      const input = document.querySelector('input[data-post-act-input="true"]');
      if (input) {
        input.value = '';
      }
    }
  }, []);

  // Mark as active handlers
  const handleMarkActiveClick = useCallback(() => {
    setShowMarkActiveModal(true);
  }, []);

  const confirmMarkActive = useCallback(async () => {
    try {
      await onMarkActive(normalizedData);
      setShowMarkActiveModal(false);
    } catch (error) {
      // Keep modal open on error so user can retry
    }
  }, [onMarkActive, normalizedData]);

  const cancelMarkActive = useCallback(() => {
    setShowMarkActiveModal(false);
  }, []);

  // Opt out handlers
  const handleOptOutClick = useCallback(() => {
    setShowOptOutModal(true);
  }, []);

  const confirmOptOut = useCallback(async () => {
    setIsOptingOut(true);
    try {
      // Use the collaboration_id from the normalized data
      if (normalizedData.collaboration_id) {
        // Optimistically remove the program from the list immediately
        if (onOptOut) {
          onOptOut(normalizedData.id); // Pass the program ID for immediate removal
        }
        
        // Close the opt-out confirmation modal immediately
        setShowOptOutModal(false);
        
        // Show success modal
        if (onShowSuccessModal) {
          onShowSuccessModal({
            isVisible: true,
            message: `You have successfully opted out of "${normalizedData.title}". The program will no longer appear in your programs list.`,
            type: 'success'
          });
        }
        
        // Make the API call to opt out
        await optOutCollaboration(normalizedData.collaboration_id);
        
        // Refresh the programs list to ensure consistency
        if (onOptOut) {
          onOptOut(); // Call without ID to trigger full refresh
        }
      }
    } catch (error) {
      // Show error modal
      if (onShowSuccessModal) {
        onShowSuccessModal({
          isVisible: true,
          message: `Failed to opt out of "${normalizedData.title}". Please try again.`,
          type: 'error'
        });
      }
      
      setShowOptOutModal(false);
      
      // Refresh the programs list to restore the program if opt-out failed
      if (onOptOut) {
        onOptOut(); // Call without ID to trigger full refresh
      }
    } finally {
      setIsOptingOut(false);
    }
  }, [normalizedData, onShowSuccessModal, onOptOut]);

  const cancelOptOut = useCallback(() => {
    setShowOptOutModal(false);
  }, []);

  // Volunteer acceptance handlers
  const handleVolunteerAcceptanceClick = useCallback((acceptsVolunteers) => {
    setPendingVolunteerAction(acceptsVolunteers);
    setShowVolunteerAcceptanceModal(true);
  }, []);

  const confirmVolunteerAcceptance = useCallback(async () => {
    try {
      await onToggleVolunteerAcceptance(normalizedData, pendingVolunteerAction);
      setShowVolunteerAcceptanceModal(false);
      setPendingVolunteerAction(null);
    } catch (error) {
      // Handle error silently in production
    }
  }, [onToggleVolunteerAcceptance, normalizedData, pendingVolunteerAction]);

  const cancelVolunteerAcceptance = useCallback(() => {
    setShowVolunteerAcceptanceModal(false);
    setPendingVolunteerAction(null);
  }, []);

  // Collaboration handlers
  const handleAcceptCollaborationClick = useCallback(() => {
    setShowAcceptCollaborationModal(true);
  }, []);

  const handleDeclineCollaborationClick = useCallback(() => {
    setShowDeclineCollaborationModal(true);
  }, []);

  const confirmAcceptCollaboration = useCallback(async () => {
    if (!onAcceptCollaboration || !normalizedData.collaboration_id) return;
    
    setIsAcceptingCollaboration(true);
    try {
      await onAcceptCollaboration(normalizedData.collaboration_id);
      setShowAcceptCollaborationModal(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsAcceptingCollaboration(false);
    }
  }, [onAcceptCollaboration, normalizedData.collaboration_id]);

  const confirmDeclineCollaboration = useCallback(async () => {
    if (!onDeclineCollaboration || !normalizedData.collaboration_id) return;
    
    setIsDecliningCollaboration(true);
    try {
      await onDeclineCollaboration(normalizedData.collaboration_id);
      setShowDeclineCollaborationModal(false);
    } catch (error) {
      // Error handling is done in the parent component
    } finally {
      setIsDecliningCollaboration(false);
    }
  }, [onDeclineCollaboration, normalizedData.collaboration_id]);

  const cancelAcceptCollaboration = useCallback(() => {
    setShowAcceptCollaborationModal(false);
  }, []);

  const cancelDeclineCollaboration = useCallback(() => {
    setShowDeclineCollaborationModal(false);
  }, []);

  return {
    // Loading states
    isDeleting,
    isOptingOut,
    isAcceptingCollaboration,
    isDecliningCollaboration,
    isMarkingCompleted,
    
    // Modal states
    showMarkCompletedModal,
    postActReportFile,
    showMarkActiveModal,
    showOptOutModal,
    showVolunteerAcceptanceModal,
    showAcceptCollaborationModal,
    showDeclineCollaborationModal,
    pendingVolunteerAction,
    
    // Action handlers
    handleDelete,
    handleMarkCompletedClick,
    handleMarkActiveClick,
    handleOptOutClick,
    handleVolunteerAcceptanceClick,
    handleAcceptCollaborationClick,
    handleDeclineCollaborationClick,
    
    // Confirmation handlers
    confirmMarkCompleted,
    confirmMarkActive,
    confirmOptOut,
    confirmVolunteerAcceptance,
    confirmAcceptCollaboration,
    confirmDeclineCollaboration,
    
    // Cancel handlers
    cancelMarkCompleted,
    setPostActReportFile,
    cancelMarkActive,
    cancelOptOut,
    cancelVolunteerAcceptance,
    cancelAcceptCollaboration,
    cancelDeclineCollaboration
  };
};
