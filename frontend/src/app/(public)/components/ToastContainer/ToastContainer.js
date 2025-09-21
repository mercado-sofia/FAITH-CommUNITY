"use client";

import { useState, useEffect } from 'react';
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

  // Function to add a new toast
  const addToast = (message, type = 'success', duration = 4000) => {
    const id = Date.now() + Math.random();
    const newToast = { id, message, type, duration };
    setToasts(prev => [...prev, newToast]);
  };

  // Function to remove a toast
  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  // Expose addToast function globally for easy access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.showToast = addToast;
    }

    return () => {
      if (typeof window !== 'undefined') {
        delete window.showToast;
      }
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 1000000, pointerEvents: 'none' }}>
      {toasts.map((toast, index) => (
        <div 
          key={toast.id} 
          style={{ 
            pointerEvents: 'auto',
            marginTop: index > 0 ? '0.75rem' : '0',
            transform: `translateY(${index * 80}px)`
          }}
        >
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}
