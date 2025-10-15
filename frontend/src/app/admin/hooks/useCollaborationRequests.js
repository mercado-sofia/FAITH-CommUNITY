import { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function useCollaborationRequests() {
  const [collaborations, setCollaborations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const token = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      const userRole = document.cookie.includes('userRole=admin');
      
      if (!token || !adminData || !userRole) {
        console.warn('Authentication check failed, redirecting to login');
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
        return false;
      }
      return true;
    };

    if (!checkAuth()) {
      return;
    }
  }, []);

  const fetchCollaborations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.warn('No adminToken found, redirecting to login');
        // Clear any invalid auth data and redirect to login
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        document.cookie = 'userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
        return [];
      }

      const response = await fetch(`${API_BASE_URL}/api/collaborations/collaboration-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error:', response.status, errorText);
        throw new Error(`Failed to fetch collaboration requests: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      console.log(`🔍 Frontend: Received collaborations data:`, result.data?.map(c => ({
        program_title: c.program_title,
        collaboration_id: c.collaboration_id,
        status: c.status,
        request_type: c.request_type
      })));
      
      setCollaborations(result.data || []);
      return result.data || [];
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const acceptCollaboration = useCallback(async (collaborationId) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.warn('No adminToken found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/accept`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to accept collaboration request');
      }

      const result = await response.json();
      // Note: fetchCollaborations will be called by the component after this
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [fetchCollaborations]);

  const declineCollaboration = useCallback(async (collaborationId) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        console.warn('No adminToken found, redirecting to login');
        window.location.href = '/login';
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/collaborations/collaborations/${collaborationId}/decline`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || 'Failed to decline collaboration request');
      }

      const result = await response.json();
      // Note: fetchCollaborations will be called by the component after this
      return result;
    } catch (error) {
      setError(error.message);
      throw error;
    }
  }, [fetchCollaborations]);

  useEffect(() => {
    fetchCollaborations();
  }, [fetchCollaborations]);

  return {
    collaborations,
    isLoading,
    error,
    fetchCollaborations,
    acceptCollaboration,
    declineCollaboration,
  };
}
