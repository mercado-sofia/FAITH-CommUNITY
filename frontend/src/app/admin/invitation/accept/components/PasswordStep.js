import { FaSpinner, FaEye, FaEyeSlash, FaRegCircle, FaRegCheckCircle } from "react-icons/fa"
import styles from "../accept.module.css"

// Internal PasswordRequirements component
const PasswordRequirements = ({ passwordRequirements }) => {
  return (
    <div className={styles.passwordRequirements}>
      <h4 className={styles.passwordRequirementsTitle}>Password Requirements:</h4>
      <ul className={styles.requirementsList}>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.length ? styles.valid : ''}`}>
            {passwordRequirements.length ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.length ? styles.validText : ''}`}>
            Minimum of 8 characters
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.lowercase ? styles.valid : ''}`}>
            {passwordRequirements.lowercase ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.lowercase ? styles.validText : ''}`}>
            At least one lowercase letter (a-z)
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.uppercase ? styles.valid : ''}`}>
            {passwordRequirements.uppercase ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.uppercase ? styles.validText : ''}`}>
            At least one uppercase letter (A-Z)
          </span>
        </li>
        <li className={styles.requirementItem}>
          <div className={`${styles.checkIcon} ${passwordRequirements.number ? styles.valid : ''}`}>
            {passwordRequirements.number ? <FaRegCheckCircle /> : <FaRegCircle />}
          </div>
          <span className={`${styles.requirementText} ${passwordRequirements.number ? styles.validText : ''}`}>
            At least one number (0-9)
          </span>
        </li>
      </ul>
    </div>
  )
}

// Internal PasswordInput component
const PasswordInput = ({
  label,
  id,
  name,
  placeholder,
  value,
  onChange,
  required = false,
  disabled = false,
  fieldErrors,
  showPassword,
  setShowPassword
}) => {
  return (
    <div className={styles.formField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.passwordInputWrapper}>
        <input
          type={showPassword ? "text" : "password"}
          id={id}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`${styles.formInput} ${fieldErrors[name] ? styles.inputError : ''}`}
        />
        {value && (
          <button
            type="button"
            className={styles.passwordToggle}
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={-1}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
      </div>
      {fieldErrors[name] && <span className={styles.fieldError}>{fieldErrors[name]}</span>}
    </div>
  )
}

const PasswordStep = ({
  form,
  handleInputChange,
  fieldErrors,
  passwordRequirements,
  showPassword,
  showConfirmPassword,
  setShowPassword,
  setShowConfirmPassword,
  isSubmitting,
  handlePrevStep,
  handleSubmit
}) => {
  return (
    <div className={styles.stepContent}>
      <PasswordRequirements passwordRequirements={passwordRequirements} />

      <PasswordInput
        label="Password"
        id="password"
        name="password"
        placeholder="Enter secure password"
        value={form.password}
        onChange={handleInputChange}
        required
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
      />

      <PasswordInput
        label="Confirm Password"
        id="confirmPassword"
        name="confirmPassword"
        placeholder="Confirm your password"
        value={form.confirmPassword}
        onChange={handleInputChange}
        required
        disabled={isSubmitting}
        fieldErrors={fieldErrors}
        showPassword={showConfirmPassword}
        setShowPassword={setShowConfirmPassword}
      />

      <div className={styles.stepActions}>
        <button 
          type="button" 
          onClick={handlePrevStep}
          className={styles.backButton}
          disabled={isSubmitting}
        >
          Back to Step 1
        </button>
        <button 
          type="submit" 
          className={styles.submitButton} 
          disabled={isSubmitting || !passwordRequirements.length || !passwordRequirements.lowercase || !passwordRequirements.uppercase || !passwordRequirements.number}
          onClick={handleSubmit}
        >
          {isSubmitting ? <FaSpinner className={styles.spinner} /> : "Create Account"}
        </button>
      </div>
    </div>
  )
}

export default PasswordStep