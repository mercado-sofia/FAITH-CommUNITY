'use client';

import { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import { EmailChange, PasswordChange } from '@/components';
import ChangeSuccessModal from '../../components/ChangeSuccessModal';
import styles from './EmailandPassword.module.css';

export default function EmailandPassword({ userData, setUserData }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successModalData, setSuccessModalData] = useState({
    changeType: 'email', // 'email' or 'password'
    newEmail: '',
    oldEmail: ''
  });

  // Success handlers
  const handleEmailChangeSuccess = (newEmail, oldEmail) => {
    setSuccessModalData({
      changeType: 'email',
      newEmail,
      oldEmail
    });
    setShowEmailModal(false);
    setShowSuccessModal(true);
    document.body.classList.remove('modalOpen');
  };

  const handlePasswordChangeSuccess = () => {
    setSuccessModalData({
      changeType: 'password',
      newEmail: '',
      oldEmail: ''
    });
    setShowPasswordModal(false);
    setShowSuccessModal(true);
    document.body.classList.remove('modalOpen');
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    document.body.classList.remove('modalOpen');
  };

  return (
    <div className={styles.emailPasswordSection}>
      <div className={styles.sectionHeader}>
        <h2>Email & Password</h2>
      </div>

      <div className={styles.emailPasswordContent}>
        {/* Email Section */}
        <div className={styles.emailSection}>
          <div className={styles.header}>
            <h2>Email</h2>
          </div>

          <div className={styles.emailContent}>
            {/* Current Email Display */}
            <div className={styles.infoItem}>
              <div className={styles.infoContent}>
                <label>Current Email</label>
                <p>{userData.email}</p>
              </div>
            </div>

            {/* Action Button */}
            <div className={styles.actionButtons}>
              <button 
                onClick={() => {
                  setShowEmailModal(true);
                  document.body.classList.add('modalOpen');
                }} 
                className={styles.changeEmailButton}
              >
                <FaEnvelope />
                <span>Change Email</span>
              </button>
            </div>
          </div>
        </div>

        {/* Password Section */}
        <div className={styles.passwordSection}>
          <div className={styles.header}>
            <h2>Password</h2>
          </div>

          <div className={styles.passwordContent}>
            {/* Current Password Display */}
            <div className={styles.infoItem}>
              <div className={styles.infoContent}>
                <label>Password Status</label>
                <p>For security, we recommend changing your password regularly.</p>
              </div>
            </div>

            {/* Action Button */}
            <div className={styles.actionButtons}>
              <button 
                onClick={() => {
                  setShowPasswordModal(true);
                  document.body.classList.add('modalOpen');
                }} 
                className={styles.changePasswordButton}
              >
                <FaLock />
                <span>Change Password</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Components - Rendered with Portal for proper overlay */}
      {showEmailModal && createPortal(
        <EmailChange 
          isOpen={showEmailModal}
          onClose={() => {
            setShowEmailModal(false);
            document.body.classList.remove('modalOpen');
          }}
          onSuccess={handleEmailChangeSuccess}
          userType="public"
          currentEmail={userData.email}
          showSuccessModal={false}
          setUserData={setUserData}
          setShowModal={setShowEmailModal}
        />,
        document.body
      )}
      
      {showPasswordModal && createPortal(
        <PasswordChange
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            document.body.classList.remove('modalOpen');
          }}
          onSuccess={handlePasswordChangeSuccess}
          userType="public"
          showSuccessModal={false}
          setUserData={setUserData}
          setShowModal={setShowPasswordModal}
        />,
        document.body
      )}

      {/* Success Modal - Already uses portal internally */}
      <ChangeSuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessModalClose}
        changeType={successModalData.changeType}
        newEmail={successModalData.newEmail}
        oldEmail={successModalData.oldEmail}
      />
    </div>
  );
}