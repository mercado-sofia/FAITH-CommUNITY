"use client"

import { useEffect, useRef, useState } from "react"
import { FaTimes, FaUser, FaSpinner } from "react-icons/fa"
import styles from "./ForgotPasswordModal.module.css"

export default function ForgotPasswordModal({
  isOpen,
  email,
  setEmail,
  message,
  success,
  loading,
  onClose,
  onSubmit,
}) {
  const inputRef = useRef(null)
  const [focusedField, setFocusedField] = useState("")

  useEffect(() => {
    if (!isOpen) return
    inputRef.current?.focus()
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen, onClose])

  const handleFocus = (fieldName) => {
    setFocusedField(fieldName)
  }

  const handleBlur = () => {
    setFocusedField("")
  }

  if (!isOpen) return null

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="forgot-title">
        <div className={styles.modalHeader}>
          <h3 id="forgot-title">Forgot Password</h3>
          <button type="button" onClick={onClose} className={styles.closeButton} aria-label="Close">
            <FaTimes />
          </button>
        </div>

        {!success ? (
          <form onSubmit={onSubmit} className={styles.forgotPasswordForm}>
            <p className={styles.modalDescription}>
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>

            <label htmlFor="email" className={`${styles.label} ${focusedField === 'email' || email ? styles.focused : ''}`}>
              Email
            </label>
            <div className={styles.inputGroup}>
              <FaUser className={styles.icon} />
              <input
                ref={inputRef}
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => handleFocus('email')}
                onBlur={handleBlur}
                required
                disabled={loading}
              />
            </div>

            {message && <p className={styles.errorMessage}>{message}</p>}

            <button type="submit" className={styles.actionBtn} disabled={loading} aria-busy={loading}>
              Send Reset Link
              {loading && <FaSpinner className={styles.spinner} />}
            </button>
          </form>
        ) : (
          <div className={styles.successMessage}>
            <p>{message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className={styles.actionBtn}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
