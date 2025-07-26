'use client'

import styles from './styles/OrgInfoSection.module.css'

export default function OrgInfoSection({
  orgData,
  setOrgData,
  isEditing,
  errors,
  setErrors,
  uploading,
  setUploading,
  message,
  handleInputChange,
  handleFileUpload,
  handleSave,
  handleCancel,
  saving
}) {
  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Organization Details</h2>


      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Organization Logo:
          {isEditing ? (
            <div className={styles.fileUpload}>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading}
                className={styles.fileInput}
              />
              {uploading && <span className={styles.uploadingText}>Uploading...</span>}
            </div>
          ) : null}
          <div className={styles.logoContainer}>
            {orgData.logo ? (
              <img
                src={orgData.logo}
                alt="Organization Logo"
                width={120}
                height={120}
                className={styles.logo}
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
        </label>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Organization Acronym: <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="org"
          value={orgData.org}
          onChange={(e) => setOrgData({...orgData, org: e.target.value})}
          className={`${styles.input} ${errors.org ? styles.inputError : ""}`}
          placeholder="e.g., FAITH"
          autoComplete="organization"
        />
        {errors.org && <span className={styles.errorText}>{errors.org}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Organization Name: <span className={styles.required}>*</span>
        </label>
        <input
          type="text"
          id="orgName"
          value={orgData.orgName}
          onChange={(e) => setOrgData({...orgData, orgName: e.target.value})}
          className={`${styles.input} ${errors.orgName ? styles.inputError : ""}`}
          placeholder="e.g., FAITH Community Organization"
          autoComplete="organization-title"
        />
        {errors.orgName && <span className={styles.errorText}>{errors.orgName}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Email:</label>
        <input
          type="email"
          id="email"
          value={orgData.email}
          onChange={(e) => setOrgData({...orgData, email: e.target.value})}
          className={`${styles.input} ${errors.email ? styles.inputError : ""}`}
          placeholder="organization@example.com"
          autoComplete="email"
        />
        {errors.email && <span className={styles.errorText}>{errors.email}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>Facebook Link:</label>
        <input
          type="url"
          id="facebook"
          value={orgData.facebook}
          onChange={(e) => setOrgData({...orgData, facebook: e.target.value})}
          className={`${styles.input} ${errors.facebook ? styles.inputError : ""}`}
          placeholder="https://facebook.com/yourorganization"
          autoComplete="url"
        />
        {errors.facebook && <span className={styles.errorText}>{errors.facebook}</span>}
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>
          Description:
          {isEditing ? (
            <textarea
              name="description"
              value={orgData.description}
              onChange={handleInputChange}
              className={styles.textarea}
              placeholder="Brief description of your organization"
              rows={4}
            />
          ) : (
            <p className={styles.displayText}>{orgData.description || "No description provided"}</p>
          )}
        </label>
      </div>

      {isEditing && (
        <div className={styles.actionButtons}>
          <button 
            onClick={handleCancel} 
            className={styles.cancelBtn}
            disabled={saving}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className={styles.saveBtn}
            disabled={saving || uploading}
          >
            {saving ? (
              <>
                <span className={styles.spinner}></span>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </button>
        </div>
      )}
    </div>
  )
}