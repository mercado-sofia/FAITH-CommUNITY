import styles from "../accept.module.css"

const StepIndicator = ({ currentStep }) => {
  return (
    <div className={styles.stepIndicator}>
      <div className={styles.stepLabels}>
        <div className={`${styles.stepLabel} ${currentStep >= 1 ? styles.active : ''}`}>
          Organization Details
        </div>
        <div className={`${styles.stepLabel} ${currentStep >= 2 ? styles.active : ''}`}>
          Password Setup
        </div>
      </div>
      <div className={styles.progressBar}>
        <div className={styles.progressFill} style={{ width: `${(currentStep / 2) * 100}%` }}></div>
      </div>
    </div>
  )
}

export default StepIndicator