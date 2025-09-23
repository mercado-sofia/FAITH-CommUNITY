import { useState, useCallback, useRef } from 'react';
import { getApiUrl, getAuthHeaders, getAuthHeadersWithFormData } from '../utils/profileApi';

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

      console.log('Making API call:', {
        endpoint: getApiUrl(endpoint),
        method: options.method || 'GET',
        hasBody: !!options.body,
        bodyType: options.body instanceof FormData ? 'FormData' : typeof options.body
      });

      const response = await fetch(getApiUrl(endpoint), defaultOptions);
      
      // Handle non-JSON responses (like file uploads)
      let data;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          data: data,
          endpoint: endpoint,
          options: options,
          contentType: contentType
        });
        
        // Handle different error response formats
        let errorMessage;
        if (typeof data === 'string') {
          errorMessage = data;
        } else if (data && typeof data === 'object') {
          errorMessage = data.error || data.message || data.details || `HTTP error! status: ${response.status}`;
        } else {
          errorMessage = `HTTP error! status: ${response.status}`;
        }
        
        // If we still don't have a meaningful error message, provide a default
        if (!errorMessage || errorMessage === `HTTP error! status: ${response.status}`) {
          errorMessage = `Server error (${response.status}): ${response.statusText}`;
        }
        
        throw new Error(errorMessage);
      }

      console.log('API call successful:', {
        endpoint,
        status: response.status,
        data: data
      });

      return { data, response };
    } catch (err) {
      if (err.name === 'AbortError') {
        // Request was cancelled, don't set error
        console.log('API call cancelled:', endpoint);
        return null;
      }
      
      console.error('API call failed:', {
        endpoint,
        error: err.message,
        stack: err.stack
      });
      
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
    if (!photoFile) {
      throw new Error('No photo file provided');
    }

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

  const requestEmailChange = useCallback(async (emailData) => {
    return makeApiCall('/api/users/email/request-change', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(emailData)
    });
  }, [makeApiCall]);

  const verifyEmailChangeOTP = useCallback(async (otpData) => {
    return makeApiCall('/api/users/email/verify-otp', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(otpData)
    });
  }, [makeApiCall]);

  // Legacy function for backward compatibility
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
    requestEmailChange,
    verifyEmailChangeOTP,
    changeEmail, // Legacy function
    changePassword,
    deleteAccount,
    isLoading,
    error
  };
};
