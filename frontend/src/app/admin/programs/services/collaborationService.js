const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Get admin token from localStorage
const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('adminToken');
  } catch (error) {
    return null;
  }
};

// Fetch available admins for collaboration
export const fetchAvailableAdmins = async (isEditMode = false, programId = null) => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const endpoint = isEditMode && programId
      ? `${API_BASE_URL}/api/collaborations/programs/${programId}/available-admins`
      : `${API_BASE_URL}/api/collaborations/available-admins`;
        
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${programId}/invite-collaborator`, {
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${programId}/collaborators`, {
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/programs/${programId}/collaborators/${adminId}`, {
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/opt-out`, {
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