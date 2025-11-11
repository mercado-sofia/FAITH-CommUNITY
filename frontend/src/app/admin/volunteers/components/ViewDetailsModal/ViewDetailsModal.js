"use client"

import { useEffect, useRef } from 'react'
import { formatDateShort } from '@/utils/dateUtils.js'

import styles from './ViewDetailsModal.module.css'
import { IoClose, IoPerson, IoMail, IoDocumentText } from "react-icons/io5"

export default function VolunteerDetailModal({ app, onClose }) {
  const reasonTextareaRef = useRef(null)

  // Auto-resize textarea based on content
  useEffect(() => {
    if (reasonTextareaRef.current) {
      const textarea = reasonTextareaRef.current
      textarea.style.height = 'auto'
      textarea.style.height = textarea.scrollHeight + 'px'
    }
  }, [app.reason])

  return (
    <div className={styles.modal}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Volunteer Application Details</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <IoClose />
          </button>
        </div>

        <div className={styles.applicantHeader}>
          <div className={styles.applicantName}>{app.name}</div>
          <div className={styles.applicantProgram}>{app.program}</div>
        </div>

        <div className={styles.contentWrapper}>
          <div className={styles.contentGrid}>
          {/* Personal Information */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <IoPerson className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Personal Information</h3>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Full Name</span>
              <span className={styles.infoValue}>{app.name}</span>
            </div>
            <div className={styles.infoRow}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Gender</span>
                <span className={styles.infoValue}>{app.gender}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Age</span>
                <span className={styles.infoValue}>{app.age}</span>
              </div>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Citizenship</span>
                <span className={styles.infoValue}>{app.citizenship}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Occupation</span>
                <span className={styles.infoValue}>{app.occupation}</span>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <IoMail className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Contact Information</h3>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Email Address</span>
                <span className={styles.infoValue}>{app.email}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Contact Number</span>
                <span className={styles.infoValue}>{app.contact}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Address</span>
                <span className={styles.infoValue}>{app.address}</span>
              </div>
            </div>
          </div>

          {/* Application Details */}
          <div className={styles.infoCard}>
            <div className={styles.cardHeader}>
              <IoDocumentText className={styles.cardIcon} />
              <h3 className={styles.cardTitle}>Application Details</h3>
            </div>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Program Applied</span>
                <span className={styles.infoValue}>{app.program}</span>
              </div>
              <div className={styles.infoItem}>
                <span className={styles.infoLabel}>Application Date</span>
                <span className={styles.infoValue}>
                  {app.date ? formatDateShort(app.date) : 'N/A'}
                </span>
              </div>
            </div>
            <div className={styles.reasonSection}>
              <span className={styles.infoLabel}>Reason for Application</span>
              <div className={styles.reasonText} ref={reasonTextareaRef}>
                {app.reason}
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
}