import { FaEye, FaEyeSlash } from "react-icons/fa"
import styles from "../accept.module.css"

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

export default PasswordInput
