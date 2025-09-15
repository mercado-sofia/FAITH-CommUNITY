import Image from "next/image"
import styles from "../accept.module.css"

const LogoUpload = ({ 
  logoPreview, 
  handleLogoUpload, 
  removeLogo, 
  fieldErrors, 
  isSubmitting 
}) => {
  return (
    <div className={styles.formField}>
      <label>Organization Logo</label>
      <div className={styles.logoUploadContainer}>
        <div className={styles.logoPreview}>
          {logoPreview ? (
            <Image 
              src={logoPreview} 
              alt="Logo preview" 
              className={styles.logoImage}
              width={100}
              height={100}
              style={{ objectFit: 'cover' }}
            />
          ) : (
            <div className={styles.logoPlaceholder}>
              <span>No Image</span>
            </div>
          )}
        </div>
        <div className={styles.logoActions}>
          <div className={styles.buttonRow}>
            <input
              type="file"
              id="logo"
              name="logo"
              accept="image/*"
              onChange={handleLogoUpload}
              disabled={isSubmitting}
              className={styles.fileInput}
            />
            <label htmlFor="logo" className={styles.uploadButton}>
              Upload
            </label>
            {logoPreview && (
              <button
                type="button"
                onClick={removeLogo}
                className={styles.removeButton}
                disabled={isSubmitting}
              >
                Remove
              </button>
            )}
          </div>
          <div className={styles.fileInfo}>
            JPG, PNG or HEIC 5 MB Max
          </div>
        </div>
      </div>
      {fieldErrors.logo && <span className={styles.fieldError}>{fieldErrors.logo}</span>}
    </div>
  )
}

export default LogoUpload
