"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';
import styles from './ToastContainer.module.css';

/**
 * ToastContainer - Toast notification system for superadmin portal
 * Positioned at bottom-right corner
 * 
 * Usage:
 * - window.showSuperAdminToast({ heading: "Title", body: "Message" }, "success")
 * - window.showSuperAdminToast("Message", "success") // Legacy format
 * 
 * Types: success, error, warning, info
 * Duration: milliseconds (default: 5000, not used - toasts require manual close)
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Function to add a new toast - wrapped in useCallback for stable reference
  // Supports both: (message, type, duration) and ({ heading, body }, type, duration)
  const addToast = useCallback((messageOrOptions, type = 'success', duration = 5000) => {
    // Only execute on client side
    if (typeof window === 'undefined') return;
    
    const id = Date.now() + Math.random();
    let newToast;
    
    // Check if first argument is an object (new format) or string (old format)
    if (typeof messageOrOptions === 'object' && messageOrOptions !== null) {
      newToast = { 
        id, 
        heading: messageOrOptions.heading,
        body: messageOrOptions.body,
        type, 
        duration 
      };
    } else {
      // Legacy format: message as string
      newToast = { 
        id, 
        message: messageOrOptions, 
        type, 
        duration 
      };
    }
    
    setToasts(prev => [...prev, newToast]);
  }, []);

  // Function to remove a toast - wrapped in useCallback for stable reference
  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Expose addToast function globally for easy access
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    window.showSuperAdminToast = addToast;

    return () => {
      if (typeof window !== 'undefined' && window.showSuperAdminToast) {
        delete window.showSuperAdminToast;
      }
    };
  }, [addToast]);

  // Only render on client side and when document.body exists
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Render toasts in a container at bottom-right
  return createPortal(
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          heading={toast.heading}
          body={toast.body}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>,
    document.body
  );
}

