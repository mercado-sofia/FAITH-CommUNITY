const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// Get admin token from localStorage
const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('adminToken');
  } catch (error) {
    console.error('Failed to access localStorage', error);
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

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching available admins:', error);
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error adding collaborator:', error);
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
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error('Error fetching program collaborators:', error);
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
      const errorData = await response.json().catch(() => ({}));
      console.error('Remove collaborator error response:', {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error removing collaborator:', error);
    throw error;
  }
};