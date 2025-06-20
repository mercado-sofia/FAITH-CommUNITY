'use client';

import styles from "../../../../styles/edit-orgdetails.module.css";  
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";

export default function OrganizationHeadsSection({ heads, updateHead, deleteHead, addHead }) {
  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>3</span>
        <h2 className={styles.sectionTitle}>Organization Heads</h2>
      </div>

      {heads.map((head, i) => (
        <div key={i} className={styles.formGroup}>
          <div className={styles.inputRow}>
            <label htmlFor={`headImage_${i}`} className={styles.inputLabel}>Photo</label>
            <div className={styles.fileUploadWrapper}>
              <label className={styles.fileButton}>
                Choose File
                <input
                  type="file"
                  id={`headImage_${i}`}
                  name={`headImage_${i}`}
                  onChange={e => updateHead(i, 'image', e.target.files[0])}
                  className={styles.hiddenFileInput}
                />
              </label>
              {head.image && (
                <span className={styles.fileName}>
                  {head.image.name || "Current file"}
                </span>
              )}
            </div>
          </div>

          <div className={styles.inputRow}>
            <label htmlFor={`headName_${i}`} className={styles.inputLabel}>Full Name</label>
            <input
              id={`headName_${i}`}
              name={`headName_${i}`}
              autoComplete="off"
              className={styles.inputField}
              placeholder="Enter full name"
              value={head.name}
              onChange={e => updateHead(i, 'name', e.target.value)}
            />
          </div>

          <div className={styles.inputRow}>
            <label htmlFor={`headRole_${i}`} className={styles.inputLabel}>Role</label>
            <input
              id={`headRole_${i}`}
              name={`headRole_${i}`}
              autoComplete="off"
              className={styles.inputField}
              placeholder="Enter role"
              value={head.role}
              onChange={e => updateHead(i, 'role', e.target.value)}
            />
          </div>

          <div className={styles.inputRow}>
            <label htmlFor={`headFacebook_${i}`} className={styles.inputLabel}>Facebook</label>
            <input
              id={`headFacebook_${i}`}
              name={`headFacebook_${i}`}
              autoComplete="off"
              className={styles.inputField}
              placeholder="Facebook profile link"
              value={head.facebook}
              onChange={e => updateHead(i, 'facebook', e.target.value)}
            />
          </div>

          <div className={styles.inputRow}>
            <label htmlFor={`headEmail_${i}`} className={styles.inputLabel}>Email</label>
            <input
              id={`headEmail_${i}`}
              name={`headEmail_${i}`}
              autoComplete="email"
              className={styles.inputField}
              placeholder="Enter email"
              value={head.email}
              onChange={e => updateHead(i, 'email', e.target.value)}
            />
          </div>

          <button className={styles.removebtn} onClick={() => deleteHead(i)}>Remove</button>
        </div>
      ))}

      <div className={styles.addBtnContainer}>
        <button className={styles.addHeadbtn} onClick={addHead}>
          Add Head
        </button>
      </div>
    </section>
  );
}