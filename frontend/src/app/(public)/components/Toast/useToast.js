'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast from './Toast';

export const useToast = () => {
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    setToast({ show: true, message, type });
    
    // Auto-hide after duration
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, duration);
  }, []);

  const showSuccess = useCallback((message, duration = 3000) => {
    showToast(message, 'success', duration);
  }, [showToast]);

  const showError = useCallback((message, duration = 3000) => {
    showToast(message, 'error', duration);
  }, [showToast]);

  const showWarning = useCallback((message, duration = 3000) => {
    showToast(message, 'warning', duration);
  }, [showToast]);

  const showInfo = useCallback((message, duration = 3000) => {
    showToast(message, 'info', duration);
  }, [showToast]);

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
    isVisible: toast.show
  };
};
