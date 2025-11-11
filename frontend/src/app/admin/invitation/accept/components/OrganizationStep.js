import Image from "next/image"
import { FaCheck, FaTimes } from "react-icons/fa"
import styles from "../accept.module.css"

// Internal LogoUpload component
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

// Internal ValidatedInput component
const ValidatedInput = ({
  label,
  id,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  fieldErrors,
  validationStatus,
  className = ""
}) => {
  return (
    <div className={styles.formField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputWrapper}>
        <input
          type={type}
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`${styles.formInput} ${
            fieldErrors[name] ? styles.inputError : ''
          } ${
            validationStatus[name]?.isValid === true ? styles.inputValid : ''
          } ${
            validationStatus[name]?.isValid === false ? styles.inputInvalid : ''
          } ${className}`}
        />
        {validationStatus[name]?.isValidating && (
          <div className={styles.validationSpinner}></div>
        )}
        {validationStatus[name]?.isValid === true && (
          <FaCheck className={`${styles.validationIcon} ${styles.valid}`} />
        )}
        {validationStatus[name]?.isValid === false && (
          <FaTimes className={`${styles.validationIcon} ${styles.invalid}`} />
        )}
      </div>
      {fieldErrors[name] && <span className={styles.fieldError}>{fieldErrors[name]}</span>}
      {validationStatus[name]?.message && !fieldErrors[name] && (
        <span className={`${styles.validationMessage} ${
          validationStatus[name]?.isValid === true ? styles.validationSuccess : ''
        } ${
          validationStatus[name]?.isValid === false ? styles.validationError : ''
        }`}>
          {validationStatus[name]?.message}
        </span>
      )}
    </div>
  )
}

const OrganizationStep = ({
  form,
  logoPreview,
  handleLogoUpload,
  removeLogo,
  handleInputChange,
  fieldErrors,
  validationStatus,
  isSubmitting,
  handleNextStep
}) => {
  return (
    <div className={styles.stepContent}>
      <LogoUpload
        logoPreview={logoPreview}
        handleLogoUpload={handleLogoUpload}
        removeLogo={removeLogo}
        fieldErrors={fieldErrors}
        isSubmitting={isSubmitting}
      />

      <ValidatedInput
        label="Organization Acronym"
        id="org"
        name="org"
        placeholder="e.g., FAIPS, FTL, FAHSS"
        value={form.org}
        onChange={handleInputChange}
        required
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        validationStatus={validationStatus}
      />

      <ValidatedInput
        label="Organization Name"
        id="orgName"
        name="orgName"
        placeholder="Full organization name"
        value={form.orgName}
        onChange={handleInputChange}
        required
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        validationStatus={validationStatus}
      />

      <div className={styles.stepActions}>
        <button 
          type="button" 
          onClick={handleNextStep}
          className={styles.nextButton}
          disabled={
            isSubmitting || 
            validationStatus.org.isValidating || 
            validationStatus.orgName.isValidating ||
            validationStatus.org.isValid === false ||
            validationStatus.orgName.isValid === false
          }
        >
          {validationStatus.org.isValidating || validationStatus.orgName.isValidating 
            ? "Validating..." 
            : "Next Step"
          }
        </button>
      </div>
    </div>
  )
}

export default OrganizationStep
