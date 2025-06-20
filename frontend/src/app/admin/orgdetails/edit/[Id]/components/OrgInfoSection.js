"use client";

import styles from "../../../../styles/edit-orgdetails.module.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";

export default function OrgInfoSection({ org, setOrg, logoFile, setLogoFile }) {
  const handleOrgChange = (e) => {
    const { name, value } = e.target;
    setOrg((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <section className={styles.card}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionNumber}>1</span>
        <h2 className={styles.sectionTitle}>Organization Info</h2>
      </div>

      <div className={styles.formGroup}>
        <div className={`${styles.inputRow} ${styles.logoRow}`}>
          <label htmlFor="logo" className={styles.inputLabel}>Logo</label>
          <div className={styles.fileUploadWrapper}>
            <label className={styles.fileButton} htmlFor="logo">
              Choose File
              <input
                type="file"
                id="logo"
                name="logo"
                onChange={(e) => setLogoFile(e.target.files[0])}
                className={styles.hiddenFileInput}
              />
            </label>
            {logoFile && <span className={styles.fileName}>{logoFile.name}</span>}
          </div>
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="orgName" className={styles.inputLabel}>Organization Name</label>
          <input
            id="orgName"
            name="name"
            autoComplete="organization"
            className={styles.inputField}
            value={org.name}
            onChange={handleOrgChange}
            placeholder="Enter Organization Name"
          />
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="orgAcronym" className={styles.inputLabel}>Acronym</label>
          <input
            id="orgAcronym"
            name="acronym"
            autoComplete="off"
            className={styles.inputField}
            value={org.acronym}
            onChange={handleOrgChange}
            placeholder="Enter Organization's Acronym"
          />
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="orgFacebook" className={styles.inputLabel}>Facebook</label>
          <input
            id="orgFacebook"
            name="facebook"
            type="url"
            autoComplete="url"
            className={styles.inputField}
            value={org.facebook}
            onChange={handleOrgChange}
            placeholder="Facebook link"
          />
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="orgEmail" className={styles.inputLabel}>Email</label>
          <input
            id="orgEmail"
            name="email"
            type="email"
            autoComplete="email"
            className={styles.inputField}
            value={org.email}
            onChange={handleOrgChange}
            placeholder="Email address"
          />
        </div>

        <div className={styles.inputRow}>
          <label htmlFor="orgDescription" className={styles.inputLabel}>Description</label>
          <textarea
            id="orgDescription"
            name="description"
            autoComplete="off"
            className={styles.textarea}
            value={org.description}
            onChange={handleOrgChange}
            placeholder="Brief description"
          />
        </div>
      </div>
    </section>
  );
}