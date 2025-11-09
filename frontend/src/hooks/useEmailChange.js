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
          // For public users, use centralized cleanup
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
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

      // Read response as text first, then parse as JSON
      // This allows us to handle both JSON and non-JSON responses gracefully
      const responseText = await response.text();
      let data;
      
      // Try to parse as JSON
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        // Response is not valid JSON
        console.error('Non-JSON response received:', responseText);
        
        if (!response.ok) {
          // Extract error message from text response
          const errorMsg = responseText.substring(0, 200) || `Server error (${response.status})`;
          throw new Error(errorMsg);
        }
        
        throw new Error('Invalid response format from server. Please try again.');
      }

      if (!response.ok) {
        // Extract error message from response
        const errorMsg = data?.error || data?.message || `Server error (${response.status})`;
        throw new Error(errorMsg);
      }

      // Check for explicit error responses
      // Backend returns { success: true, message: "...", data: {...} } for success
      // or { error: "...", message: "..." } for errors
      // Public users return { message: "...", newEmail: "...", token: "...", user: {...} } for success
      if (data.error && data.success !== true) {
        throw new Error(data.error || data.message || 'Failed to verify OTP');
      }

      // If success is explicitly false, throw error
      if (data.success === false) {
        throw new Error(data.error || data.message || 'Failed to verify OTP');
      }

      return data;
    } catch (err) {
      // Log the full error for debugging in production
      if (process.env.NODE_ENV === 'production') {
        console.error('Email verification error:', err);
      }
      
      let errorMessage = err.message;
      
      // Handle network errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      // Handle JSON parsing errors
      if (err instanceof SyntaxError) {
        errorMessage = 'Invalid response from server. Please try again.';
      }
      
      // Handle authentication errors
      if (errorMessage === 'No authentication token found' || 
          errorMessage.includes('session has expired') || 
          errorMessage.includes('token')) {
        errorMessage = 'Your session has expired. Please log in again.';
        
        if (userType === 'public') {
          // For public users, use centralized cleanup
          const { clearAuthImmediate, USER_TYPES } = await import('@/utils/authService');
          clearAuthImmediate(USER_TYPES.PUBLIC);
          window.location.href = '/login';
        } else {
          showAuthError('Your session has expired. Please log in again.');
          clearAuthAndRedirect(userType);
        }
        return;
      }
      
      // If error message is empty or generic, provide a more helpful message
      if (!errorMessage || errorMessage === 'Failed to verify OTP') {
        errorMessage = 'Failed to verify code. Please check the code and try again.';
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
