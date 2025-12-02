import { API_CONFIG } from '@/utils/admin/constants';
import { makeAdminRequest } from '@/utils/admin/apiClient';

// Fetch available admins for collaboration
export const fetchAvailableAdmins = async (isEditMode = false, programId = null) => {
  try {
    const endpoint = isEditMode && programId
      ? `${API_CONFIG.BASE_URL || ''}/api/collaborations/programs/${programId}/available-admins`
      : `${API_CONFIG.BASE_URL || ''}/api/collaborations/available-admins`;
        
    // Use centralized API client with automatic token refresh
    const response = await makeAdminRequest(
      endpoint,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      },
      null // No router available in service
    );

    if (!response || !response.ok) {
      throw new Error(`HTTP ${response?.status || 500}: ${response?.statusText || 'Request failed'}`);
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
  try {
    // Use centralized API client with automatic token refresh
    const response = await makeAdminRequest(
      `${API_CONFIG.BASE_URL || ''}/api/collaborations/programs/${programId}/invite-collaborator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ collaboratorAdminId })
      },
      null // No router available in service
    );

    if (!response || !response.ok) {
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
  try {
    // Use centralized API client with automatic token refresh
    const response = await makeAdminRequest(
      `${API_CONFIG.BASE_URL || ''}/api/collaborations/programs/${programId}/collaborators`,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      },
      null // No router available in service
    );

    if (!response || !response.ok) {
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
  try {
    // Use centralized API client with automatic token refresh
    const response = await makeAdminRequest(
      `${API_CONFIG.BASE_URL || ''}/api/collaborations/programs/${programId}/collaborators/${adminId}`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      },
      null // No router available in service
    );

    if (!response || !response.ok) {
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
  try {
    // Use centralized API client with automatic token refresh
    const response = await makeAdminRequest(
      `${API_CONFIG.BASE_URL || ''}/api/collaborations/collaborations/${collaborationId}/opt-out`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        }
      },
      null // No router available in service
    );

    if (!response || !response.ok) {
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