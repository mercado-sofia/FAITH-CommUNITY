"use client"

import styles from "./Loader.module.css"

export default function Loader({ small = false, centered = false }) {
  let className = styles.loaderContainer;
  
  if (small) {
    className = centered ? styles.centeredLoader : styles.inlineLoader;
  }
  
  return (
    <div className={className}>
      <div className={styles.spinner}></div>
    </div>
  )
}