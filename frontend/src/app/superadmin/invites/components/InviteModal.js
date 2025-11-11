'use client';

import { useState } from 'react';
import { FiX, FiMail } from 'react-icons/fi';
import styles from './styles/InviteModal.module.css';

const InviteModal = ({ isOpen, onClose, onInvite, isInviting }) => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    try {
      await onInvite(email.trim());
      setEmail('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to send invitation');
    }
  };

  const handleClose = () => {
    setEmail('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2>Invite Admin</h2>
          <button
            onClick={handleClose}
            className={styles.closeButton}
            disabled={isInviting}
          >
            <FiX size={20} />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.description}>
            Send an invitation email to create a new admin account. The invitee will receive a link to set up their account.
          </p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formField}>
              <label htmlFor="email" className={styles.label}>
                Email Address *
              </label>
              <div className={styles.inputWrapper}>
                <FiMail className={styles.inputIcon} />
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@organization.com"
                  className={styles.input}
                  disabled={isInviting}
                  required
                />
              </div>
              {error && <span className={styles.errorText}>{error}</span>}
            </div>

            <div className={styles.modalActions}>
              <button
                type="submit"
                className={styles.inviteButton}
                disabled={isInviting || !email.trim()}
              >
                {isInviting ? 'Sending...' : 'Send Invitation'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default InviteModal;
