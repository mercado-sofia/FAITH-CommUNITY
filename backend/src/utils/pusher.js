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

  // Detailed logging for debugging
  console.log('🔍 [Pusher] Checking configuration...', {
    hasAppId: !!appId,
    hasKey: !!key,
    hasSecret: !!secret,
    cluster: cluster,
    clusterFromEnv: process.env.PUSHER_CLUSTER,
    clusterRaw: `"${process.env.PUSHER_CLUSTER}"`,
    appId: appId ? `${appId.substring(0, 4)}...` : 'missing',
    key: key ? `${key.substring(0, 8)}...` : 'missing',
    appIdLength: appId?.length || 0,
    keyLength: key?.length || 0,
    secretLength: secret?.length || 0
  });
  
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

    console.log('✅ [Pusher] Initialized successfully', {
      appId: appId.substring(0, 4) + '...',
      key: key.substring(0, 8) + '...',
      cluster: cluster || 'auto-detect',
      configUsed: Object.keys(pusherConfig)
    });
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
 * @returns {Promise<boolean>} - Success status
 */
export const publishNotification = async (channelName, eventName, data) => {
  console.log('📤 [Pusher] Attempting to publish notification...', {
    channelName,
    eventName,
    hasData: !!data,
    dataKeys: data ? Object.keys(data) : []
  });

  const pusher = getPusher();
  
  if (!pusher) {
    console.warn('⚠️  [Pusher] Not available. Notification not published to real-time channel.', {
      channelName,
      eventName
    });
    return false;
  }

  try {
    // Pusher trigger returns a promise that resolves when the event is sent
    console.log('🚀 [Pusher] Calling pusher.trigger()...', {
      channelName,
      eventName,
      dataSize: JSON.stringify(data).length
    });
    
    const result = await pusher.trigger(channelName, eventName, data);
    
    // Log the result to see what Pusher returns
    console.log('✅ [Pusher] Notification published successfully', {
      channelName,
      eventName,
      result: result,
      resultType: typeof result,
      resultKeys: result && typeof result === 'object' ? Object.keys(result) : 'N/A'
    });
    
    return true;
  } catch (error) {
    // Enhanced error logging
    console.error('❌ [Pusher] Failed to publish notification:', {
      channelName,
      eventName,
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      errorStatus: error.status,
      errorResponse: error.response,
      fullError: error
    });
    
    // Log the full error for debugging
    if (error.stack) {
      console.error('❌ [Pusher] Error stack:', error.stack);
    }
    
    return false;
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

