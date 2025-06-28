"use client"

import styles from "./Loader.module.css"

export default function Loader({ small = false }) {
  return (
    <div className={small ? styles.inlineLoader : styles.loaderContainer}>
      <div className={styles.spinner}></div>
    </div>
  )
}
