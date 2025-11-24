'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';

const SocketContext = createContext(null);

/**
 * Get Socket.io server URL
 * Socket.io needs to connect directly to the backend server
 * In development, connect to localhost:8080 (backend port)
 * In production (Vercel), use the Railway backend URL from API_BASE_URL
 */
const getSocketUrl = () => {
  if (typeof window === 'undefined') return null;
  
  // In development, connect directly to backend server
  if (process.env.NODE_ENV === 'development') {
    // Check if API_BASE_URL is set (might be empty string for Next.js rewrites)
    if (API_BASE_URL && API_BASE_URL.trim() !== '') {
      return API_BASE_URL;
    }
    // Default to localhost:8080 for backend
    return 'http://localhost:8080';
  }
  
  // In production (Vercel), MUST use Railway backend URL
  // API_BASE_URL should be set to Railway backend URL (e.g., https://your-backend.railway.app)
  if (!API_BASE_URL || API_BASE_URL.trim() === '') {
    console.error('❌ NEXT_PUBLIC_API_URL is not set! Socket.io cannot connect to backend.');
    return null;
  }
  
  return API_BASE_URL;
};

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Only connect on client side
    if (typeof window === 'undefined') return;

    // Check if user is authenticated (has access_token cookie)
    // Socket.io will authenticate using cookies, so we just need to check if cookies exist
    const hasAuthCookie = document.cookie.includes('access_token=');
    
    if (!hasAuthCookie) {
      // User not authenticated, don't connect
      return;
    }

    const socketUrl = getSocketUrl();
    if (!socketUrl) {
      return;
    }

    // Create socket connection
    const newSocket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      withCredentials: true, // Required for cross-domain cookies (Vercel -> Railway)
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      // Add path if needed (default is /socket.io/)
      path: '/socket.io/',
      // Force polling first if websocket fails (useful for some network configurations)
      upgrade: true,
      rememberUpgrade: false,
    });

    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // If disconnected due to authentication error, don't try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server closed the connection, likely due to auth error
        setConnectionError('Authentication failed');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.io connection error:', error.message, 'URL:', socketUrl);
      setConnectionError(error.message);
      setIsConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('Socket error:', error);
      setConnectionError(error.message || 'Socket error');
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      if (newSocket) {
        newSocket.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Only run once on mount

  // Listen for authentication changes (e.g., login/logout)
  // Note: This is a simple implementation. For production, consider using a more sophisticated
  // approach like listening to auth state changes from your auth context/store
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAuth = () => {
      const hasAuthCookie = document.cookie.includes('access_token=');
      
      if (!hasAuthCookie && socketRef.current) {
        // User logged out, disconnect socket
        socketRef.current.disconnect();
        setSocket(null);
        setIsConnected(false);
        socketRef.current = null;
      }
      // Note: Reconnection on login is handled by the main useEffect which runs on mount
      // If user logs in, they would need to refresh or the component would remount
    };

    // Check auth periodically (every 5 seconds)
    const interval = setInterval(checkAuth, 5000);

    return () => clearInterval(interval);
  }, []);

  const value = {
    socket,
    isConnected,
    connectionError,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  // Return default values if context is not available (graceful degradation)
  if (!context) {
    return { socket: null, isConnected: false, connectionError: null };
  }
  return context;
}

