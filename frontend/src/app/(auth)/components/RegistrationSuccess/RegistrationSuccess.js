'use client'
import { useRouter } from 'next/navigation'
import { FaEnvelopeOpenText } from 'react-icons/fa6'
import { FaEnvelope } from 'react-icons/fa'
import styles from './RegistrationSuccess.module.css'

export default function RegistrationSuccess({ registrationData }) {
  const router = useRouter()

  return (
    <>
      <div className={styles.form}>
        <div className={styles.contentContainer}>
          <FaEnvelopeOpenText size={40} className={styles.welcomeIcon} />
          
          <p className={styles.welcomeText}>
            Welcome to FAITH CommUNITY!
          </p>
          
          <p className={styles.descriptionText}>
            Your account has been created successfully. To complete your registration, please <strong>verify your email address</strong>.
          </p>
          
          <div className={styles.emailContainer}>
            <div className={styles.emailHeader}>
              <FaEnvelope className={styles.emailIcon} />
              <span className={styles.emailTitle}>Check Your Email</span>
            </div>
            <p className={styles.emailText}>
              We&apos;ve sent a verification link to <strong className={styles.emailAddress}>{registrationData?.user?.email}</strong>
            </p>
          </div>
          
          <p className={styles.instructionText}>
            Click the verification link in your email to activate your account. The link will expire in 24 hours.
          </p>
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
