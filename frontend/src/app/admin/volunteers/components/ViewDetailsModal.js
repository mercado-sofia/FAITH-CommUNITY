"use client"

import { useEffect, useRef } from 'react'

import styles from './styles/ViewDetailsModal.module.css'
import { IoClose } from "react-icons/io5"

// Constants for button styles
const BUTTON_STYLES = {
  DECLINE: {
    border: '2px solid #06100f',
    color: '#06100f',
    backgroundColor: '#ffffff'
  },
  ACCEPT: {
    border: '2px solid #06100f',
    color: '#ffffff',
    backgroundColor: '#06100f'
  }
}

export default function VolunteerDetailModal({ app, onClose, onUpdate }) {
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

            <form className={styles.formGrid}>
            {/* Data fields using full width */}
            <div className={styles.mainContainer}>
              {/* Left side - Data fields in 4 rows, now using full width */}
              <div className={styles.leftSide}>
                {/* Row 1: Name | Gender | Age */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Full Name</label>
                    <input type="text" value={app.name} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Gender</label>
                    <input type="text" value={app.gender} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Age</label>
                    <input type="text" value={app.age} readOnly className={styles.cleanInput} />
                  </div>
                </div>

                {/* Row 2: Email | Contact Number | Citizenship */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Email</label>
                    <input type="email" value={app.email} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Contact Number</label>
                    <input type="text" value={app.contact} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Citizenship</label>
                    <input type="text" value={app.citizenship} readOnly className={styles.cleanInput} />
                  </div>
                </div>

                {/* Row 3: Occupation */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Occupation</label>
                    <input type="text" value={app.occupation} readOnly className={styles.cleanInput} />
                  </div>
                </div>

                {/* Row 4: Address (full width) */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField} ${styles.fullWidthField}`}>
                    <label className={styles.label}>Address</label>
                    <input type="text" value={app.address} readOnly className={styles.cleanInput} />
                  </div>
                </div>
              </div>
            </div>

           {/* Row 5: Program (label and data side by side) */}
           <div className={styles.formGroupFull}>
             <div className={`${styles.labelDataRow} ${styles.programRow}`}>
               <label className={styles.label}>Program</label>
               <input type="text" value={app.program} readOnly className={styles.cleanInput} />
             </div>
           </div>

            {/* Row 6: Reason (label and data side by side) */}
            <div className={styles.formGroupFull}>
              <div className={styles.labelDataRow}>
                <label className={styles.label}>Reason</label>
                <textarea 
                  ref={reasonTextareaRef}
                  value={app.reason} 
                  readOnly 
                  className={styles.cleanTextarea}
                ></textarea>
              </div>
            </div>

           {/* Row 7: Submitted on (full width) */}
           <div className={styles.formGroupFull}>
             <label className={styles.label}>Submitted on</label>
             <input
               type="text"
               value={app.date ? new Date(app.date).toLocaleDateString() : 'N/A'}
               readOnly
               className={styles.cleanInput}
             />
           </div>
         </form>

        <div className={styles.actions}>
                     <button
             className={`${styles.actionButton} ${styles.decline} ${app.status !== 'Pending' ? styles.disabled : ''}`}
             onClick={(e) => {
               e.preventDefault()
               if (app.status === 'Pending') {
                 onUpdate(app.id, 'Declined')
                 onClose() // Auto close modal after action
               }
             }}
             disabled={app.status !== 'Pending'}
           >
             Decline
           </button>
           <button
             className={`${styles.actionButton} ${styles.accept} ${app.status !== 'Pending' ? styles.disabled : ''}`}
             onClick={(e) => {
               e.preventDefault()
               if (app.status === 'Pending') {
                 onUpdate(app.id, 'Approved')
                 onClose() // Auto close modal after action
               }
             }}
             disabled={app.status !== 'Pending'}
           >
             Accept
           </button>
        </div>
      </div>
    </div>
  )
}