'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FaSignOutAlt } from 'react-icons/fa'
import styles from '../styles/sidebar.module.css'

export default function LogoutModalTrigger() {
  const [showModal, setShowModal] = useState(false)
  const router = useRouter()

  const handleLogout = () => {
    localStorage.removeItem('token')
    router.push('/login')
  }

  return (
    <>
      <button
        className={`${styles.navLogout} ${styles.logoutLink}`}
        onClick={() => setShowModal(true)}
      >
        <FaSignOutAlt className={styles.icon} />
        <span>Logout</span>
      </button>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <p>Are you sure you want to log out?</p>
            <div className={styles.buttonGroup}>
              <button className={styles.confirmBtn} onClick={handleLogout}>
                Yes
              </button>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}