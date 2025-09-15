import { TbMessage2Exclamation } from "react-icons/tb"
import { useRouter } from "next/navigation"
import styles from "../accept.module.css"

const SuccessState = ({ success }) => {
  const router = useRouter()

  if (success === "Account created successfully! You can now log in.") {
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
              onClick={() => router.push("/login")} 
              className={styles.loginButton}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default SuccessState
