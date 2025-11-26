'use client'
import { useState } from 'react'
import { FiLogOut } from 'react-icons/fi'
import { logout, USER_TYPES } from '@/utils/shared/authService'
import styles from './Sidebar.module.css'

export default function LogoutModalTrigger({ userType = USER_TYPES.ADMIN }) {
  const [showModal, setShowModal] = useState(false)

  const handleLogout = async () => {
    await logout(userType, {
      showLoader: false,
      redirect: true,
      redirectPath: '/login'
    })
  }

  return (
    <>
      <button
        type="button"
        className={`${styles.navBase} ${styles.logoutLink}`}
        onClick={() => setShowModal(true)}
        id="logout-modal-trigger"
      >
        <FiLogOut className={styles.icon} />
        <span>Logout</span>
      </button>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.logoutIconWrapper}>
              <FiLogOut />
            </div>
            <div className={styles.modalTitle}>Logout</div>
            <div className={styles.modalText}>Are you sure you want to logout?</div>
            <div className={styles.buttonGroup}>
              <button className={styles.logoutTextBtn} onClick={handleLogout}>Logout</button>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

