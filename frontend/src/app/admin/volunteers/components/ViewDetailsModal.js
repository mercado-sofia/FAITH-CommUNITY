"use client"

import styles from './styles/ViewDetailsModal.module.css'
import { IoClose } from "react-icons/io5"

export default function VolunteerDetailModal({ app, onClose, onUpdate }) {
  return (
    <div className={styles.modal}>
      <div className={styles.modalContentScrollable}>
        <button className={styles.closeIcon} onClick={onClose}>
          <IoClose />
        </button>

        <h3 className={styles.modalHeading}>{app.name}&apos;s Application</h3>

        <form className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Full Name</label>
            <input type="text" value={app.name} readOnly className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Age</label>
            <input type="text" value={app.age} readOnly className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Gender</label>
            <input type="text" value={app.gender} readOnly className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Email</label>
            <input type="email" value={app.email} readOnly className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Contact No.</label>
            <input type="text" value={app.contact} readOnly className={styles.input} />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Address</label>
            <input type="text" value={app.address} readOnly className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Occupation</label>
            <input type="text" value={app.occupation} readOnly className={styles.input} />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.label}>Citizenship</label>
            <input type="text" value={app.citizenship} readOnly className={styles.input} />
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>Submitted on</label>
            <input
              type="text"
              value={app.date ? new Date(app.date).toLocaleDateString() : 'N/A'}
              readOnly
              className={styles.input}
            />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Program</label>
            <input type="text" value={app.program} readOnly className={styles.input} />
          </div>

          <div className={styles.formGroupFull}>
            <label className={styles.label}>Reason for Volunteering</label>
            <textarea value={app.reason} rows="3" readOnly className={styles.textarea}></textarea>
          </div>

          {app.validIdFilename && (
            <div className={styles.formGroupFull}>
              <label className={styles.label}>Uploaded Valid ID</label>
              <a
                href={`http://localhost:8080/uploads/${app.validIdFilename}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.validIdLink}
              >
                {app.validIdFilename}
              </a>
            </div>
          )}
        </form>

        {app.status === 'Pending' && (
          <div className={styles.actions}>
            <button
              className={`${styles.actionButton} ${styles.approve}`}
              onClick={(e) => {
                e.preventDefault()
                onUpdate(app.id, 'Approved')
              }}
            >
              Approve
            </button>
            <button
              className={`${styles.actionButton} ${styles.reject}`}
              onClick={(e) => {
                e.preventDefault()
                onUpdate(app.id, 'Declined')
              }}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  )
}