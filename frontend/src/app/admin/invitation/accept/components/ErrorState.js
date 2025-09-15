import { useRouter } from "next/navigation"
import styles from "../accept.module.css"

const ErrorState = ({ error }) => {
  const router = useRouter()

  return (
    <div className={styles.container}>
      <div className={styles.errorCard}>
        <h1>Invalid Invitation</h1>
        <p>{error}</p>
        <button 
          onClick={() => router.push("/")} 
          className={styles.homeButton}
        >
          Go to Home
        </button>
      </div>
    </div>
  )
}

export default ErrorState
