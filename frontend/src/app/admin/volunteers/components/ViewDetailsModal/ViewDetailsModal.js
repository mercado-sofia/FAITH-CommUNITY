"use client"

import { useEffect, useRef } from 'react'
import { formatDateShort } from '@/utils/dateUtils.js'

import styles from './ViewDetailsModal.module.css'
import { IoClose } from "react-icons/io5"

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
      <div className={styles.modalContentScrollable}>
        <button className={styles.closeIcon} onClick={onClose}>
          <IoClose />
        </button>

        <h3 className={styles.modalHeading}>{app.name}&apos;s Application</h3>

        <div className={styles.contentContainer}>
          {/* Personal Information Section */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Personal Information</h4>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Full Name</label>
                <div className={styles.fieldValue}>{app.name}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Gender</label>
                <div className={styles.fieldValue}>{app.gender}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Age</label>
                <div className={styles.fieldValue}>{app.age}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Citizenship</label>
                <div className={styles.fieldValue}>{app.citizenship}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Occupation</label>
                <div className={styles.fieldValue}>{app.occupation}</div>
              </div>
            </div>
          </section>

          {/* Contact Information Section */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Contact Information</h4>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Email</label>
                <div className={styles.fieldValue}>{app.email}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Contact Number</label>
                <div className={styles.fieldValue}>{app.contact}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Address</label>
                <div className={styles.fieldValue}>{app.address}</div>
              </div>
            </div>
          </section>

          {/* Application Details Section */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Application Details</h4>
            <div className={styles.fieldGrid}>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Program</label>
                <div className={styles.fieldValue}>{app.program}</div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>Submitted on</label>
                <div className={styles.fieldValue}>
                  {app.date ? formatDateShort(app.date) : 'N/A'}
                </div>
              </div>
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Reason for Application</label>
              <div className={styles.fieldValue} ref={reasonTextareaRef}>
                {app.reason}
              </div>
            </div>
          </section>
        </div>

      </div>
    </div>
  )
}