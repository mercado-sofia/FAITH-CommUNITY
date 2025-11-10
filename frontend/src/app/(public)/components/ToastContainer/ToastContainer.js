"use client";

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from '../Toast/Toast';

/**
 * ToastContainer - Global toast notification system
 * 
 * Usage:
 * - window.showToast("Message", "success", 4000)
 * - window.showToast("Error message", "error", 5000)
 * - window.showToast("Warning", "warning", 3000)
 * - window.showToast("Info", "info", 4000)
 * 
 * Types: success, error, warning, info
 * Duration: milliseconds (default: 4000)
 */
export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Function to add a new toast - wrapped in useCallback for stable reference
  const addToast = useCallback((message, type = 'success', duration = 4000) => {
    // Only execute on client side
    if (typeof window === 'undefined') return;
    
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
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

    window.showToast = addToast;

    return () => {
      if (typeof window !== 'undefined' && window.showToast) {
        delete window.showToast;
      }
    };
  }, [addToast]);

  // Only render on client side and when document.body exists
  if (typeof window === 'undefined' || typeof document === 'undefined' || !document.body) {
    return null;
  }

  // Render each toast directly via createPortal (like Footer newsletter toast)
  // This ensures proper z-index and positioning on mobile devices
  // Each toast is rendered independently without wrapper divs that could interfere
  return (
    <>
      {toasts.map((toast) => 
        createPortal(
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />,
          document.body
        )
      )}
    </>
  );
}