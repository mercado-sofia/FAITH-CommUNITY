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
export const getWorkflowStage = (status, requestType, programStatus, programTitle = '', isApproved = false) => {
  const effectiveStatus = getEffectiveStatus(status, programStatus, isApproved);
  
  if (requestType === 'received') {
    switch (effectiveStatus) {
      case 'pending':
        return 'Step 2: Your Response Required';
      case 'accepted':
        return 'Step 2: ✅ Accepted - Program is now collaborative';
      case 'declined':
        return 'Step 2: ❌ Declined - Program remains solo';
      case 'approved':
        return 'Step 3: ✅ Approved - Program Live';
      default:
        return 'Step 2: Collaboration Review';
    }
  } else {
    switch (effectiveStatus) {
      case 'pending':
        return 'Step 2: Waiting for Collaborator Response';
      case 'accepted':
        return 'Step 2: ✅ Collaborator Accepted - Program is now collaborative';
      case 'declined':
        return 'Step 2: ❌ Declined - Program remains solo';
      case 'approved':
        return 'Step 3: ✅ Approved - Program Live';
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
    'accepted',
    'declined',
    'pending'
  ];
  return collaborativeStatuses.includes(status?.toLowerCase());
};

// Get effective status for filtering and display
export const getEffectiveStatus = (collaborationStatus, programStatus, isApproved = false) => {
  // If program is approved, it's live regardless of collaboration status
  if (isApproved) {
    return 'approved';
  }
  
  // If program is not approved, check collaboration status
  if (collaborationStatus === 'accepted') {
    return 'accepted';
  } else if (collaborationStatus === 'declined') {
    return 'declined';
  } else {
    return 'pending';
  }
};

// Centralized utility to get collaboration status from any collaborator object
export const getCollaborationStatus = (collab) => {
  if (!collab || typeof collab !== 'object') {
    return null;
  }
  return collab.collaboration_status || collab.status || null;
};

// Check if a collaborator is active (not declined)
export const isActiveCollaborator = (collab) => {
  const status = getCollaborationStatus(collab);
  return status !== 'declined';
};

// Get active collaborators from an array
export const getActiveCollaborators = (collaborators) => {
  if (!Array.isArray(collaborators)) {
    return [];
  }
  return collaborators.filter(isActiveCollaborator);
};

// Check if program has any active collaborations
export const hasActiveCollaborations = (program) => {
  if (!program || !program.collaborators || !Array.isArray(program.collaborators)) {
    return false;
  }
  return program.collaborators.some(isActiveCollaborator);
};
