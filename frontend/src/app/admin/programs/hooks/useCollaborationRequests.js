import { useState, useEffect, useCallback } from 'react';

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

// Fetch collaboration requests
const fetchCollaborationRequests = async () => {
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/collaboration-requests`, {
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/accept`, {
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
  try {
    const token = getAdminToken();
    if (!token) {
      throw new Error('No admin token found. Please log in again.');
    }

    const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/decline`, {
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
