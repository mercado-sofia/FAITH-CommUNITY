'use client';

import React from 'react';

const LoadingSpinner = ({ 
  size = 'medium', 
  message = 'Loading...', 
  className = '',
  fullScreen = false 
}) => {
  const sizeStyles = {
    small: { width: '16px', height: '16px' },
    medium: { width: '32px', height: '32px' },
    large: { width: '48px', height: '48px' }
  };

  const spinnerSize = sizeStyles[size] || sizeStyles.medium;

  const containerStyle = fullScreen 
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50
      }
    : {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px'
      };

  const spinnerStyle = {
    ...spinnerSize,
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #16a34a',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  };

  const messageStyle = {
    fontSize: '14px',
    color: '#6b7280',
    fontWeight: '500',
    margin: 0
  };

  return (
    <div style={{ ...containerStyle, ...(className ? { className } : {}) }}>
      <div style={spinnerStyle} />
      {message && (
        <p style={messageStyle}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;
