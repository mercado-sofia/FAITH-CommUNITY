'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { PiWarningOctagonBold } from 'react-icons/pi';

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmButtonText,
  cancelButtonText,
  isLoading = false,
  loadingText,
  className = "",
  actionType = "delete", // 'delete', 'cancel', or 'complete'
  itemName = null // For displaying the specific item name
}) {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Set initial value

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth <= 640;
  const isSmallMobile = windowWidth <= 480;

  // Get configuration based on action type
  const getActionConfig = () => {
    switch (actionType) {
      case 'cancel':
        return {
          title: title || "Cancel Application",
          message: message || "Are you sure you want to cancel your application? Once cancelled, you will no longer be considered for this program and cannot reapply.",
          confirmButtonText: confirmButtonText || "Yes",
          cancelButtonText: cancelButtonText || "No",
          loadingText: loadingText || "Cancelling...",
          isCancelAction: true
        };
      case 'complete':
        return {
          title: title || "Mark as Completed",
          message: message || "Are you sure you want to mark this application as completed? This indicates you have successfully finished the volunteer program.",
          confirmButtonText: confirmButtonText || "Mark Complete",
          cancelButtonText: cancelButtonText || "Cancel",
          loadingText: loadingText || "Marking Complete...",
          isCancelAction: false,
          isCompleteAction: true
        };
      case 'delete':
      default:
        return {
          title: title || "Delete Application",
          message: message || "Are you sure you want to permanently delete your application? This will remove all application data and cannot be undone.",
          confirmButtonText: confirmButtonText || "Delete",
          cancelButtonText: cancelButtonText || "Cancel",
          loadingText: loadingText || "Deleting...",
          isCancelAction: false
        };
    }
  };

  const config = getActionConfig();

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  // Handle body class for modal open state
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.classList.add('modalOpen');
      
      // Cleanup function to remove class when modal closes
      return () => {
        document.body.classList.remove('modalOpen');
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Get icon container styles based on action type
  const getIconContainerStyles = () => {
    const baseStyles = {
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1rem',
      flexShrink: 0
    };

    if (config.isCancelAction) {
      return {
        ...baseStyles,
        backgroundColor: '#FEF3C7',
        color: '#D97706'
      };
    } else if (config.isCompleteAction) {
      return {
        ...baseStyles,
        backgroundColor: '#D1FAE5',
        color: '#059669'
      };
    } else {
      return {
        ...baseStyles,
        backgroundColor: '#FEE2E2',
        color: '#DC2626'
      };
    }
  };

  // Get confirm button styles based on action type
  const getConfirmButtonStyles = () => {
    const baseStyles = {
      flex: 1,
      padding: isMobile ? '0.875rem 1rem' : '0.75rem 1rem',
      borderRadius: '8px',
      fontSize: isMobile ? '13px' : '14px',
      fontWeight: 500,
      fontFamily: 'var(--font-inter)',
      cursor: 'pointer',
      transition: 'all 0.15s ease',
      userSelect: 'none',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      outline: 'none',
      gap: '8px',
      border: '1px solid',
      minHeight: '44px'
    };

    if (config.isCancelAction) {
      return {
        ...baseStyles,
        backgroundColor: '#D97706',
        color: 'white',
        borderColor: '#D97706'
      };
    } else if (config.isCompleteAction) {
      return {
        ...baseStyles,
        backgroundColor: '#059669',
        color: 'white',
        borderColor: '#059669'
      };
    } else {
      return {
        ...baseStyles,
        backgroundColor: '#DC2626',
        color: 'white',
        borderColor: '#DC2626'
      };
    }
  };

  // Get disabled button styles
  const getDisabledButtonStyles = () => ({
    backgroundColor: '#9CA3AF',
    borderColor: '#9CA3AF',
    cursor: 'not-allowed'
  });

  return createPortal(
    <div 
      className={className}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        overflow: 'hidden',
        padding: isMobile ? '1rem' : '1rem'
      }}
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        style={{
          backgroundColor: 'white',
          borderRadius: isMobile ? '16px' : '16px',
          width: '100%',
          padding: isMobile ? '1.5rem 1.25rem 1.25rem' : '2rem 2rem 1.8rem',
          maxWidth: '400px',
          maxHeight: isMobile ? 'calc(100vh - 2rem)' : '90vh',
          overflowY: 'auto',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
          animation: 'fadeIn 0.2s ease-in-out',
          overflow: 'hidden',
          position: 'relative',
          margin: isMobile ? '0 0.5rem' : '0'
        }}
      >
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '0.5rem' : '0.65rem',
            marginBottom: isMobile ? '1rem' : '1.5rem',
            paddingRight: isMobile ? '2.5rem' : '0'
          }}
        >
          <div style={{
            ...getIconContainerStyles(),
            width: isMobile ? '24px' : '28px',
            height: isMobile ? '24px' : '28px',
            fontSize: isMobile ? '0.9rem' : '1rem'
          }}>
            <PiWarningOctagonBold />
          </div>
          <h2 
            id="modal-title" 
            style={{
              margin: 0,
              fontSize: isMobile ? '15px' : '17px',
              fontWeight: 700,
              fontFamily: 'var(--font-inter)',
              color: '#000',
              lineHeight: 1.3
            }}
          >
            {config.title}
          </h2>
        </div>
        
        <div 
          style={{
            marginBottom: isMobile ? '1.5rem' : '2.2rem'
          }}
        >
          <p 
            style={{
              margin: 0,
              color: '#6B7280',
              fontSize: isMobile ? '12px' : '13px',
              lineHeight: 1.6,
              textAlign: 'center',
              padding: isMobile ? '0' : '0 0.5rem'
            }}
          >
            {config.message}
          </p>
        </div>

        <div 
          style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? '0.625rem' : '12px',
            justifyContent: 'center'
          }}
        >
          <button 
            type="button" 
            style={{
              flex: 1,
              backgroundColor: '#F9FAFB',
              color: '#374151',
              border: '1px solid #E5E7EB',
              padding: isMobile ? '0.875rem 1rem' : '0.75rem 1rem',
              borderRadius: '8px',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 500,
              fontFamily: 'var(--font-inter)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              minHeight: '44px',
              ...(isLoading && {
                backgroundColor: '#F3F4F6',
                borderColor: '#E5E7EB',
                color: '#9CA3AF',
                cursor: 'not-allowed'
              })
            }}
            onClick={onClose}
            disabled={isLoading}
            tabIndex="-1"
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#9ca3af';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.backgroundColor = '#F9FAFB';
                e.target.style.borderColor = '#E5E7EB';
              }
            }}
          >
            {config.cancelButtonText}
          </button>
          <button 
            type="button" 
            style={{
              ...getConfirmButtonStyles(),
              ...(isLoading && getDisabledButtonStyles())
            }}
            onClick={onConfirm}
            disabled={isLoading}
            onMouseEnter={(e) => {
              if (!isLoading) {
                if (config.isCancelAction) {
                  e.target.style.backgroundColor = '#B45309';
                  e.target.style.borderColor = '#B45309';
                } else if (config.isCompleteAction) {
                  e.target.style.backgroundColor = '#047857';
                  e.target.style.borderColor = '#047857';
                } else {
                  e.target.style.backgroundColor = '#b91c1c';
                  e.target.style.borderColor = '#b91c1c';
                }
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                if (config.isCancelAction) {
                  e.target.style.backgroundColor = '#D97706';
                  e.target.style.borderColor = '#D97706';
                } else if (config.isCompleteAction) {
                  e.target.style.backgroundColor = '#059669';
                  e.target.style.borderColor = '#059669';
                } else {
                  e.target.style.backgroundColor = '#DC2626';
                  e.target.style.borderColor = '#DC2626';
                }
              }
            }}
          >
            {isLoading ? config.loadingText : config.confirmButtonText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}