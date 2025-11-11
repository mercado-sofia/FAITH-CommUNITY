import { useState, useEffect, useCallback } from 'react';
import { getAdminTokenOrRedirect, API_CONFIG } from '../../utils';

// Fetch collaboration requests
const fetchCollaborationRequests = async () => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    return []; // Redirect handled by getAdminTokenOrRedirect
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/collaboration-requests`, {
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
    throw error;
  }
};

// Accept collaboration request
const acceptCollaborationRequest = async (collaborationId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/collaborations/${collaborationId}/accept`, {
      method: 'PUT',
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
    return result;
  } catch (error) {
    throw error;
  }
};

// Decline collaboration request
const declineCollaborationRequest = async (collaborationId) => {
  const token = getAdminTokenOrRedirect();
  if (!token) {
    throw new Error('Authentication required');
  }

  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/api/collaborations/collaborations/${collaborationId}/decline`, {
      method: 'PUT',
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
    return result;
  } catch (error) {
    throw error;
  }
};

export const useCollaborationRequests = () => {
  const [collaborations, setCollaborations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch collaborations
  const fetchCollaborations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchCollaborationRequests();
      setCollaborations(data);
    } catch (err) {
      setError(err);
      setCollaborations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Accept collaboration
  const acceptCollaboration = useCallback(async (collaborationId) => {
    try {
      const result = await acceptCollaborationRequest(collaborationId);
      // Refresh collaborations after accepting
      await fetchCollaborations();
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchCollaborations]);

  // Decline collaboration
  const declineCollaboration = useCallback(async (collaborationId) => {
    try {
      const result = await declineCollaborationRequest(collaborationId);
      // Refresh collaborations after declining
      await fetchCollaborations();
      return result;
    } catch (error) {
      throw error;
    }
  }, [fetchCollaborations]);

  // Load collaborations on mount
  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  return {
    collaborations,
    isLoading,
    error,
    fetchCollaborations,
    acceptCollaboration,
    declineCollaboration
  };
};
