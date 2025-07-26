// OrgHeader.js
"use client"

import styles from "./styles/OrgHeader.module.css"

export default function OrgHeader({ isEditing, setIsEditing, orgData, setOriginalData }) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>Organization Information</h1>
      {!isEditing && (
        <button
          onClick={() => {
            setOriginalData({ ...orgData })
            setIsEditing(true)
          }}
          className={styles.editBtn}
        >
          Edit Information
        </button>
      )}
    </div>
  )
}