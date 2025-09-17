'use client';

import { useState, useCallback } from 'react';
import { makeAuthenticatedRequest, clearAuthAndRedirect, showAuthError } from '../../../utils/adminAuth';

export const useAdminEmailChange = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestEmailChange = useCallback(async (emailData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(
        '/api/admin/profile/email/request-change',
        {
          method: 'POST',
          body: JSON.stringify(emailData)
        },
        'admin'
      );

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to request email change');
      }

      return data;
    } catch (err) {
      const errorMessage = err.message === 'No authentication token found' 
        ? 'Your session has expired. Please log in again.' 
        : err.message;
      
      if (errorMessage.includes('session has expired') || errorMessage.includes('token')) {
        showAuthError('Your session has expired. Please log in again.');
        clearAuthAndRedirect('admin');
        return;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verifyEmailChangeOTP = useCallback(async (otpData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await makeAuthenticatedRequest(
        '/api/admin/profile/email/verify-otp',
        {
          method: 'POST',
          body: JSON.stringify(otpData)
        },
        'admin'
      );

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify OTP');
      }

      return data;
    } catch (err) {
      const errorMessage = err.message === 'No authentication token found' 
        ? 'Your session has expired. Please log in again.' 
        : err.message;
      
      if (errorMessage.includes('session has expired') || errorMessage.includes('token')) {
        showAuthError('Your session has expired. Please log in again.');
        clearAuthAndRedirect('admin');
        return;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    requestEmailChange,
    verifyEmailChangeOTP,
    isLoading,
    error
  };
};
