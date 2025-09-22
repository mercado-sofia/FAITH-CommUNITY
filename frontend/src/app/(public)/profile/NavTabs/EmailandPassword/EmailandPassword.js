'use client';

import { useState } from 'react';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import SecureEmailChange from './ManageEmail/SecureEmailChange';
import Password from './ManagePassword/Password';
import styles from './EmailandPassword.module.css';

export default function EmailandPassword({ userData, setUserData }) {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

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

      {/* Modal Components */}
      <SecureEmailChange 
        userData={userData} 
        setUserData={setUserData}
        showModal={showEmailModal}
        setShowModal={setShowEmailModal}
      />
      <Password 
        userData={userData} 
        setUserData={setUserData}
        showModal={showPasswordModal}
        setShowModal={setShowPasswordModal}
      />
    </div>
  );
}
