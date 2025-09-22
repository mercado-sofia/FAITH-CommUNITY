'use client';

import { useState, useCallback } from 'react';
import { makeAuthenticatedRequest, clearAuthAndRedirect, showAuthError } from '@/utils/adminAuth';

/**
 * Unified hook for email change functionality across all user types
 * @param {string} userType - 'public' | 'admin' | 'superadmin'
 * @returns {object} - API functions and loading state
 */
export const useEmailChange = (userType) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // API endpoint configuration
  const getApiEndpoints = (userType) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    switch (userType) {
      case 'public':
        return {
          requestChange: `${baseUrl}/api/users/email/request-change`,
          verifyOtp: `${baseUrl}/api/users/email/verify-otp`
        };
      case 'admin':
        return {
          requestChange: `${baseUrl}/api/admin/profile/email/request-change`,
          verifyOtp: `${baseUrl}/api/admin/profile/email/verify-otp`
        };
      case 'superadmin':
        return {
          requestChange: (userId) => `${baseUrl}/api/superadmin/auth/email/request-change/${userId}`,
          verifyOtp: (userId) => `${baseUrl}/api/superadmin/auth/email/verify-otp/${userId}`
        };
      default:
        throw new Error(`Unsupported user type: ${userType}`);
    }
  };

  // Get authentication headers for public users
  const getPublicAuthHeaders = () => {
    const token = localStorage.getItem('userToken');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  // Request email change
  const requestEmailChange = useCallback(async (emailData, userId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoints = getApiEndpoints(userType);
      let url, response;

      if (userType === 'public') {
        // Public user API call
        response = await fetch(endpoints.requestChange, {
          method: 'POST',
          headers: getPublicAuthHeaders(),
          body: JSON.stringify(emailData)
        });
      } else {
        // Admin/Superadmin API call
        const requestUrl = userType === 'superadmin' 
          ? endpoints.requestChange(userId)
          : endpoints.requestChange;
          
        response = await makeAuthenticatedRequest(
          requestUrl,
          {
            method: 'POST',
            body: JSON.stringify(emailData)
          },
          userType
        );
      }

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to request email change');
      }

      return data;
    } catch (err) {
      const errorMessage = err.message === 'No authentication token found' 
        ? 'Your session has expired. Please log in again.' 
        : err.message;
      
      if (errorMessage.includes('session has expired') || errorMessage.includes('token')) {
        if (userType === 'public') {
          // For public users, just clear localStorage
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          window.location.href = '/login';
        } else {
          showAuthError('Your session has expired. Please log in again.');
          clearAuthAndRedirect(userType);
        }
        return;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userType]);

  // Verify email change OTP
  const verifyEmailChangeOTP = useCallback(async (otpData, userId = null) => {
    setIsLoading(true);
    setError(null);

    try {
      const endpoints = getApiEndpoints(userType);
      let url, response;

      if (userType === 'public') {
        // Public user API call
        response = await fetch(endpoints.verifyOtp, {
          method: 'POST',
          headers: getPublicAuthHeaders(),
          body: JSON.stringify(otpData)
        });
      } else {
        // Admin/Superadmin API call
        const requestUrl = userType === 'superadmin' 
          ? endpoints.verifyOtp(userId)
          : endpoints.verifyOtp;
          
        response = await makeAuthenticatedRequest(
          requestUrl,
          {
            method: 'POST',
            body: JSON.stringify(otpData)
          },
          userType
        );
      }

      if (!response) {
        // Authentication utility handled redirect
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to verify OTP');
      }

      return data;
    } catch (err) {
      const errorMessage = err.message === 'No authentication token found' 
        ? 'Your session has expired. Please log in again.' 
        : err.message;
      
      if (errorMessage.includes('session has expired') || errorMessage.includes('token')) {
        if (userType === 'public') {
          // For public users, just clear localStorage
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          window.location.href = '/login';
        } else {
          showAuthError('Your session has expired. Please log in again.');
          clearAuthAndRedirect(userType);
        }
        return;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [userType]);

  return {
    requestEmailChange,
    verifyEmailChangeOTP,
    isLoading,
    error
  };
};
