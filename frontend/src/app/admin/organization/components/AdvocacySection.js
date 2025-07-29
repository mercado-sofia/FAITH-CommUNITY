'use client'

import { FaEdit } from 'react-icons/fa'
import styles from './styles/SectionStyles.module.css'

export default function AdvocacySection({ 
  advocacyData, 
  message, 
  setIsEditing, 
  setShowEditModal, 
  setOriginalData, 
  setCurrentSection,
  setTempEditData 
}) {
  const handleEditClick = () => {
    setOriginalData({ ...advocacyData })
    setTempEditData({ ...advocacyData }) // Initialize temp data with current values
    setIsEditing(true)
    setCurrentSection('advocacy')
    setShowEditModal(true)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Advocacy</h2>
        <button
          onClick={handleEditClick}
          className={styles.editIcon}
          title="Edit Advocacy Information"
        >
          <FaEdit />
        </button>
      </div>

      {message.text && message.section === 'advocacy' && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.contentLayout}>
        <div className={styles.detailsSection}>
          <div className={styles.textContent}>
            {advocacyData.advocacy || "No advocacy information specified"}
          </div>
        </div>
      </div>
    </div>
  )
}
