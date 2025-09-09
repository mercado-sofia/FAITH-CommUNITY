'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes } from 'react-icons/fa';

// Add CSS animations and responsive styles for toast
const toastStyles = `
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(100%);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  @keyframes slideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
  
  .toast-container {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-width: 400px;
  }
  
  @media (max-width: 640px) {
    .toast-container {
      top: 8px;
      right: 8px;
      left: 8px;
      max-width: none;
    }
  }
`;

// Inject styles into document head
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = toastStyles;
  if (!document.head.querySelector('style[data-toast-styles]')) {
    styleElement.setAttribute('data-toast-styles', 'true');
    document.head.appendChild(styleElement);
  }
}

const Toast = ({ 
  type = 'info', 
  message, 
  duration = 3000, 
  onClose,
  className = ''
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300); // Wait for animation to complete
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose?.(), 300);
  };

  const getToastStyles = () => {
    const baseStyles = {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid',
      transition: 'all 0.3s ease-in-out',
      animation: isVisible ? 'slideIn 0.3s ease-out' : 'slideOut 0.3s ease-in',
      maxWidth: '100%',
      opacity: isVisible ? 1 : 0,
      transform: isVisible ? 'translateX(0)' : 'translateX(100%)'
    };
    
    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          backgroundColor: '#f0fdf4',
          borderColor: '#bbf7d0',
          color: '#166534'
        };
      case 'error':
        return {
          ...baseStyles,
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          color: '#dc2626'
        };
      case 'warning':
        return {
          ...baseStyles,
          backgroundColor: '#fffbeb',
          borderColor: '#fed7aa',
          color: '#d97706'
        };
      default:
        return {
          ...baseStyles,
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          color: '#1d4ed8'
        };
    }
  };

  const getIcon = () => {
    const iconStyle = {
      flexShrink: 0,
      fontSize: '18px'
    };

    switch (type) {
      case 'success':
        return <FaCheck style={iconStyle} />;
      case 'error':
        return <FaExclamationTriangle style={iconStyle} />;
      case 'warning':
        return <FaExclamationTriangle style={iconStyle} />;
      default:
        return <FaInfo style={iconStyle} />;
    }
  };

  const messageStyle = {
    flex: 1,
    fontSize: '14px',
    fontWeight: '500',
    lineHeight: '20px'
  };

  const closeButtonStyle = {
    flexShrink: 0,
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease',
    opacity: 0.7
  };

  if (!isVisible) return null;

  return (
    <div 
      style={getToastStyles()}
      role="alert"
      aria-live="polite"
    >
      {getIcon()}
      <span style={messageStyle}>{message}</span>
      <button
        onClick={handleClose}
        style={closeButtonStyle}
        aria-label="Close notification"
        onMouseOver={(e) => {
          e.target.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
          e.target.style.opacity = '1';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = 'transparent';
          e.target.style.opacity = '0.7';
        }}
      >
        <FaTimes />
      </button>
    </div>
  );
};

// Toast container component
export const ToastContainer = ({ toasts, onRemoveToast }) => {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          type={toast.type}
          message={toast.message}
          duration={toast.duration}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </div>
  );
};

// Hook for managing toasts
export const useToast = () => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 3000) => {
    addToast({ type: 'success', message, duration });
  }, [addToast]);

  const showError = useCallback((message, duration = 5000) => {
    addToast({ type: 'error', message, duration });
  }, [addToast]);

  const showWarning = useCallback((message, duration = 4000) => {
    addToast({ type: 'warning', message, duration });
  }, [addToast]);

  const showInfo = useCallback((message, duration = 3000) => {
    addToast({ type: 'info', message, duration });
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

export default Toast;