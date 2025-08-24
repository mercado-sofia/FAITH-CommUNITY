'use client'

import { FaEdit } from 'react-icons/fa'
import styles from './SectionStyles.module.css'

export default function CompetencySection({ 
  competencyData, 
  setIsEditing, 
  setShowEditModal, 
  setOriginalData, 
  setCurrentSection,
  setTempEditData 
}) {
  const handleEditClick = () => {
    setOriginalData({ ...competencyData })
    setTempEditData({ ...competencyData }) // Initialize temp data with current values
    setIsEditing(true)
    setCurrentSection('competency')
    setShowEditModal(true)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Competency</h2>
        <button
          onClick={handleEditClick}
          className={styles.editIcon}
          title="Edit Competency Information"
        >
          <FaEdit />
        </button>
      </div>



      <div className={styles.contentLayout}>
        <div className={styles.detailsSection}>
          <div className={styles.textContent}>
            {competencyData.competency || "No competency information specified"}
          </div>
        </div>
      </div>
    </div>
  )
}
