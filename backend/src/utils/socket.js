import { Server } from 'socket.io';
import { verifyAccessToken } from './jwt.js';
import db from '../database.js';

/**
 * Parse cookies from cookie header string
 * @param {string} cookieHeader - Cookie header string
 * @returns {Object} Parsed cookies object
 */
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  
  cookieHeader.split(';').forEach(cookie => {
    const parts = cookie.trim().split('=');
    if (parts.length === 2) {
      cookies[parts[0].trim()] = decodeURIComponent(parts[1].trim());
    }
  });
  
  return cookies;
}

let io = null;

/**
 * Initialize Socket.io server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Server} Socket.io server instance
 */
export function initializeSocket(httpServer) {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3002")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  });

  // Middleware to authenticate socket connections using JWT from cookies
  io.use(async (socket, next) => {
    try {
      // Parse cookies from handshake
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        return next(new Error('Authentication error: No cookies found'));
      }

      // Parse cookies
      const cookies = parseCookies(cookieHeader);
      const token = cookies.access_token;
      
      if (!token) {
        return next(new Error('Authentication error: No access token found'));
      }

      // Verify JWT token
      const decoded = verifyAccessToken(token);
      
      // Verify user exists and is active
      const [userRows] = await db.execute(
        'SELECT id, email, role FROM users WHERE id = ? AND is_active = 1',
        [decoded.id]
      );

      if (userRows.length === 0) {
        return next(new Error('Authentication error: User not found or inactive'));
      }

      // Attach user info to socket
      socket.userId = decoded.id;
      socket.userRole = decoded.role;
      socket.userEmail = userRows[0].email;

      next();
    } catch (error) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Handle socket connections
  io.on('connection', (socket) => {
    console.log(`Socket connected: User ${socket.userId} (${socket.userEmail})`);

    // Join user-specific room for targeted notifications
    socket.join(`user:${socket.userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Socket disconnected: User ${socket.userId}`);
    });

    // Handle errors
    socket.on('error', (error) => {
      console.error(`Socket error for user ${socket.userId}:`, error);
    });
  });

  return io;
}

/**
 * Get Socket.io server instance
 * @returns {Server|null} Socket.io server instance or null if not initialized
 */
export function getSocketIO() {
  return io;
}

/**
 * Emit notification to a specific user
 * @param {number} userId - User ID to send notification to
 * @param {Object} notification - Notification data
 */
export function emitUserNotification(userId, notification) {
  if (!io) {
    console.warn('Socket.io not initialized. Cannot emit notification.');
    return;
  }

  io.to(`user:${userId}`).emit('notification', notification);
  console.log(`Notification emitted to user ${userId}:`, notification.title);
}

/**
 * Emit notification to multiple users
 * @param {Array<number>} userIds - Array of user IDs
 * @param {Object} notification - Notification data
 */
export function emitUserNotifications(userIds, notification) {
  if (!io) {
    console.warn('Socket.io not initialized. Cannot emit notifications.');
    return;
  }

  userIds.forEach(userId => {
    io.to(`user:${userId}`).emit('notification', notification);
  });
  
  console.log(`Notification emitted to ${userIds.length} user(s):`, notification.title);
}

export default {
  initializeSocket,
  getSocketIO,
  emitUserNotification,
  emitUserNotifications
};

