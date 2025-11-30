'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiMailSendLine } from 'react-icons/ri'
import { FaSpinner } from 'react-icons/fa'
import styles from './RegistrationSuccess.module.css'

export default function RegistrationSuccess({ registrationData }) {
  const router = useRouter()
  const [resendLoading, setResendLoading] = useState(false)
  const [resendMessage, setResendMessage] = useState('')
  const [resendError, setResendError] = useState(false)

  const handleResendVerification = async (e) => {
    e.preventDefault()
    setResendLoading(true)
    setResendMessage('')
    setResendError(false)

    const email = registrationData?.user?.email

    if (!email) {
      setResendMessage('Email address not found. Please try registering again.')
      setResendError(true)
      setResendLoading(false)
      return
    }

    try {
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/users/resend-verification`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      // Parse JSON with error handling
      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        try {
          const text = await response.text();
          data = text ? JSON.parse(text) : {};
        } catch (parseError) {
          console.error('JSON parse error:', parseError);
          setResendMessage('Invalid response from server. Please try again.')
          setResendError(true)
          setResendLoading(false)
          return
        }
      } else {
        // Non-JSON response
        setResendMessage('Unexpected response format from server. Please try again.')
        setResendError(true)
        setResendLoading(false)
        return
      }

      if (response.ok) {
        setResendMessage(data.message || 'Verification email sent successfully! Please check your email.')
        setResendError(false)
      } else {
        setResendMessage(data?.error || data?.message || 'Failed to resend verification email')
        setResendError(true)
      }
    } catch (error) {
      console.error('Resend verification error:', error)
      setResendMessage('Network error. Please try again.')
      setResendError(true)
    }

    setResendLoading(false)
  }

  return (
    <>
      <div className={styles.form}>
        <div className={styles.contentContainer}>
          <div className={styles.iconContainer}>
            <RiMailSendLine size={22} className={styles.welcomeIcon} />
          </div>
          
          <h1 className={styles.welcomeText}>
            Please verify your email
          </h1>
          
          <p className={styles.descriptionText}>
            You&apos;re almost there! We sent an email to
          </p>
          
          <p className={styles.emailAddress}>
            {registrationData?.user?.email}
          </p>
          
          <p className={styles.instructionText}>
            Just click on the link in that email to complete your signup. If you don&apos;t see it, you may need to <strong>check your spam folder</strong>.
          </p>
          
          <p className={styles.footerText}>
            Still can&apos;t find the email? No problem.
          </p>

          <button
            type="button"
            onClick={handleResendVerification}
            disabled={resendLoading}
            className={styles.resendButton}
          >
            {resendLoading ? (
              <>
                <FaSpinner className={styles.spinner} />
                <span>Sending...</span>
              </>
            ) : (
              'Resend Verification Email'
            )}
          </button>

          {resendMessage && (
            <p className={`${styles.resendMessage} ${resendError ? styles.error : styles.success}`}>
              {resendMessage}
            </p>
          )}
        </div>

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
    </>
  )
}
