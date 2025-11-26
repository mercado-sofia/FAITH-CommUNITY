'use client';

import { useState, useRef, useEffect } from 'react';
import logger from '@/utils/shared/logger';
import styles from './ContactFormModal.module.css';
import { API_BASE_URL } from '@/config/api';

const ContactFormModal = ({ isOpen, onClose, organizationName, organizationId, programTitle }) => {
  const [formData, setFormData] = useState({
    senderName: '',
    senderEmail: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null); // 'success', 'error', null
  const closeTimeoutRef = useRef(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus(null);

    try {
      const response = await fetch(`${API_BASE_URL || ''}/api/messages`, {
        method: 'POST',
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          organization_id: organizationId,
          sender_email: formData.senderEmail,
          sender_name: formData.senderName,
          message: formData.message
        })
      });

      // Parse JSON with error handling
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        setSubmitStatus('error');
        setIsSubmitting(false);
        return;
      }

      if (response.ok && result.success) {
        setSubmitStatus('success');
        // Reset form
        setFormData({
          senderName: '',
          senderEmail: '',
          message: ''
        });
        // Clear any existing timeout
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
        }
        // Close modal after 2 seconds - only run on client side
        if (typeof window !== 'undefined') {
          closeTimeoutRef.current = setTimeout(() => {
            onClose();
            closeTimeoutRef.current = null;
          }, 2000);
        }
      } else {
        setSubmitStatus('error');
      }
    } catch (error) {
      logger.error('Error sending message', error, { context: 'ContactFormModal' });
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        senderName: '',
        senderEmail: '',
        message: ''
      });
      setSubmitStatus(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Contact Organization</h2>
          <button 
            className={styles.closeButton} 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.contactInfo}>
            <p className={styles.contactText}>
              Send a message to <strong>{organizationName}</strong> about the program: <strong>{programTitle}</strong>
            </p>
          </div>

          {submitStatus === 'success' ? (
            <div className={styles.successMessage}>
              <div className={styles.successIcon}>✓</div>
              <p>Your message has been sent successfully! The organization will get back to you soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.contactForm}>
              <div className={styles.formGroup}>
                <label htmlFor="senderName" className={styles.label}>
                  Your Name *
                </label>
                <input
                  type="text"
                  id="senderName"
                  name="senderName"
                  value={formData.senderName}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="senderEmail" className={styles.label}>
                  Your Email *
                </label>
                <input
                  type="email"
                  id="senderEmail"
                  name="senderEmail"
                  value={formData.senderEmail}
                  onChange={handleInputChange}
                  className={styles.input}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="message" className={styles.label}>
                  Message *
                </label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className={styles.textarea}
                  rows={5}
                  placeholder="Please describe your inquiry about this program..."
                  required
                  disabled={isSubmitting}
                />
              </div>

              {submitStatus === 'error' && (
                <div className={styles.errorMessage}>
                  Failed to send message. Please try again or contact the organization directly.
                </div>
              )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  onClick={handleClose}
                  className={styles.cancelButton}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.submitButton}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ContactFormModal;
