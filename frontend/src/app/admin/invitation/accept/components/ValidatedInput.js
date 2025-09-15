import { FaCheck, FaTimes } from "react-icons/fa"
import styles from "../accept.module.css"

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

export default ValidatedInput
