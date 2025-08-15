"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiCheckCircle, FiX } from "react-icons/fi";
import styles from "./volunteerForm.module.css";

export default function SuccessModal({ isOpen, onClose, message = "Application submitted successfully!" }) {
  const [mounted, setMounted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);

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
      <div className={styles.successModalContent}>
        <button
          className={styles.successModalClose}
          onClick={onClose}
          aria-label="Close modal"
        >
          <FiX size={24} />
        </button>
        
        <div className={styles.successModalBody}>
          <div className={styles.successIcon}>
            <FiCheckCircle size={48} />
          </div>
          
          <h2 className={styles.successTitle}>Success!</h2>
          
          <p className={styles.successMessage}>{message}</p>
          
          <div className={styles.successTimer}>
            <p>This modal will close automatically in {timeLeft} seconds</p>
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
