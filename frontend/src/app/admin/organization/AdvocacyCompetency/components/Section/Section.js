'use client'

import { FaEdit } from 'react-icons/fa'
import { sectionConfigs } from '../../config'
import styles from './Section.module.css'

export default function Section({ 
  type, // 'advocacy' or 'competency'
  data, 
  setIsEditing, 
  setShowEditModal, 
  setOriginalData, 
  setCurrentSection,
  setTempEditData 
}) {
  const config = sectionConfigs[type]

  if (!config) {
    console.error(`Invalid section type: ${type}`)
    return null
  }

  const handleEditClick = () => {
    setOriginalData({ ...data })
    setTempEditData({ ...data }) // Initialize temp data with current values
    setIsEditing(true)
    setCurrentSection(type)
    setShowEditModal(true)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>{config.title}</h2>
        <button
          onClick={handleEditClick}
          className={styles.editIcon}
          title={`Edit ${config.title} Information`}
        >
          <FaEdit />
        </button>
      </div>

      <div className={styles.contentLayout}>
        <div className={styles.detailsSection}>
          <div className={styles.textContent}>
            {data[config.field] || config.placeholder}
          </div>
        </div>
      </div>
    </div>
  )
}
