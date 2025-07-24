"use client"

import { useEffect } from "react"
import styles from "./styles/Toast.module.css"

export default function Toast({ message, type = "success", onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`${styles.toast} ${styles[`toast${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      <div className={styles.toastContent}>
        <span className={styles.toastMessage}>{message}</span>
        <button onClick={onClose} className={styles.toastClose}>
          ×
        </button>
      </div>
    </div>
  )
}