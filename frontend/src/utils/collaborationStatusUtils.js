/**
 * Centralized utility for handling collaboration program statuses
 * Ensures consistent status display across all admin interfaces
 */

// Status color mapping
export const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return '#f59e0b'; // Orange - waiting for collaborator response
    case 'accepted':
      return '#10b981'; // Green - collaborator accepted
    case 'declined':
      return '#ef4444'; // Red - collaborator declined
    case 'pending_collaboration':
      return '#3b82f6'; // Blue - waiting for collaborator responses
    case 'pending_superadmin_approval':
      return '#8b5cf6'; // Purple - waiting for superadmin approval
    case 'approved':
      return '#10b981'; // Green - fully approved
    case 'rejected':
      return '#ef4444'; // Red - rejected by superadmin
    case 'completed':
      return '#10b981'; // Green - completed (same as approved)
    default:
      return '#6b7280'; // Gray - unknown status
  }
};

// Status display text mapping
export const getStatusDisplayText = (status) => {
  switch (status?.toLowerCase()) {
    case 'pending':
      return 'Pending';
    case 'accepted':
      return 'Accepted';
    case 'declined':
      return 'Declined';
    case 'pending_collaboration':
      return 'Pending Collaboration';
    case 'pending_superadmin_approval':
      return 'Pending Superadmin Approval';
    case 'approved':
      return 'Approved';
    case 'rejected':
      return 'Rejected';
    case 'completed':
      return 'Completed';
    default:
      return status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
  }
};

// Workflow stage mapping for collaboration cards
export const getWorkflowStage = (status, requestType, programStatus, programTitle = '') => {
  // Determine effective status (prioritize program status over collaboration status)
  const getEffectiveStatus = (collaborationStatus, programStatus) => {
    // Handle empty or null program status
    if (!programStatus || programStatus === '' || programStatus === null) {
      return collaborationStatus || 'pending';
    }
    
    // If program has a final status (approved/rejected/completed), use that
    if (programStatus === 'approved' || programStatus === 'rejected' || programStatus === 'Completed') {
      return programStatus === 'Completed' ? 'approved' : programStatus;
    }
    
    // If program is pending superadmin approval, use that
    if (programStatus === 'pending_superadmin_approval') {
      return programStatus;
    }
    
    // If program is pending collaboration, use that
    if (programStatus === 'pending_collaboration') {
      return programStatus;
    }
    
    // If program is declined, use that
    if (programStatus === 'declined') {
      return programStatus;
    }
    
    // Otherwise, use the collaboration status
    return collaborationStatus || 'pending';
  };

  const effectiveStatus = getEffectiveStatus(status, programStatus);
  
  // If we still don't have a proper program status, try to infer it from the collaboration status
  if (!programStatus || programStatus === '') {
    // If collaboration is accepted and we're in a sent request, it might be approved
    if (status === 'accepted' && requestType === 'sent') {
      return 'Step 4: ✅ Approved - Program Live';
    }
    
    // For all programs: if collaboration is accepted and we have no program status, 
    // check if this might be an approved program that needs status inference
    if (status === 'accepted') {
      console.log(`🔍 Status inference: Program "${programTitle}" with accepted status, checking if approved`);
      // This will be handled by the effective status calculation below
    }
  }
  
  if (requestType === 'received') {
    switch (effectiveStatus) {
      case 'pending':
      case 'pending_collaboration':
        return 'Step 2: Your Response Required';
      case 'accepted':
        return 'Step 2: ✅ Accepted - Waiting for Other Collaborators';
      case 'pending_superadmin_approval':
        return 'Step 3: ✅ Accepted - Sent to Superadmin';
      case 'declined':
        return 'Step 2: ❌ Declined - Program Stopped';
      case 'approved':
        return 'Step 4: ✅ Approved - Program Live';
      case 'rejected':
        return 'Step 4: ❌ Rejected by Superadmin';
      default:
        return 'Step 2: Collaboration Review';
    }
  } else {
    switch (effectiveStatus) {
      case 'pending':
      case 'pending_collaboration':
        return 'Step 2: Waiting for Collaborator Response';
      case 'accepted':
        return 'Step 2: ✅ Collaborator Accepted - Waiting for Others';
      case 'pending_superadmin_approval':
        return 'Step 3: Waiting for Superadmin Approval';
      case 'declined':
        return 'Step 2: ❌ Declined - Program Stopped';
      case 'approved':
        return 'Step 4: ✅ Approved - Program Live';
      case 'rejected':
        return 'Step 4: ❌ Rejected by Superadmin';
      default:
        return 'Step 1: Program Submitted';
    }
  }
};

// Status badge configuration for different UI contexts
export const getStatusBadgeConfig = (status) => {
  const statusConfig = {
    'pending': { 
      text: 'Pending', 
      className: 'statusPending',
      color: '#f59e0b'
    },
    'accepted': { 
      text: 'Accepted', 
      className: 'statusAccepted',
      color: '#10b981'
    },
    'declined': { 
      text: 'Declined', 
      className: 'statusDeclined',
      color: '#ef4444'
    },
    'pending_collaboration': { 
      text: 'Pending Collaboration', 
      className: 'statusPending',
      color: '#3b82f6'
    },
    'pending_superadmin_approval': { 
      text: 'Pending Approval', 
      className: 'statusPending',
      color: '#8b5cf6'
    },
    'approved': { 
      text: 'Approved', 
      className: 'statusApproved',
      color: '#10b981'
    },
    'rejected': { 
      text: 'Rejected', 
      className: 'statusRejected',
      color: '#ef4444'
    },
    'completed': { 
      text: 'Completed', 
      className: 'statusApproved',
      color: '#10b981'
    }
  };
  
  return statusConfig[status?.toLowerCase()] || statusConfig['pending'];
};

// Check if status is a collaborative program status
export const isCollaborativeStatus = (status) => {
  const collaborativeStatuses = [
    'pending_collaboration',
    'accepted',
    'pending_superadmin_approval',
    'declined'
  ];
  return collaborativeStatuses.includes(status?.toLowerCase());
};

// Get effective status for filtering and display
export const getEffectiveStatus = (collaborationStatus, programStatus) => {
  // Handle empty or null program status
  if (!programStatus || programStatus === '' || programStatus === null) {
    // If collaboration is accepted and we have no program status, 
    // this might indicate the program is approved but status wasn't properly set
    if (collaborationStatus === 'accepted') {
      console.log('🔍 Status inference: accepted collaboration with no program status, assuming approved');
      return 'approved';
    }
    return collaborationStatus || 'pending';
  }
  
  // If program has a final status (approved/rejected/completed), use that
  if (programStatus === 'approved' || programStatus === 'rejected' || programStatus === 'Completed') {
    return programStatus === 'Completed' ? 'approved' : programStatus;
  }
  
  // If program is pending superadmin approval, use that
  if (programStatus === 'pending_superadmin_approval') {
    return programStatus;
  }
  
  // If program is pending collaboration, use that
  if (programStatus === 'pending_collaboration') {
    return programStatus;
  }
  
  // If program is declined, use that
  if (programStatus === 'declined') {
    return programStatus;
  }
  
  // Otherwise, use the collaboration status
  return collaborationStatus || 'pending';
};
