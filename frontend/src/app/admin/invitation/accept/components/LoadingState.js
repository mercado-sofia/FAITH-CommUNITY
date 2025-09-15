import styles from "../accept.module.css"

const LoadingState = () => {
  return (
    <div className={styles.container}>
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Validating invitation...</p>
      </div>
    </div>
  )
}

export default LoadingState
