'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { FaEye, FaEyeSlash, FaCheck, FaSpinner } from 'react-icons/fa';
import { FiTrash2, FiX } from 'react-icons/fi';
import { PiWarningOctagonBold } from 'react-icons/pi';
import { getApiUrl, getAuthHeaders } from '../../../utils/api';
import styles from './DeleteAccount.module.css';

export default function DeleteAccount() {
  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [deleteSuccess, setDeleteSuccess] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Delete Account Functions
  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
    document.body.classList.add(styles.modalOpen);
  };

  const handleConfirmDelete = () => {
    setShowDeleteModal(false);
    setShowConfirmModal(true);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    document.body.classList.remove(styles.modalOpen);
  };

  const handleDeleteAccountSubmit = async (e) => {
    e.preventDefault();
    setDeleteError('');
    setDeleteSuccess('');
    setIsDeletingAccount(true);

    try {
      const response = await fetch(getApiUrl('/api/users/delete-account'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          password: deletePassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setDeleteSuccess('Your account has been permanently deleted');
        setTimeout(() => {
          localStorage.removeItem('userToken');
          localStorage.removeItem('userData');
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          localStorage.removeItem('userEmail');
          localStorage.removeItem('userName');
          document.cookie = 'userRole=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
          window.location.href = '/';
        }, 2000);
      } else {
        setDeleteError(data.message || 'Incorrect password, please try again');
      }
    } catch (error) {
      setDeleteError('An error occurred while deleting your account');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setShowConfirmModal(false);
    setDeletePassword('');
    setDeleteError('');
    setDeleteSuccess('');
    setShowDeletePassword(false);
    document.body.classList.remove(styles.modalOpen);
  };

  return (
    <>
      {/* Delete Account Section */}
      <div className={styles.deleteAccountSection}>
        <h3>Delete Account</h3>
        <div className={styles.deleteAccountInfo}>
          <div className={styles.infoBox}>
            <div className={styles.infoIcon}>
              <PiWarningOctagonBold />
            </div>
            <span>Account deletion is permanent and cannot be undone once confirmed.</span>
          </div>
          <p>To permanently delete your account, click the button below. This will remove all your data and you will lose access to all your information.</p>
        </div>
        <button 
          onClick={handleDeleteAccount} 
          className={styles.deleteAccountButton}
        >
          <FiTrash2 />
          Delete Account
        </button>
      </div>

      {/* Delete Account Modals */}
      {showDeleteModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.warningIconContainer}>
                <PiWarningOctagonBold />
              </div>
              <h2 className={styles.modalTitle}>Delete Account</h2>
            </div>
            
            <div className={styles.confirmDeleteMessage}>
              <p>Are you sure you want to delete your account? This action is permanent and cannot be undone.</p>
            </div>

            <div className={styles.confirmDeleteButtons}>
              <button 
                type="button" 
                className={styles.cancelBtn}
                onClick={handleCancelDelete}
                tabIndex="-1"
              >
                Cancel
              </button>
              <button 
                type="button" 
                className={styles.deleteBtn}
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      
      {/* Password Confirmation Modal */}
      {showConfirmModal && createPortal(
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.topRow}>
              <h3>Confirm Password</h3>
              
              <button 
                className={styles.closeBtn}
                onClick={closeDeleteModal}
                type="button"
                disabled={isDeletingAccount}
              >
                <FiX />
              </button>
            </div>

            <form onSubmit={handleDeleteAccountSubmit} className={styles.deleteForm}>
              {deleteError && (
                <div className={styles.deleteError}>
                  <FiX className={styles.errorIcon} />
                  {deleteError}
                </div>
              )}
              
              {deleteSuccess && (
                <div className={styles.deleteSuccess}>
                  <FaCheck className={styles.successIcon} />
                  {deleteSuccess}
                </div>
              )}

              <div className={styles.passwordField}>
                <label>Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showDeletePassword ? 'text' : 'password'}
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() => setShowDeletePassword(!showDeletePassword)}
                    tabIndex="-1"
                  >
                    {showDeletePassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className={styles.actions}>
                <button 
                  type="button" 
                  className={styles.cancelBtn}
                  onClick={closeDeleteModal}
                  disabled={isDeletingAccount}
                  tabIndex="-1"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.deleteBtn}
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? <FaSpinner className={styles.spinner} /> : null}
                  Delete
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
