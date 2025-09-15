import { FaRegCircle, FaRegCheckCircle } from "react-icons/fa"
import styles from "../accept.module.css"

const PasswordRequirements = ({ passwordRequirements }) => {
  return (
    <div className={styles.passwordRequirements}>
      <h4 className={styles.passwordRequirementsTitle}>Password Requirements:</h4>
      <ul className={styles.requirementsList}>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.length ? styles.valid : ''}`}>
            {passwordRequirements.length ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.length ? styles.validText : ''}`}>
            Minimum of 8 characters
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.lowercase ? styles.valid : ''}`}>
            {passwordRequirements.lowercase ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.lowercase ? styles.validText : ''}`}>
            At least one lowercase letter (a-z)
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.uppercase ? styles.valid : ''}`}>
            {passwordRequirements.uppercase ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.uppercase ? styles.validText : ''}`}>
            At least one uppercase letter (A-Z)
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.number ? styles.valid : ''}`}>
            {passwordRequirements.number ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.number ? styles.validText : ''}`}>
            At least one number (0-9)
          </span>
        </li>
      </ul>
    </div>
  )
}

export default PasswordRequirements
