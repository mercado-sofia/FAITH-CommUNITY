import { FaSpinner } from "react-icons/fa"
import PasswordRequirements from "./PasswordRequirements"
import PasswordInput from "./PasswordInput"
import styles from "../accept.module.css"

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
