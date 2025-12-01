import Pusher from 'pusher';

/**
 * Pusher server instance for real-time notifications
 * 
 * Environment variables required:
 * - PUSHER_APP_ID: Your Pusher app ID
 * - PUSHER_KEY: Your Pusher app key
 * - PUSHER_SECRET: Your Pusher app secret
 * - PUSHER_CLUSTER: Your Pusher cluster (e.g., 'us2', 'eu', 'ap1')
 */
let pusherInstance = null;

export const getPusher = () => {
  if (pusherInstance) {
    return pusherInstance;
  }

  // Check if Pusher is configured
  const appId = process.env.PUSHER_APP_ID?.trim();
  const key = process.env.PUSHER_KEY?.trim();
  const secret = process.env.PUSHER_SECRET?.trim();
  // Cluster must be lowercase and trimmed (Pusher is case-sensitive)
  const cluster = (process.env.PUSHER_CLUSTER?.trim() || 'us2').toLowerCase();

  // Warn if cluster might be wrong
  const validClusters = ['us2', 'eu', 'ap1', 'ap2', 'ap3', 'ap4', 'us3'];
  if (cluster && !validClusters.includes(cluster)) {
    console.warn('⚠️  [Pusher] Unusual cluster value:', cluster, '- Valid clusters are:', validClusters.join(', '));
  }

  if (!appId || !key || !secret) {
    console.warn('⚠️  [Pusher] Not configured. Missing environment variables:', {
      missingAppId: !appId,
      missingKey: !key,
      missingSecret: !secret,
      cluster: cluster
    });
    return null;
  }

  try {
    // IMPORTANT: Pusher requires cluster to be specified
    // But if there's a mismatch, the credentials might be wrong
    const pusherConfig = {
      appId,
      key,
      secret,
      cluster, // Cluster is required - if this fails, credentials don't match
      useTLS: true,
    };

    pusherInstance = new Pusher(pusherConfig);
    return pusherInstance;
  } catch (error) {
    console.error('❌ [Pusher] Failed to initialize:', {
      message: error.message,
      stack: error.stack,
      cluster: cluster
    });
    return null;
  }
};

/**
 * Publish a notification to a Pusher channel
 * @param {string} channelName - Channel name (e.g., 'private-user-123')
 * @param {string} eventName - Event name (e.g., 'new-notification')
 * @param {object} data - Notification data
 * @returns {Promise<{success: boolean, error?: object}>} - Success status and optional error details
 */
export const publishNotification = async (channelName, eventName, data) => {
  const pusher = getPusher();
  
  if (!pusher) {
    console.warn('⚠️  [Pusher] Not available. Notification not published to real-time channel.', {
      channelName,
      eventName
    });
    return {
      success: false,
      error: {
        message: 'Pusher not configured',
        code: 'PUSHER_NOT_CONFIGURED'
      }
    };
  }

  try {
    // Pusher trigger returns a promise that resolves when the event is sent
    await pusher.trigger(channelName, eventName, data);
    return { success: true };
  } catch (error) {
    // Enhanced error logging
    const errorDetails = {
      message: error.message,
      name: error.name,
      code: error.code,
      status: error.status,
      response: error.response
    };
    
    console.error('❌ [Pusher] Failed to publish notification:', {
      channelName,
      eventName,
      ...errorDetails,
      fullError: error
    });
    
    // Log the full error for debugging
    if (error.stack) {
      console.error('❌ [Pusher] Error stack:', error.stack);
    }
    
    return {
      success: false,
      error: errorDetails
    };
  }
};

/**
 * Authenticate a private channel subscription
 * @param {string} socketId - Pusher socket ID
 * @param {string} channelName - Channel name to authenticate
 * @returns {object|null} - Authentication response or null if failed
 */
export const authenticateChannel = (socketId, channelName) => {
  const pusher = getPusher();
  
  if (!pusher) {
    return null;
  }

  try {
    const auth = pusher.authorizeChannel(socketId, channelName);
    return auth;
  } catch (error) {
    console.error('❌ Failed to authenticate Pusher channel:', error.message);
    return null;
  }
};

