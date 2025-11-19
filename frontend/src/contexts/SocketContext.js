'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '@/config/api';

const SocketContext = createContext(null);

/**
 * Get Socket.io server URL
 * In development, use relative path (Next.js rewrites handle it)
 * In production, use the API_BASE_URL
 */
const getSocketUrl = () => {
  if (typeof window === 'undefined') return null;
  
  // In development, use relative path (Next.js rewrites)
  if (process.env.NODE_ENV === 'development') {
    return window.location.origin;
  }
  
  // In production, use API_BASE_URL
  return API_BASE_URL || window.location.origin;
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
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    socketRef.current = newSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      console.log('Socket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionError(null);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setIsConnected(false);
      
      // If disconnected due to authentication error, don't try to reconnect
      if (reason === 'io server disconnect' || reason === 'transport close') {
        // Server closed the connection, likely due to auth error
        setConnectionError('Authentication failed');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
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

