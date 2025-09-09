import { useState, useCallback, useRef } from 'react';
import { getApiUrl, getAuthHeaders, getAuthHeadersWithFormData } from '../utils/api';

export const useApiCall = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const abortControllerRef = useRef(null);

  const makeApiCall = useCallback(async (endpoint, options = {}) => {
    // Cancel previous request if it exists
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError('');

    try {
      const defaultOptions = {
        signal: abortControllerRef.current.signal,
        ...options
      };

      const response = await fetch(getApiUrl(endpoint), defaultOptions);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return { data, response };
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, don't set error
        return null;
      }
      
      const errorMessage = err.message || 'An error occurred while making the request';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  const cleanup = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return {
    isLoading,
    error,
    makeApiCall,
    cancelRequest,
    cleanup
  };
};

// Specialized hook for profile operations
export const useProfileApi = () => {
  const { makeApiCall, isLoading, error } = useApiCall();

  const updateProfile = useCallback(async (profileData) => {
    return makeApiCall('/api/users/profile', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(profileData)
    });
  }, [makeApiCall]);

  const uploadProfilePhoto = useCallback(async (photoFile) => {
    const formData = new FormData();
    formData.append('profilePhoto', photoFile);
    
    return makeApiCall('/api/users/profile/photo', {
      method: 'POST',
      headers: getAuthHeadersWithFormData(),
      body: formData
    });
  }, [makeApiCall]);

  const removeProfilePhoto = useCallback(async () => {
    return makeApiCall('/api/users/profile/photo', {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
  }, [makeApiCall]);

  const changeEmail = useCallback(async (emailData) => {
    return makeApiCall('/api/users/email', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailData)
    });
  }, [makeApiCall]);

  const changePassword = useCallback(async (passwordData) => {
    return makeApiCall('/api/users/password', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(passwordData)
    });
  }, [makeApiCall]);

  const deleteAccount = useCallback(async (password) => {
    return makeApiCall('/api/users/delete-account', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ password })
    });
  }, [makeApiCall]);

  return {
    updateProfile,
    uploadProfilePhoto,
    removeProfilePhoto,
    changeEmail,
    changePassword,
    deleteAccount,
    isLoading,
    error
  };
};
