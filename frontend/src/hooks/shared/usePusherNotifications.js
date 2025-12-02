import { useEffect, useRef, useCallback } from 'react';
import { getPusherClient, disconnectPusher } from '@/utils/pusherClient';

/**
 * Hook for managing Pusher real-time notification subscriptions
 * @param {string} userId - User ID for channel subscription
 * @param {string} userType - User type: 'user', 'admin', or 'superadmin'
 * @param {function} onNewNotification - Callback when new notification is received
 * @param {boolean} isAuthenticated - Whether user is authenticated
 * @returns {object} - Connection status and cleanup function
 */
export const usePusherNotifications = (userId, userType, onNewNotification, isAuthenticated) => {
  const channelRef = useRef(null);
  const pusherRef = useRef(null);
  const isSubscribedRef = useRef(false);
  const retryCountRef = useRef(0);
  const retryTimeoutRef = useRef(null);
  const subscriptionTimeoutRef = useRef(null);
  const maxRetries = 5; // Maximum number of retry attempts
  const initialDelay = 500; // Initial delay before first subscription attempt (ms)
  const maxDelay = 30000; // Maximum delay between retries (30 seconds)

  // Cleanup function
  const cleanup = useCallback(() => {
    // Clear any pending timeouts
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current);
      subscriptionTimeoutRef.current = null;
    }

    if (channelRef.current) {
      try {
        channelRef.current.unbind('new-notification');
        channelRef.current.unbind('pusher:subscription_succeeded');
        channelRef.current.unbind('pusher:subscription_error');
        // Unsubscribe from channel
        if (pusherRef.current && channelRef.current) {
          pusherRef.current.unsubscribe(channelRef.current.name);
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
      channelRef.current = null;
    }
    if (pusherRef.current) {
      disconnectPusher();
      pusherRef.current = null;
    }
    isSubscribedRef.current = false;
    retryCountRef.current = 0;
  }, []);

  // Calculate exponential backoff delay
  const getRetryDelay = useCallback((attempt) => {
    const delay = Math.min(initialDelay * Math.pow(2, attempt), maxDelay);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return delay + jitter;
  }, []);

  // Determine if error is retryable
  const isRetryableError = useCallback((error) => {
    if (!error) return false;
    
    const errorType = error.type || '';
    const errorStatus = error.status || error.statusCode || 0;
    
    // Retry on authentication errors (might be temporary - token refresh, etc.)
    if (errorType === 'AuthError' && (errorStatus === 401 || errorStatus === 0)) {
      return true;
    }
    
    // Retry on network errors
    if (errorType === 'NetworkError' || errorStatus === 0) {
      return true;
    }
    
    // Don't retry on authorization errors (403) - user doesn't have permission
    if (errorStatus === 403) {
      return false;
    }
    
    // Retry on other errors (might be temporary)
    return true;
  }, []);

  // Subscribe to channel with retry logic
  const subscribeToChannel = useCallback((pusher, channelName, attempt = 0) => {
    // Clear any existing retry timeout
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    try {
      // Unsubscribe from previous channel if exists
      if (channelRef.current && pusherRef.current) {
        try {
          pusherRef.current.unsubscribe(channelRef.current.name);
        } catch (error) {
          // Ignore errors when unsubscribing
        }
      }

      // Subscribe to private channel
      const channel = pusher.subscribe(channelName);
      channelRef.current = channel;

      // Handle subscription success
      const onSubscriptionSucceeded = () => {
        isSubscribedRef.current = true;
        retryCountRef.current = 0; // Reset retry count on success
      };

      // Handle subscription error
      const onSubscriptionError = (error) => {
        isSubscribedRef.current = false;
        
        const errorInfo = {
          type: error.type || 'UnknownError',
          status: error.status || error.statusCode || 0,
          error: error.error || error.message || 'Unknown error',
        };

        // Determine if error is retryable
        const shouldRetry = isRetryableError(errorInfo) && attempt < maxRetries;

        if (shouldRetry) {
          const delay = getRetryDelay(attempt);
          retryCountRef.current = attempt + 1;
          
          console.warn(
            `⚠️  Failed to subscribe to ${channelName} (attempt ${retryCountRef.current}/${maxRetries}):`,
            errorInfo.error || errorInfo.type,
            `Retrying in ${Math.round(delay)}ms...`
          );

          // Retry subscription after delay
          retryTimeoutRef.current = setTimeout(() => {
            subscribeToChannel(pusher, channelName, attempt + 1);
          }, delay);
        } else {
          // Permanent error or max retries reached
          if (attempt >= maxRetries) {
            console.error(
              `❌ Failed to subscribe to ${channelName} after ${maxRetries} attempts.`,
              'Real-time notifications disabled. Falling back to polling.',
              errorInfo
            );
          } else {
            console.error(
              `❌ Failed to subscribe to ${channelName}:`,
              errorInfo.error || errorInfo.type,
              '(Non-retryable error. Falling back to polling.)'
            );
          }
        }
      };

      // Bind event handlers
      channel.bind('pusher:subscription_succeeded', onSubscriptionSucceeded);
      channel.bind('pusher:subscription_error', onSubscriptionError);

      // Listen for new notifications
      channel.bind('new-notification', (data) => {
        if (onNewNotification && typeof onNewNotification === 'function') {
          onNewNotification(data);
        }
      });
    } catch (error) {
      console.error(`❌ Error subscribing to ${channelName}:`, error);
      
      // Retry if possible
      if (attempt < maxRetries) {
        const delay = getRetryDelay(attempt);
        retryCountRef.current = attempt + 1;
        
        retryTimeoutRef.current = setTimeout(() => {
          subscribeToChannel(pusher, channelName, attempt + 1);
        }, delay);
      }
    }
  }, [onNewNotification, getRetryDelay, isRetryableError, maxRetries]);

  useEffect(() => {
    // Only subscribe if user is authenticated and has an ID
    if (!isAuthenticated || !userId || !userType) {
      cleanup();
      return;
    }

    // Clear any existing subscription timeout
    if (subscriptionTimeoutRef.current) {
      clearTimeout(subscriptionTimeoutRef.current);
      subscriptionTimeoutRef.current = null;
    }

    // Add initial delay to ensure authentication cookies are available
    subscriptionTimeoutRef.current = setTimeout(() => {
      // Get Pusher client
      const pusher = getPusherClient(userId, userType);
      
      if (!pusher) {
        console.warn('⚠️  Pusher client not available. Real-time notifications disabled.');
        return;
      }

      pusherRef.current = pusher;

      // Determine channel name based on user type
      let channelName;
      switch (userType) {
        case 'admin':
          channelName = `private-admin-${userId}`;
          break;
        case 'superadmin':
          channelName = `private-superadmin-${userId}`;
          break;
        case 'user':
        default:
          channelName = `private-user-${userId}`;
          break;
      }

      // Reset retry count when attempting new subscription
      retryCountRef.current = 0;

      // Subscribe to channel with retry logic
      subscribeToChannel(pusher, channelName, 0);
    }, initialDelay);

    // Cleanup on unmount or when dependencies change
    return () => {
      cleanup();
    };
  }, [userId, userType, isAuthenticated, subscribeToChannel, cleanup, initialDelay]);

  // Note: This hook manages Pusher subscriptions internally
  // Return values are not used by consumers, but kept for potential future use
  return {
    isConnected: isSubscribedRef.current,
    connectionStatus: pusherRef.current?.connection?.state || 'unavailable',
    cleanup
  };
};