'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { FaEnvelope, FaSpinner } from 'react-icons/fa'
import { BiSolidMessageAltError } from 'react-icons/bi'
import { FiCheckCircle } from 'react-icons/fi'
import styles from './VerifyEmail.module.css'

export default function VerifyEmail({ token }) {
  const [verificationStatus, setVerificationStatus] = useState('verifying') // 'verifying', 'success', 'error'
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [showResendForm, setShowResendForm] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const hasVerified = useRef(false)
  
  const router = useRouter()

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error')
      setMessage('Invalid verification link. Please check your email for the correct link.')
      return
    }

    // Prevent multiple verification attempts
    if (!hasVerified.current) {
      hasVerified.current = true
      verifyEmail(token)
    }
  }, [token])

  const verifyEmail = async (verificationToken) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_BASE_URL}/api/users/verify-email?token=${verificationToken}`)
      const data = await response.json()
      
      if (response.ok) {
        setVerificationStatus('success')
        setMessage(data.message)
      } else {
        setVerificationStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationStatus('error')
      setMessage('Network error. Please try again.')
    }
  }

  const handleResendVerification = async (e) => {
    e.preventDefault()
    setResendLoading(true)
    setResendMessage('')

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_BASE_URL}/api/users/resend-verification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (response.ok) {
        setResendMessage(data.message)
        setShowResendForm(false)
      } else {
        setResendMessage(data.error || 'Failed to resend verification email')
      }
    } catch (error) {
      console.error('Resend error:', error)
      setResendMessage('Network error. Please try again.')
    }

    setResendLoading(false)
  }

  return (
    <>
      <h2 className={styles.title}>Email Verification</h2>
      
      <div className={styles.form}>
        {verificationStatus === 'verifying' && (
          <div className={styles.verifyingContainer}>
            <div>
              <FaSpinner size={40} className={`${styles.spinner} ${styles.verifyingSpinner}`} />
            </div>
            <p className={styles.verifyingText}>Verifying your email address...</p>
          </div>
        )}

            {verificationStatus === 'success' && (
      <div className={styles.successContainer}>
        <FiCheckCircle size={60} className={styles.successIcon} />
        <p className={styles.successMessage}>{message}</p>
        <div className={styles.buttonContainer}>
          <button
            onClick={() => router.push('/login')}
            className={styles.signupBtn}
          >
            Go to Login
          </button>
        </div>
      </div>
    )}

        {verificationStatus === 'error' && (
          <div className={styles.errorContainer}>
            <BiSolidMessageAltError size={60} className={styles.errorIcon} />
            <p className={styles.errorMessage}>{message}</p>
            
                    {!showResendForm ? (
          <div className={styles.buttonContainer}>
            <button
              onClick={() => setShowResendForm(true)}
              className={styles.signupBtn}
            >
              <FaEnvelope />
              <span>Resend Verification Email</span>
            </button>
          </div>
        ) : (
              <form onSubmit={handleResendVerification} className={styles.resendForm}>
                <div className={styles.inputGroup}>
                  <FaEnvelope className={styles.icon} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email address"
                  />
                </div>
                
                {resendMessage && (
                  <p className={`${styles.resendMessage} ${resendMessage.includes('successfully') ? styles.success : styles.error}`}>
                    {resendMessage}
                  </p>
                )}
                
                <div className={styles.buttonGroup}>
                  <button
                    type="submit"
                    disabled={resendLoading}
                    className={styles.signupBtn}
                  >
                    <span>Send Verification Email</span>
                    {resendLoading && <FaSpinner className={styles.spinner} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowResendForm(false)}
                    className={styles.prevBtn}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
            
            <div className={styles.loginLink}>
              <p>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => router.push("/login")}
                  className={styles.loginButton}
                >
                  Log In
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
