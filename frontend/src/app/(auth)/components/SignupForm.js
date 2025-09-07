"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "../signup/signup.module.css"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaVenusMars, FaSpinner } from "react-icons/fa"
import CustomDropdown from "./CustomDropdown"

export default function SignupForm({ onRegistrationSuccess }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    contactNumber: "",
    gender: "",
    address: "",
    birthDate: "",
    password: "",
    confirmPassword: ""
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [focusedFields, setFocusedFields] = useState({})
  
  const router = useRouter()

  const validateStep1 = () => {
    const errors = {}
    let hasEmptyFields = false
    
    if (!formData.firstName.trim()) {
      errors.firstName = true
      hasEmptyFields = true
    }
    if (!formData.lastName.trim()) {
      errors.lastName = true
      hasEmptyFields = true
    }
    if (!formData.email.trim()) {
      errors.email = true
      hasEmptyFields = true
    }
    if (!formData.contactNumber.trim()) {
      errors.contactNumber = true
      hasEmptyFields = true
    }
    if (!formData.gender) {
      errors.gender = true
      hasEmptyFields = true
    }
    if (!formData.address.trim()) {
      errors.address = true
      hasEmptyFields = true
    }
    
    // Birth date required validation
    if (!formData.birthMonth && !formData.birthDay && !formData.birthYear) {
      errors.birthDate = true
      hasEmptyFields = true
    }
    
    // Birth date validation
    if (formData.birthMonth || formData.birthDay || formData.birthYear) {
      const month = parseInt(formData.birthMonth, 10)
      const day = parseInt(formData.birthDay, 10)
      const year = parseInt(formData.birthYear, 10)
      
      if (!formData.birthMonth || !formData.birthDay || !formData.birthYear) {
        errors.birthDate = "Please complete all date fields"
      } else if (isNaN(month) || isNaN(day) || isNaN(year)) {
        errors.birthDate = "Please enter valid numbers"
      } else if (month < 1 || month > 12) {
        errors.birthDate = "Please enter a valid month (1-12)"
      } else if (day < 1 || day > 31) {
        errors.birthDate = "Please enter a valid day (1-31)"
      } else if (year < 1900 || year > new Date().getFullYear()) {
        errors.birthDate = "Please enter a valid year"
      }
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address"
    }
    
    // Add general error message if there are empty fields
    if (hasEmptyFields) {
      errors.general = "Please input all fields"
    }
    
    return errors
  }

  const validateStep2 = () => {
    const errors = {}
    let hasEmptyFields = false
    
    if (!formData.password) {
      errors.password = "Password is required"
      hasEmptyFields = true
    }
    if (!formData.confirmPassword) {
      errors.confirmPassword = "Please confirm your password"
      hasEmptyFields = true
    }
    
    // Password validation
    if (formData.password) {
      if (formData.password.length < 8) {
        errors.password = "Password must be at least 8 characters long"
      } else if (!/(?=.*[a-z])/.test(formData.password)) {
        errors.password = "Password must contain at least one lowercase letter"
      } else if (!/(?=.*[A-Z])/.test(formData.password)) {
        errors.password = "Password must contain at least one uppercase letter"
      } else if (!/(?=.*\d)/.test(formData.password)) {
        errors.password = "Password must contain at least one number"
      }
    }
    
    // Confirm password validation
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    
    // Add general error message if there are empty fields
    if (hasEmptyFields) {
      errors.general = "Please input all fields"
    }
    
    return errors
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setShowError(false)
    
    // Clear field-specific error
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: "" }))
    }
    
    // Clear general error message if all required fields are now filled
    if (fieldErrors.general) {
      let hasEmptyFields = false
      
      // Check step 1 fields
      if (currentStep === 1) {
        hasEmptyFields = !formData.firstName?.trim() || 
                        !formData.lastName?.trim() || 
                        !formData.email?.trim() || 
                        !formData.contactNumber?.trim() || 
                        !formData.gender || 
                        !formData.address?.trim() || 
                        (!formData.birthMonth && !formData.birthDay && !formData.birthYear)
      }
      
      // Check step 2 fields - use the updated value for the current field
      if (currentStep === 2) {
        const updatedPassword = field === 'password' ? value : formData.password
        const updatedConfirmPassword = field === 'confirmPassword' ? value : formData.confirmPassword
        hasEmptyFields = !updatedPassword || !updatedConfirmPassword
      }
      
      if (!hasEmptyFields) {
        setFieldErrors(prev => ({ ...prev, general: "" }))
      }
    }
  }

  const handleBirthMonthChange = (value) => {
    const numbers = value.replace(/\D/g, '')
    let formatted = ''
    if (numbers.length >= 1) {
      formatted = numbers.substring(0, 2)
    }
    setFormData(prev => ({ ...prev, birthMonth: formatted }))
    setShowError(false)
    // Clear birth date error when any date field changes
    if (fieldErrors.birthDate) {
      setFieldErrors(prev => ({ ...prev, birthDate: "" }))
    }
    
    // Clear general error message if all required fields are now filled
    if (fieldErrors.general) {
      const hasEmptyFields = !formData.firstName?.trim() || 
                            !formData.lastName?.trim() || 
                            !formData.email?.trim() || 
                            !formData.contactNumber?.trim() || 
                            !formData.gender || 
                            !formData.address?.trim() || 
                            (!formatted && !formData.birthDay && !formData.birthYear)
      
      if (!hasEmptyFields) {
        setFieldErrors(prev => ({ ...prev, general: "" }))
      }
    }
  }

  const handleBirthDayChange = (value) => {
    const numbers = value.replace(/\D/g, '')
    let formatted = ''
    if (numbers.length >= 1) {
      formatted = numbers.substring(0, 2)
    }
    setFormData(prev => ({ ...prev, birthDay: formatted }))
    setShowError(false)
    // Clear birth date error when any date field changes
    if (fieldErrors.birthDate) {
      setFieldErrors(prev => ({ ...prev, birthDate: "" }))
    }
    
    // Clear general error message if all required fields are now filled
    if (fieldErrors.general) {
      const hasEmptyFields = !formData.firstName?.trim() || 
                            !formData.lastName?.trim() || 
                            !formData.email?.trim() || 
                            !formData.contactNumber?.trim() || 
                            !formData.gender || 
                            !formData.address?.trim() || 
                            (!formData.birthMonth && !formatted && !formData.birthYear)
      
      if (!hasEmptyFields) {
        setFieldErrors(prev => ({ ...prev, general: "" }))
      }
    }
  }

  const handleBirthYearChange = (value) => {
    const numbers = value.replace(/\D/g, '')
    let formatted = ''
    if (numbers.length >= 1) {
      formatted = numbers.substring(0, 4)
    }
    setFormData(prev => ({ ...prev, birthYear: formatted }))
    setShowError(false)
    // Clear birth date error when any date field changes
    if (fieldErrors.birthDate) {
      setFieldErrors(prev => ({ ...prev, birthDate: "" }))
    }
    
    // Clear general error message if all required fields are now filled
    if (fieldErrors.general) {
      const hasEmptyFields = !formData.firstName?.trim() || 
                            !formData.lastName?.trim() || 
                            !formData.email?.trim() || 
                            !formData.contactNumber?.trim() || 
                            !formData.gender || 
                            !formData.address?.trim() || 
                            (!formData.birthMonth && !formData.birthDay && !formatted)
      
      if (!hasEmptyFields) {
        setFieldErrors(prev => ({ ...prev, general: "" }))
      }
    }
  }



  const handleConfirmPasswordChange = (value) => {
    setFormData(prev => ({
      ...prev,
      confirmPassword: value
    }))
    
    // Clear confirm password error when user starts typing
    if (fieldErrors.confirmPassword) {
      setFieldErrors(prev => ({
        ...prev,
        confirmPassword: ""
      }))
    }
    
    // Clear general error only when both password fields are filled
    if (fieldErrors.general && value && formData.password) {
      setFieldErrors(prev => ({
        ...prev,
        general: ""
      }))
    }
    
    // Clear showError when user starts typing
    if (showError) {
      setShowError(false)
      setErrorMessage("")
    }
  }

  const handleFocus = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: true }))
  }

  const handleBlur = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: false }))
    
    // Auto-format single digits with leading zeros when leaving the field
    if (fieldName === "birthDate") {
      if (formData.birthMonth && formData.birthMonth.length === 1 && parseInt(formData.birthMonth) > 0) {
        setFormData(prev => ({ ...prev, birthMonth: '0' + formData.birthMonth }))
      }
      if (formData.birthDay && formData.birthDay.length === 1 && parseInt(formData.birthDay) > 0) {
        setFormData(prev => ({ ...prev, birthDay: '0' + formData.birthDay }))
      }
    }
  }

  const handleNext = () => {
    const errors = validateStep1()
    setFieldErrors(errors)
    
    if (Object.keys(errors).length === 0) {
      setCurrentStep(2)
    }
  }

  const handlePrev = () => {
    setCurrentStep(1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const errors = validateStep2()
    setFieldErrors(errors)
    
    if (Object.keys(errors).length > 0) {
      return
    }
    
    setIsLoading(true)
    setShowError(false)
    
    try {
      // Format birth date for backend with proper leading zeros
      const formattedMonth = formData.birthMonth.padStart(2, '0')
      const formattedDay = formData.birthDay.padStart(2, '0')
      const birthDate = `${formattedMonth}/${formattedDay}/${formData.birthYear}`
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      const response = await fetch(`${API_BASE_URL}/api/users/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          birthDate
        }),
      })
      
      const data = await response.json()
      
      if (response.ok) {
        if (data.requiresVerification) {
          // Call the success callback to show verification message
          onRegistrationSuccess(data)
        } else {
          // Store user token and data (for backward compatibility)
          localStorage.setItem("userToken", data.token)
          localStorage.setItem("userData", JSON.stringify(data.user))
          
          // Redirect to home page
          router.push("/")
        }
      } else {
        setErrorMessage(data.error || "Registration failed")
        setShowError(true)
      }
    } catch (error) {
      console.error("Registration error:", error)
      setErrorMessage("Network error. Please try again.")
      setShowError(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <h2 className={styles.title}>Create Account</h2>
      
      <div className={styles.stepIndicator}>
        <div className={`${styles.step} ${currentStep === 1 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>1</div>
          <span>Personal Information</span>
        </div>
        <div className={`${styles.stepDivider} ${currentStep >= 2 ? styles.active : ''}`}></div>
        <div className={`${styles.step} ${currentStep === 2 ? styles.active : ''}`}>
          <div className={styles.stepNumber}>2</div>
          <span>Account Security</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
                 {currentStep === 1 && (
           <>
             <p className={styles.stepSubheading}>Please provide your personal details to create your account.</p>

             {/* Name Row */}
             <div className={styles.nameRow}>
               <div className={`${styles.inputGroup} ${focusedFields.firstName || formData.firstName ? styles.focused : ''}`}>
                 <FaUser className={styles.icon} />
                 <input
                   id="firstName"
                   type="text"
                   name="firstName"
                   placeholder="First name"
                   aria-label="First Name"
                   autoComplete="given-name"
                   value={formData.firstName}
                   onChange={(e) => handleInputChange("firstName", e.target.value)}
                   onFocus={() => handleFocus('firstName')}
                   onBlur={() => handleBlur('firstName')}
                   required
                   disabled={isLoading}
                   className={fieldErrors.firstName ? styles.inputError : ""}
                 />
               </div>
               <div className={`${styles.inputGroup} ${focusedFields.lastName || formData.lastName ? styles.focused : ''}`}>
                 <FaUser className={styles.icon} />
                 <input
                   id="lastName"
                   type="text"
                   name="lastName"
                   placeholder="Last name"
                   aria-label="Last Name"
                   autoComplete="family-name"
                   value={formData.lastName}
                   onChange={(e) => handleInputChange("lastName", e.target.value)}
                   onFocus={() => handleFocus('lastName')}
                   onBlur={() => handleBlur('lastName')}
                   required
                   disabled={isLoading}
                   className={fieldErrors.lastName ? styles.inputError : ""}
                 />
               </div>
             </div>

            {/* Email */}
            <div className={`${styles.inputGroup} ${focusedFields.email || formData.email ? styles.focused : ''}`}>
              <FaUser className={styles.icon} />
              <input
                id="email"
                type="email"
                name="email"
                placeholder="Email address"
                aria-label="Email Address"
                autoComplete="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                onFocus={() => handleFocus('email')}
                onBlur={() => handleBlur('email')}
                required
                disabled={isLoading}
                className={fieldErrors.email ? styles.inputError : ""}
              />
            </div>
            {fieldErrors.email && <span className={styles.errorMessage}>{fieldErrors.email}</span>}

            {/* Contact Number */}
            <div className={`${styles.inputGroup} ${focusedFields.contactNumber || formData.contactNumber ? styles.focused : ''}`}>
              <FaPhone className={styles.icon} />
              <input
                id="contactNumber"
                type="tel"
                name="contactNumber"
                placeholder="Contact number"
                aria-label="Contact Number"
                autoComplete="tel"
                value={formData.contactNumber}
                onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                onFocus={() => handleFocus('contactNumber')}
                onBlur={() => handleBlur('contactNumber')}
                required
                disabled={isLoading}
                className={fieldErrors.contactNumber ? styles.inputError : ""}
              />
            </div>


            {/* Gender and Birth Date Row */}
            <div className={styles.genderBirthDateRow}>
              <div className={styles.fieldWrapper}>
                <label 
                  htmlFor="gender" 
                  className={`${styles.birthDateLabel} ${focusedFields.gender || formData.gender ? styles.focused : ''} ${fieldErrors.gender ? styles.labelError : ''}`}
                >
                  Gender
                </label>
                   <div className={`${styles.inputGroup} ${formData.gender ? styles.hasValue : ''} ${focusedFields.gender ? styles.focused : ''}`}>
                   <FaVenusMars className={styles.icon} />
                   <CustomDropdown
                     options={[
                       { value: "", label: "Select" },
                       { value: "Male", label: "Male" },
                       { value: "Female", label: "Female" },
                       { value: "Other", label: "Other" }
                     ]}
                     value={formData.gender}
                     onChange={(value) => handleInputChange("gender", value)}
                     placeholder="Select"
                     disabled={isLoading}
                     error={fieldErrors.gender}
                     onFocus={() => handleFocus('gender')}
                     onBlur={() => handleBlur('gender')}
                   />
                 </div>
              </div>
              <div className={styles.fieldWrapper}>
                <label 
                  htmlFor="birthDate" 
                  className={`${styles.birthDateLabel} ${focusedFields.birthDate || formData.birthMonth || formData.birthDay || formData.birthYear ? styles.focused : ''} ${fieldErrors.birthDate ? styles.labelError : ''}`}
                >
                  Birth Date
                </label>
                <div className={styles.birthDateInputs}>
                  <div className={styles.dateInputGroup}>
                                          <input
                        type="text"
                        placeholder="mm"
                        maxLength={2}
                        value={formData.birthMonth || ''}
                        onChange={(e) => handleBirthMonthChange(e.target.value)}
                        onFocus={() => handleFocus('birthDate')}
                        onBlur={() => handleBlur('birthDate')}
                        className={fieldErrors.birthDate ? styles.inputError : ""}
                      />
                  </div>
                  <span className={styles.dateSeparator}>/</span>
                  <div className={styles.dateInputGroup}>
                                          <input
                        type="text"
                        placeholder="dd"
                        maxLength={2}
                        value={formData.birthDay || ''}
                        onChange={(e) => handleBirthDayChange(e.target.value)}
                        onFocus={() => handleFocus('birthDate')}
                        onBlur={() => handleBlur('birthDate')}
                        className={fieldErrors.birthDate ? styles.inputError : ""}
                      />
                  </div>
                  <span className={styles.dateSeparator}>/</span>
                  <div className={styles.dateInputGroup}>
                                          <input
                        type="text"
                        placeholder="yyyy"
                        maxLength={4}
                        value={formData.birthYear || ''}
                        onChange={(e) => handleBirthYearChange(e.target.value)}
                        onFocus={() => handleFocus('birthDate')}
                        onBlur={() => handleBlur('birthDate')}
                        className={fieldErrors.birthDate ? styles.inputError : ""}
                      />
                  </div>
                </div>
              </div>
            </div>
            {(fieldErrors.gender || fieldErrors.birthDate) && <span className={styles.errorMessage}>{fieldErrors.birthDate}</span>}

                         {/* Address */}
             <div className={`${styles.inputGroup} ${focusedFields.address || formData.address ? styles.focused : ''}`}>
               <FaMapMarkerAlt className={styles.icon} />
               <input
                 id="address"
                 type="text"
                 name="address"
                 placeholder="Complete address"
                 aria-label="Address"
                 autoComplete="street-address"
                 value={formData.address}
                 onChange={(e) => handleInputChange("address", e.target.value)}
                 onFocus={() => handleFocus('address')}
                 onBlur={() => handleBlur('address')}
                 required
                 disabled={isLoading}
                 className={fieldErrors.address ? styles.inputError : ""}
               />
             </div>

             {/* General error message for step 1 */}
             {fieldErrors.general && (
               <p className={styles.errorMessage} style={{ alignSelf: 'flex-start', marginBottom: '1rem' }}>
                 {fieldErrors.general}
               </p>
             )}

             {showError && (
               <p className={styles.errorMessage}>
                 {errorMessage || "Registration failed. Please try again."}
               </p>
             )}

             <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handleNext}
                className={styles.nextBtn}
                disabled={isLoading}
              >
                Next
              </button>
            </div>
          </>
        )}

        {currentStep === 2 && (
          <>
            <p className={styles.stepSubheading}>Set up a secure password for your account.</p>

            {/* General error message for step 2 */}
            {fieldErrors.general && (
              <p className={styles.errorMessage}>
                {fieldErrors.general}
              </p>
            )}

            {showError && (
              <p className={styles.errorMessage}>
                {errorMessage || "Registration failed. Please try again."}
              </p>
            )}

            {/* Password */}
            <div className={`${styles.inputGroup} ${focusedFields.password || formData.password ? styles.focused : ''}`}>
              <FaLock className={styles.icon} />
                              <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Password"
                  aria-label="Password"
                  autoComplete="off"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  onFocus={() => handleFocus('password')}
                  onBlur={() => handleBlur('password')}
                  required
                  disabled={isLoading}
                  className={fieldErrors.password ? styles.inputError : ""}
                />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                disabled={isLoading}
                tabIndex="-1"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {fieldErrors.password && <span className={styles.errorMessage}>{fieldErrors.password}</span>}

            {/* Confirm Password */}
            <div className={`${styles.inputGroup} ${focusedFields.confirmPassword || formData.confirmPassword ? styles.focused : ''}`}>
              <FaLock className={styles.icon} />
              <input
                id="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                placeholder="Confirm password"
                aria-label="Confirm Password"
                autoComplete="off"
                value={formData.confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                onFocus={() => handleFocus('confirmPassword')}
                onBlur={() => handleBlur('confirmPassword')}
                required
                disabled={isLoading || !formData.password}
                className={fieldErrors.confirmPassword ? styles.inputError : ""}
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                disabled={isLoading || !formData.password}
                tabIndex="-1"
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {fieldErrors.confirmPassword && <span className={styles.errorMessage}>{fieldErrors.confirmPassword}</span>}

            {/* Password Requirements */}
            <div className={styles.passwordRequirements}>
              <h4>Password Requirements:</h4>
              <ul>
                <li className={formData.password && formData.password.length >= 8 ? styles.requirementMet : ''}>
                  <span className={styles.checkIcon}>
                    {formData.password && formData.password.length >= 8 ? '✓' : '○'}
                  </span>
                  Minimum of 8 characters
                </li>
                <li className={formData.password && /(?=.*[a-z])/.test(formData.password) ? styles.requirementMet : ''}>
                  <span className={styles.checkIcon}>
                    {formData.password && /(?=.*[a-z])/.test(formData.password) ? '✓' : '○'}
                  </span>
                  At least one lowercase letter (a-z)
                </li>
                <li className={formData.password && /(?=.*[A-Z])/.test(formData.password) ? styles.requirementMet : ''}>
                  <span className={styles.checkIcon}>
                    {formData.password && /(?=.*[A-Z])/.test(formData.password) ? '✓' : '○'}
                  </span>
                  At least one uppercase letter (A-Z)
                </li>
                <li className={formData.password && /(?=.*\d)/.test(formData.password) ? styles.requirementMet : ''}>
                  <span className={styles.checkIcon}>
                    {formData.password && /(?=.*\d)/.test(formData.password) ? '✓' : '○'}
                  </span>
                  At least one number (0-9)
                </li>
              </ul>
            </div>

            <div className={styles.buttonGroup}>
              <button
                type="button"
                onClick={handlePrev}
                className={styles.prevBtn}
                disabled={isLoading}
              >
                Previous
              </button>
              <button type="submit" className={styles.signupBtn} disabled={isLoading}>
                <span>Create Account</span>
                {isLoading && <FaSpinner className={styles.spinner} />}
              </button>
            </div>
          </>
        )}

        <div className={styles.loginLink}>
          <p>
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className={styles.loginButton}
            >
              Log In
            </button>
          </p>
        </div>
      </form>
    </>
  )
}
