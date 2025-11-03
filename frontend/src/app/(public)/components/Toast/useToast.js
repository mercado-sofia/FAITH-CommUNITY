'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

export const useToast = () => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  // Support for multiple toasts (for profile page compatibility)
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    
    // Auto-hide after duration
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, duration);
  }, []);

  const addToast = useCallback((toastData) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toastData, id }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 3000) => {
    showToast(message, 'success', duration);
    // Also add to toasts array for profile page compatibility
    addToast({ type: 'success', message, duration });
  }, [showToast, addToast]);

  const showError = useCallback((message, duration = 5000) => {
    showToast(message, 'error', duration);
    // Also add to toasts array for profile page compatibility
    addToast({ type: 'error', message, duration });
  }, [showToast, addToast]);

  const showWarning = useCallback((message, duration = 4000) => {
    showToast(message, 'warning', duration);
    // Also add to toasts array for profile page compatibility
    addToast({ type: 'warning', message, duration });
  }, [showToast, addToast]);

  const showInfo = useCallback((message, duration = 3000) => {
    showToast(message, 'info', duration);
    // Also add to toasts array for profile page compatibility
    addToast({ type: 'info', message, duration });
  }, [showToast, addToast]);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, show: false }));
  }, []);

  const ToastComponent = () => {
    if (!toast.show) return null;

    return createPortal(
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={hideToast}
      />,
      document.body
    );
  };

  return {
    showToast,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideToast,
    ToastComponent,
    isVisible: toast.show,
    // For profile page compatibility
    toasts,
    addToast,
    removeToast
  };
};
