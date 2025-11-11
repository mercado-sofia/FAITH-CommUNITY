import { useRouter } from "next/navigation"
import { PiCheckCircleBold, PiXCircleBold } from "react-icons/pi"
import { FaSignInAlt } from "react-icons/fa"
import { TbMessage2Exclamation } from "react-icons/tb"
import styles from "../accept.module.css"

const InvitationState = ({ type, success }) => {
  const router = useRouter()

  const handleGoToLogin = () => {
    router.push("/login")
  }

  // Error State
  if (type === "error") {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <div className={styles.errorHeader}>
            <PiXCircleBold className={styles.errorIcon} />
            <h1>Invalid Invitation</h1>
          </div>
          <p>
            This invitation link may have expired, been used already, or is invalid. 
            Please contact your administrator for a new invitation link if you need to set up an admin account.
          </p>
          <button 
            onClick={handleGoToLogin} 
            className={styles.homeButton}
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Already Accepted State
  if (type === "alreadyAccepted") {
    return (
      <div className={styles.container}>
        <div className={styles.alreadyAcceptedCard}>
          <div className={styles.alreadyAcceptedHeader}>
            <PiCheckCircleBold className={styles.alreadyAcceptedIcon} />
            <h1>Invitation Already Accepted</h1>
          </div>
          <p>
            This invitation has already been used to set up an admin account. 
            Please proceed to the login page to access your account.
          </p>
          <button 
            onClick={handleGoToLogin} 
            className={styles.alreadyAcceptedLoginButton}
          >
            <FaSignInAlt className={styles.buttonIcon} />
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  // Success State
  if (type === "success" && success === "Account created successfully! You can now log in.") {
    return (
      <div className={styles.container}>
        <div className={styles.successContainer}>
          <div className={styles.successIconContainer}>
            <TbMessage2Exclamation className={styles.successIconLarge} />
          </div>
          <h1 className={styles.successTitle}>Account Created Successfully!</h1>
          <p className={styles.successMessage}>You can now log in to your admin account.</p>
          <div className={styles.successActions}>
            <button 
              onClick={handleGoToLogin} 
              className={styles.loginButton}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Default case - return null if no valid state
  return null
}

export default InvitationState
