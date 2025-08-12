'use client'

import Image from 'next/image'
import { FaEdit, FaEnvelope, FaFacebookF } from 'react-icons/fa'
import styles from './styles/OrgInfoSection.module.css'

export default function OrgInfoSection({
  orgData,
  message,
  isEditing,
  setIsEditing,
  setShowEditModal,
  setOriginalData,
  setEditPreviewData
}) {
  const handleEditClick = () => {
    setOriginalData({ ...orgData })
    setEditPreviewData({ ...orgData })
    setIsEditing(true)
    setShowEditModal(true)
  }

  return (
    <div className={styles.section}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Organization Details</h2>
        {!isEditing && (
          <button
            onClick={handleEditClick}
            className={styles.editIcon}
            title="Edit Organization Information"
          >
            <FaEdit />
          </button>
        )}
      </div>

      {message.text && !message.section && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.contentLayout}>
        {/* Logo Section */}
        <div className={styles.logoSection}>
          <div className={styles.logoContainer}>
            {orgData.logo ? (
              <Image
                src={orgData.logo}
                alt="Organization Logo"
                width={120}
                height={120}
                className={styles.logo}
                priority
                onError={(e) => {
                  console.error('Image failed to load:', orgData.logo);
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className={styles.logoPlaceholder}>
                No Logo
              </div>
            )}
          </div>
        </div>

        {/* Organization Details Section */}
        <div className={styles.detailsSection}>
          <div className={styles.orgNameDisplay}>
            <div className={styles.orgAcronym}>{orgData.org || "Not specified"}</div>
            <div className={styles.orgFullName}>{orgData.orgName || "Not specified"}</div>
          </div>

          <div className={styles.contactIcons}>
            {orgData.email && (
              <a href={`mailto:${orgData.email}`} className={styles.iconLink}>
                <FaEnvelope className={styles.contactIcon} />
              </a>
            )}
            {orgData.facebook && (
              <a 
                href={orgData.facebook} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.iconLink}
              >
                <FaFacebookF className={styles.contactIcon} />
              </a>
            )}
          </div>

          <div className={styles.inlineGroup}>
            <span className={styles.inlineLabel}>Description:</span>
            <span className={styles.inlineData}>{orgData.description || "No description provided"}</span>
          </div>
        </div>
      </div>
    </div>
  )
}