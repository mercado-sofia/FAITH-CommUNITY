"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiX, FiInfo } from "react-icons/fi";

export default function SuccessModal({ isOpen, onClose, message = "Application submitted successfully!", type = "success" }) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

  // Determine if this is an "already applied" case
  const isAlreadyApplied = type === "already_applied";
  
  // Set appropriate styling and content based on type
  const modalConfig = {
    success: {
      icon: "FiCheckCircle",
      title: "Success!",
      iconColor: "#10B981", // Green
      titleColor: "#059669"
    },
    already_applied: {
      icon: "FiInfo",
      title: "Already Applied",
      iconColor: "#3B82F6", // Blue
      titleColor: "#2563EB"
    }
  };

  const config = modalConfig[type] || modalConfig.success;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    // Reset timer when modal opens
    setTimeLeft(5);

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Use setTimeout to schedule the onClose call for the next tick
          setTimeout(() => {
            onClose();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const overlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1rem'
  };

  const backdropStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  };

  const contentStyle = {
    position: 'relative',
    background: 'white',
    borderRadius: '1rem',
    padding: '1.5rem',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    border: `3px solid ${type === 'already_applied' ? '#3b82f6' : '#10b981'}`
  };

  const closeBtnStyle = {
    position: 'absolute',
    top: '1rem',
    right: '1rem',
    background: 'none',
    border: 'none',
    color: '#6b7280',
    cursor: 'pointer',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  };

  const bodyStyle = {
    textAlign: 'center',
    padding: '1rem 0'
  };

  const successIconStyle = {
    marginBottom: '1rem'
  };

  const titleStyle = {
    fontSize: '1.25rem',
    fontWeight: 700,
    color: '#1f2937',
    marginBottom: '0.75rem',
    fontFamily: 'var(--font-roboto)',
    color: config.titleColor
  };

  const messageStyle = {
    fontSize: '0.875rem',
    color: '#6b7280',
    marginBottom: '1.5rem',
    lineHeight: 1.5,
    fontFamily: 'var(--font-roboto)'
  };

  const timerStyle = {
    marginTop: '1.5rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  };

  const progressBarStyle = {
    width: '100%',
    height: '4px',
    backgroundColor: '#e5e7eb',
    borderRadius: '2px',
    overflow: 'hidden'
  };

  const progressFillStyle = {
    height: '100%',
    background: type === 'already_applied'
      ? 'linear-gradient(90deg, #3B82F6, #2563EB)'
      : 'linear-gradient(90deg, #10b981, #059669)',
    borderRadius: '2px',
    transition: 'width 0.3s ease',
    width: `${((5 - timeLeft) / 5) * 100}%`
  };

  return createPortal(
    <div style={overlayStyle}>
      <div style={backdropStyle} onClick={onClose} />
      <div style={contentStyle}>
        <button
          style={closeBtnStyle}
          onClick={onClose}
          aria-label="Close modal"
        >
          <FiX size={24} />
        </button>
        
        <div style={bodyStyle}>
          <div style={successIconStyle}>
            {type === "already_applied" ? (
              <FiInfo size={48} style={{ color: config.iconColor }} />
            ) : (
              <FiCheckCircle size={48} style={{ color: config.iconColor }} />
            )}
          </div>
          
          <h2 style={titleStyle}>
            {config.title}
          </h2>
          
          <p style={messageStyle}>{message}</p>
          
          <div style={timerStyle}>
            <p>This will close automatically in {timeLeft} seconds</p>
            <div style={progressBarStyle}>
              <div style={progressFillStyle} />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
