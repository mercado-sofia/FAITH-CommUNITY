import Pusher from 'pusher-js';

/**
 * Pusher client instance for real-time notifications
 * 
 * Environment variables required:
 * - NEXT_PUBLIC_PUSHER_KEY: Your Pusher app key
 * - NEXT_PUBLIC_PUSHER_CLUSTER: Your Pusher cluster (e.g., 'us2', 'eu', 'ap1')
 */
let pusherInstance = null;

/**
 * Get or create Pusher client instance
 * @param {string} userId - User ID for authentication
 * @param {string} userType - User type: 'user', 'admin', or 'superadmin'
 * @returns {Pusher|null} - Pusher instance or null if not configured
 */
export const getPusherClient = (userId, userType = 'user') => {
  // Check if Pusher is configured
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || 'us2';

  if (!key) {
    console.warn('⚠️  Pusher not configured. Missing NEXT_PUBLIC_PUSHER_KEY. Real-time notifications will be disabled.');
    return null;
  }

  // If instance exists and is connected, return it
  if (pusherInstance && pusherInstance.connection.state === 'connected') {
    return pusherInstance;
  }

  // Create new instance if needed
  if (!pusherInstance) {
    try {
      const authEndpoint = getAuthEndpoint(userType);
      
      pusherInstance = new Pusher(key, {
        cluster,
        encrypted: true,
        // Use authorizer function to explicitly send cookies with credentials
        authorizer: (channel, options) => {
          return {
            authorize: (socketId, callback) => {
              // Use fetch with explicit credentials to ensure cookies are sent
              fetch(authEndpoint, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                credentials: 'include', // CRITICAL: Include httpOnly cookies
                body: JSON.stringify({
                  socket_id: socketId,
                  channel_name: channel.name,
                }),
              })
                .then((response) => {
                  if (!response.ok) {
                    // Handle different error statuses
                    if (response.status === 401) {
                      throw new Error('Authentication failed: Invalid or expired token');
                    } else if (response.status === 403) {
                      throw new Error('Authorization failed: Unauthorized channel access');
                    } else {
                      throw new Error(`Authentication request failed: ${response.status} ${response.statusText}`);
                    }
                  }
                  return response.json();
                })
                .then((data) => {
                  callback(null, data);
                })
                .catch((error) => {
                  console.error('❌ Pusher authorization error:', error.message);
                  callback(error, null);
                });
            },
          };
        },
        // Enable automatic reconnection
        enabledTransports: ['ws', 'wss'],
        disabledTransports: [],
      });

      // Log connection events for debugging
      pusherInstance.connection.bind('connected', () => {
        console.log('✅ Pusher connected');
      });

      pusherInstance.connection.bind('disconnected', () => {
        console.log('⚠️  Pusher disconnected');
      });

      pusherInstance.connection.bind('error', (err) => {
        console.error('❌ Pusher connection error:', err);
      });

      return pusherInstance;
    } catch (error) {
      console.error('❌ Failed to initialize Pusher client:', error);
      return null;
    }
  }

  return pusherInstance;
};

/**
 * Get the authentication endpoint based on user type
 * @param {string} userType - User type: 'user', 'admin', or 'superadmin'
 * @returns {string} - Authentication endpoint URL
 */
const getAuthEndpoint = (userType) => {
  // Import API_BASE_URL dynamically to avoid circular dependencies
  let baseUrl = '';
  
  if (typeof window !== 'undefined') {
    // In browser, use relative path (works with Next.js rewrites)
    // In production, NEXT_PUBLIC_API_URL will be set
    baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    
    // In development, use empty string for relative paths (Next.js rewrites handle it)
    if (process.env.NODE_ENV === 'development') {
      baseUrl = '';
    }
  }
  
  switch (userType) {
    case 'admin':
      return `${baseUrl}/api/notifications/pusher/auth`;
    case 'superadmin':
      return `${baseUrl}/api/superadmin/notifications/pusher/auth`;
    case 'user':
    default:
      return `${baseUrl}/api/users/pusher/auth`;
  }
};

/**
 * Disconnect Pusher client
 */
export const disconnectPusher = () => {
  if (pusherInstance) {
    pusherInstance.disconnect();
    pusherInstance = null;
  }
};

/**
 * Get connection status
 * @returns {string} - Connection state: 'connected', 'disconnected', 'connecting', 'unavailable'
 */
export const getPusherConnectionStatus = () => {
  if (!pusherInstance) {
    return 'unavailable';
  }
  return pusherInstance.connection.state;
};

