"use client";

import { useState, useEffect } from "react";
import { validateField, getFieldHelpText, getFieldPlaceholder } from "./validationUtils";
import styles from "./volunteerForm.module.css";

const FormField = ({
  type = "text",
  name,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  required = false,
  error,
  helpText,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [hasBlurred, setHasBlurred] = useState(false);
  const [fieldError, setFieldError] = useState(error);

  // Update field error when prop changes
  useEffect(() => {
    setFieldError(error);
  }, [error]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    onChange(e);
    
    // Clear error immediately when user starts typing
    if (fieldError) {
      setFieldError(null);
    }
    
    // Clear hasBlurred state when user starts typing
    if (hasBlurred) {
      setHasBlurred(false);
    }
  };

  const handleBlur = (e) => {
    setHasBlurred(true);
    setIsFocused(false);
    
    // Validate on blur
    const validationError = validateField(name, e.target.value);
    setFieldError(validationError);
    
    if (onBlur) {
      onBlur(e);
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const showError = fieldError; // Show error whenever there's a fieldError (from blur validation or form submission)
  const showHelpText = helpText && (isFocused || showError);

  const fieldHelpText = helpText || getFieldHelpText(name);
  const fieldPlaceholder = placeholder || getFieldPlaceholder(name);

  const inputProps = {
    id: name,
    name,
    value: value || "",
    onChange: handleChange,
    onBlur: handleBlur,
    onFocus: handleFocus,
    placeholder: fieldPlaceholder,
    required,
    className: `${styles.formInput} ${showError ? styles.inputError : ""} ${isFocused ? styles.inputFocused : ""} ${className}`,
    "aria-describedby": showHelpText ? `${name}-help` : undefined,
    "aria-invalid": showError ? "true" : "false",
    ...props
  };

  return (
    <div className={`${styles.formField} ${showError ? styles.fieldError : ""}`}>
      <label htmlFor={name} className={styles.fieldLabel}>
        {label}
        {required && <span className={styles.required}> *</span>}
      </label>
      
      {type === "textarea" ? (
        <textarea {...inputProps} />
      ) : (
        <input type={type} {...inputProps} />
      )}
      
      {showError && (
        <div className={styles.errorMessage} role="alert">
          {fieldError}
        </div>
      )}
      
      {showHelpText && (
        <div className={styles.helpText} id={`${name}-help`}>
          <span className={styles.helpIcon}>💡</span>
          {fieldHelpText}
        </div>
      )}
    </div>
  );
};

export default FormField;
