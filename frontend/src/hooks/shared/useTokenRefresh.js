/**
 * Proactive Token Refresh Hook
 * Automatically refreshes access tokens before they expire
 * Runs in the background to keep users logged in seamlessly
 */

import { useEffect, useRef } from 'react';
import { getValidAccessToken } from '@/utils/shared/tokenRefresh';
import { isPortalDemoActive } from '@/config/portalDemo';

/**
 * Hook to automatically refresh tokens before expiration
 * @param {object} options - Configuration options
 * @param {number} options.checkInterval - How often to check token status in ms (default: 5 minutes)
 * @param {number} options.refreshBufferSeconds - Refresh token if expiring within this many seconds (default: 120 seconds / 2 minutes)
 * @param {boolean} options.enabled - Whether the hook is enabled (default: true)
 */
export const useTokenRefresh = (options = {}) => {
  const {
    checkInterval = 5 * 60 * 1000, // 5 minutes
    refreshBufferSeconds = 120, // 2 minutes
    enabled = true
  } = options;

  const intervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    // Don't run on server side or in portal demo mode
    if (typeof window === 'undefined' || !enabled || isPortalDemoActive()) {
      return;
    }

    // Function to check and refresh token if needed
    const checkAndRefreshToken = async () => {
      // Prevent concurrent refresh attempts
      if (isRefreshingRef.current) {
        return;
      }

      try {
        isRefreshingRef.current = true;

        // Check auth status - this will automatically refresh if needed
        // The getValidAccessToken function checks if token needs refresh
        // and refreshes it if expiring soon or expired
        // Use silent mode to prevent any console errors or user notifications
        await getValidAccessToken(false, true); // Don't force refresh, let it decide, silent mode
      } catch (error) {
        // Silently fail - don't interrupt user experience
        // Token refresh failures will be handled on next API call
        // No console logging in production - completely silent
      } finally {
        isRefreshingRef.current = false;
      }
    };

    // Initial check after a short delay to avoid immediate refresh on mount
    const initialTimeout = setTimeout(() => {
      checkAndRefreshToken();
    }, 1000); // Wait 1 second before first check

    // Set up interval to check periodically
    intervalRef.current = setInterval(() => {
      checkAndRefreshToken();
    }, checkInterval);

    // Cleanup function
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkInterval, refreshBufferSeconds, enabled]);
};

