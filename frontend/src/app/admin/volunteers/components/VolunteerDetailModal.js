import styles from '../../styles/volunteers.module.css';
import { IoClose } from "react-icons/io5";

export default function VolunteerDetailModal({ app, onClose, onUpdate }) {
  return (
    <div className={styles.modal}>
      <div className={styles.modalContentScrollable}>
        <button className={styles.closeIcon} onClick={onClose}>
          <IoClose />
        </button>

        <h3 className={styles.modalHeading}>{app.full_name}'s Application</h3>

        <form className={styles.formGrid}>
          {/* Row 1: Full Name | Age | Gender */}
          <div className={styles.formGroup}>
            <label>Full Name</label>
            <input type="text" value={app.full_name} readOnly />
          </div>
          <div className={styles.formGroup}>
            <label>Age</label>
            <input type="text" value={app.age} readOnly />
          </div>
          <div className={styles.formGroup}>
            <label>Gender</label>
            <input type="text" value={app.gender} readOnly />
          </div>
        </form>

        {/* Row 2: Email | Contact No. */}
        <div className={styles.formRowTwo}>
          <div className={styles.formGroup}>
            <label>Email</label>
            <input type="email" value={app.email} readOnly />
          </div>
          <div className={styles.formGroup}>
            <label>Contact No.</label>
            <input type="text" value={app.phone_number} readOnly />
          </div>
        </div>

        {/* Address: Full Width */}
        <div className={styles.formGroupFull}>
          <label>Address</label>
          <input type="text" value={app.address} readOnly />
        </div>

        {/* Occupation | Citizenship */}
        <div className={styles.formRowTwo}>
          <div className={styles.formGroup}>
            <label>Occupation</label>
            <input type="text" value={app.occupation} readOnly />
          </div>
          <div className={styles.formGroup}>
            <label>Citizenship</label>
            <input type="text" value={app.citizenship} readOnly />
          </div>
        </div>

        {/* Submitted on – separate row, small width */}
        <div className={styles.formGroupSmall}>
          <label>Submitted on</label>
          <input 
            type="text" 
            value={app.created_at ? new Date(app.created_at).toLocaleString() : 'N/A'} 
            readOnly 
          />
        </div>

        {/* Program – full width */}
        <div className={styles.formGroupFull}>
          <label>Program</label>
          <input type="text" value={app.program} readOnly />
        </div>

        {/* Reason for Volunteering */}
        <div className={styles.formGroupFull}>
          <label>Reason for Volunteering</label>
          <textarea value={app.reason} rows="3" readOnly></textarea>
        </div>

        {/* Uploaded Valid ID */}
        {app.valid_id && (
          <div className={styles.formGroupFull}>
            <label>Uploaded Valid ID</label>
            <a
              href={`http://localhost:8080/uploads/${app.valid_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.validIdLink}
            >
              {app.valid_id.split('/').pop()}
            </a>
          </div>
        )}

        {app.status === 'Pending' && (
          <div className={styles.actions}>
            <button
              className={`${styles.actionButton} ${styles.approve}`}
              onClick={() => onUpdate(app.id, 'Approved')}
            >
              Approve
            </button>
            <button
              className={`${styles.actionButton} ${styles.reject}`}
              onClick={() => onUpdate(app.id, 'Rejected')}
            >
              Reject
            </button>
          </div>
        )}
      </div>
    </div>
  );
}