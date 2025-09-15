import LogoUpload from "./LogoUpload"
import ValidatedInput from "./ValidatedInput"
import styles from "../accept.module.css"

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
