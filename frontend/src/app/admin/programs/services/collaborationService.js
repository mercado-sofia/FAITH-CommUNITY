import { getAdminTokenOrRedirect, API_CONFIG } from '../../utils';

// Fetch available admins for collaboration
export const fetchAvailableAdmins = async (isEditMode = false, programId = null) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    return []; // Redirect handled by getAdminTokenOrRedirect
  }

  try {
    const endpoint = isEditMode && programId
      ? `${API_CONFIG.BASE_URL}/api/collaborations/programs/${programId}/available-admins`
      : `${API_CONFIG.BASE_URL}/api/collaborations/available-admins`;
        
    const response = await fetch(endpoint, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON with error handling
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Add collaborator to existing program
export const addCollaboratorToProgram = async (programId, collaboratorAdminId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/programs/${programId}/invite-collaborator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ collaboratorAdminId })
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, use empty object
        errorData = {};
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON with error handling
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }
    return result;
  } catch (error) {
    throw error;
  }
};

// Fetch existing collaborators for a program
export const fetchProgramCollaborators = async (programId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    return []; // Redirect handled by getAdminTokenOrRedirect
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/programs/${programId}/collaborators`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, use empty object
        errorData = {};
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON with error handling
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }
    return result.data || [];
  } catch (error) {
    throw error;
  }
};

// Remove collaborator from program
export const removeCollaboratorFromProgram = async (programId, adminId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/programs/${programId}/collaborators/${adminId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, use empty object
        errorData = {};
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON with error handling
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }
    return result;
  } catch (error) {
    throw error;
  }
};

// Opt out of collaboration (for collaborators)
export const optOutCollaboration = async (collaborationId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/collaborations/${collaborationId}/opt-out`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If JSON parsing fails, use empty object
        errorData = {};
      }
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    // Parse JSON with error handling
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      throw new Error('Invalid JSON response from server');
    }
    return result;
  } catch (error) {
    throw error;
  }
};