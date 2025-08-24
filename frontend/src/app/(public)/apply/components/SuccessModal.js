"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiX, FiInfo } from "react-icons/fi";
import styles from "./volunteerForm.module.css";

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

  return createPortal(
    <div className={styles.successModalOverlay}>
      <div className={styles.successModalBackdrop} onClick={onClose} />
      <div className={`${styles.successModalContent} ${isAlreadyApplied ? styles.alreadyApplied : ''}`}>
        <button
          className={styles.successModalClose}
          onClick={onClose}
          aria-label="Close modal"
        >
          <FiX size={24} />
        </button>
        
        <div className={styles.successModalBody}>
          <div className={styles.successIcon}>
            {type === "already_applied" ? (
              <FiInfo size={48} style={{ color: config.iconColor }} />
            ) : (
              <FiCheckCircle size={48} style={{ color: config.iconColor }} />
            )}
          </div>
          
          <h2 className={styles.successTitle} style={{ color: config.titleColor }}>
            {config.title}
          </h2>
          
          <p className={styles.successMessage}>{message}</p>
          
          <div className={styles.successTimer}>
            <p>This will close automatically in {timeLeft} seconds</p>
            <div className={styles.progressBar}>
              <div 
                className={styles.progressFill} 
                style={{ width: `${((5 - timeLeft) / 5) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
