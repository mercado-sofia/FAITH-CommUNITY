"use client"

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { getVolunteerIdUrl } from '@/utils/uploadPaths'
import styles from './styles/ViewDetailsModal.module.css'
import { IoClose } from "react-icons/io5"

// Constants for magic numbers
const IMAGE_DIMENSIONS = {
  PREVIEW: { width: 200, height: 150 },
  FULL_SIZE: { width: 600, height: 400 }
}

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
  const [showImageModal, setShowImageModal] = useState(false)
  const [imageError, setImageError] = useState(false)
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
            {/* First 4 rows with Uploaded Valid ID spanning full height */}
            <div className={styles.mainContainer}>
              {/* Left side - Data fields in 4 rows */}
              <div className={styles.leftSide}>
                {/* Row 1: Name | Gender | Age */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Name</label>
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

                {/* Row 2: Email | Contact Number */}
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
                    {/* Empty space to maintain alignment */}
                  </div>
                </div>

                {/* Row 3: Occupation | Citizenship */}
                <div className={styles.dataRow}>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Occupation</label>
                    <input type="text" value={app.occupation} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    <label className={styles.label}>Citizenship</label>
                    <input type="text" value={app.citizenship} readOnly className={styles.cleanInput} />
                  </div>
                  <div className={`${styles.formGroup} ${styles.dataField}`}>
                    {/* Empty space to maintain alignment */}
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

              {/* Right side - Uploaded Valid ID spanning full height of 4 rows */}
              <div className={`${styles.formGroup} ${styles.rightSide}`}>
                <label className={styles.label}>Uploaded Valid ID</label>
                {app.validIdFilename ? (
                  <div className={`${styles.imagePreviewContainer} ${styles.imageContainer}`}>
                    {!imageError ? (
                      <>
                        <Image
                          src={getVolunteerIdUrl(app.validIdFilename)}
                          alt="Valid ID"
                          width={IMAGE_DIMENSIONS.PREVIEW.width}
                          height={IMAGE_DIMENSIONS.PREVIEW.height}
                          className={styles.imageWithHint}
                          onClick={() => setShowImageModal(true)}
                          onError={() => setImageError(true)}
                        />
                        <p className={`${styles.imageHint} ${styles.imageHintBottom}`}>Click image to view larger</p>
                      </>
                    ) : (
                      <div className={styles.imageError}>
                        <p>Image not available</p>
                        <a
                          href={getVolunteerIdUrl(app.validIdFilename)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.validIdLink}
                        >
                          Download: {app.validIdFilename}
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.noIdMessage}>
                    No ID uploaded
                  </div>
                )}
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

      {/* Full-size Image Modal */}
      {showImageModal && app.validIdFilename && (
        <div className={styles.imageModal} onClick={() => setShowImageModal(false)}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.imageModalClose} 
              onClick={() => setShowImageModal(false)}
            >
              <IoClose />
            </button>
            <Image
               src={getVolunteerIdUrl(app.validIdFilename)}
               alt="Valid ID - Full Size"
               width={IMAGE_DIMENSIONS.FULL_SIZE.width}
               height={IMAGE_DIMENSIONS.FULL_SIZE.height}
               className={styles.fullSizeImage}
             />
            <p className={styles.imageModalCaption}>
               {app.name}&apos;s Valid ID
             </p>
          </div>
        </div>
      )}
    </div>
  )
}