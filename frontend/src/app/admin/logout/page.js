'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FiLogOut } from 'react-icons/fi'
import styles from '../components/styles/sidebar.module.css'

export default function LogoutModalTrigger() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = '/login'
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