"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import styles from "./signup.module.css"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaVenusMars } from "react-icons/fa"
import Image from "next/image"

export default function SignupPage() {
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
  
  const router = useRouter()

  const validateForm = () => {
    const errors = {}
    
    if (!formData.firstName.trim()) errors.firstName = "First name is required"
    if (!formData.lastName.trim()) errors.lastName = "Last name is required"
    if (!formData.email.trim()) errors.email = "Email is required"
    if (!formData.contactNumber.trim()) errors.contactNumber = "Contact number is required"
    if (!formData.gender) errors.gender = "Gender is required"
    if (!formData.address.trim()) errors.address = "Address is required"
    if (!formData.birthDate) errors.birthDate = "Birth date is required"
    if (!formData.password) errors.password = "Password is required"
    if (!formData.confirmPassword) errors.confirmPassword = "Please confirm your password"
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (formData.email && !emailRegex.test(formData.email)) {
      errors.email = "Please enter a valid email address"
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
      } else if (!/(?=.*[@$!%*?&])/.test(formData.password)) {
        errors.password = "Password must contain at least one special character (@$!%*?&)"
      }
    }
    
    // Confirm password validation
    if (formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }
    
    // Age validation (must be at least 18)
    if (formData.birthDate) {
      const today = new Date()
      const birthDate = new Date(formData.birthDate)
      const age = today.getFullYear() - birthDate.getFullYear()
      const monthDiff = today.getMonth() - birthDate.getMonth()
      
      if (age < 18 || (age === 18 && monthDiff < 0) || (age === 18 && monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        errors.birthDate = "You must be at least 18 years old to register"
      }
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
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)
    setFieldErrors({})

    try {
      // Validate form
      const errors = validateForm()
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        setIsLoading(false)
        return
      }

      const response = await fetch("http://localhost:8080/api/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          contactNumber: formData.contactNumber.trim(),
          gender: formData.gender,
          address: formData.address.trim(),
          birthDate: formData.birthDate,
          password: formData.password
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // Store user token and data
        localStorage.setItem("userToken", data.token)
        localStorage.setItem("userData", JSON.stringify(data.user))
        
        // Redirect to home page
        router.push("/")
      } else {
        setErrorMessage(data.error || "Registration failed")
        setShowError(true)
      }
    } catch (error) {
      console.error("Registration error:", error)
      setErrorMessage("Network error. Please try again.")
      setShowError(true)
    }

    setIsLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <span className={styles.signupLabel}>Sign Up</span>
      </div>
      <div className={styles.rightPane}>
        <div className={styles.logoWrapper}>
          <Image src="/logo/faith_community_logo.png" alt="Logo" width={80} height={80} />
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <h2 className={styles.title}>Create Account</h2>

          {/* First Name */}
          <label htmlFor="firstName" className={styles.label}>
            First Name
          </label>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              id="firstName"
              type="text"
              name="firstName"
              placeholder="Enter your first name"
              aria-label="First Name"
              autoComplete="given-name"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.firstName ? styles.inputError : ""}
            />
          </div>
          {fieldErrors.firstName && <span className={styles.errorMessage}>{fieldErrors.firstName}</span>}

          {/* Last Name */}
          <label htmlFor="lastName" className={styles.label}>
            Last Name
          </label>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              id="lastName"
              type="text"
              name="lastName"
              placeholder="Enter your last name"
              aria-label="Last Name"
              autoComplete="family-name"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.lastName ? styles.inputError : ""}
            />
          </div>
          {fieldErrors.lastName && <span className={styles.errorMessage}>{fieldErrors.lastName}</span>}

          {/* Email */}
          <label htmlFor="email" className={styles.label}>
            Email Address
          </label>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email address"
              aria-label="Email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.email ? styles.inputError : ""}
            />
          </div>
          {fieldErrors.email && <span className={styles.errorMessage}>{fieldErrors.email}</span>}

          {/* Contact Number */}
          <label htmlFor="contactNumber" className={styles.label}>
            Contact Number
          </label>
          <div className={styles.inputGroup}>
            <FaPhone className={styles.icon} />
            <input
              id="contactNumber"
              type="tel"
              name="contactNumber"
              placeholder="Enter your contact number"
              aria-label="Contact Number"
              autoComplete="tel"
              value={formData.contactNumber}
              onChange={(e) => handleInputChange("contactNumber", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.contactNumber ? styles.inputError : ""}
            />
          </div>
          {fieldErrors.contactNumber && <span className={styles.errorMessage}>{fieldErrors.contactNumber}</span>}

          {/* Gender */}
          <label htmlFor="gender" className={styles.label}>
            Gender
          </label>
          <div className={styles.inputGroup}>
            <FaVenusMars className={styles.icon} />
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={(e) => handleInputChange("gender", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.gender ? styles.inputError : ""}
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          {fieldErrors.gender && <span className={styles.errorMessage}>{fieldErrors.gender}</span>}

          {/* Address */}
          <label htmlFor="address" className={styles.label}>
            Address
          </label>
          <div className={styles.inputGroup}>
            <FaMapMarkerAlt className={styles.icon} />
            <textarea
              id="address"
              name="address"
              placeholder="Enter your complete address"
              aria-label="Address"
              autoComplete="street-address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.address ? styles.inputError : ""}
              rows={3}
            />
          </div>
          {fieldErrors.address && <span className={styles.errorMessage}>{fieldErrors.address}</span>}

          {/* Birth Date */}
          <label htmlFor="birthDate" className={styles.label}>
            Birth Date
          </label>
          <div className={styles.inputGroup}>
            <FaCalendarAlt className={styles.icon} />
            <input
              id="birthDate"
              type="date"
              name="birthDate"
              aria-label="Birth Date"
              autoComplete="bday"
              value={formData.birthDate}
              onChange={(e) => handleInputChange("birthDate", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.birthDate ? styles.inputError : ""}
            />
          </div>
          {fieldErrors.birthDate && <span className={styles.errorMessage}>{fieldErrors.birthDate}</span>}

          {/* Password */}
          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Create a strong password"
              aria-label="Password"
              autoComplete="new-password"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
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
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {fieldErrors.password && <span className={styles.errorMessage}>{fieldErrors.password}</span>}

          {/* Confirm Password */}
          <label htmlFor="confirmPassword" className={styles.label}>
            Confirm Password
          </label>
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm your password"
              aria-label="Confirm Password"
              autoComplete="new-password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              required
              disabled={isLoading}
              className={fieldErrors.confirmPassword ? styles.inputError : ""}
            />
            <button
              type="button"
              className={styles.passwordToggle}
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              disabled={isLoading}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <span className={styles.errorMessage}>{fieldErrors.confirmPassword}</span>}

          {showError && (
            <p className={styles.errorMessage}>
              {errorMessage || "Registration failed. Please try again."}
            </p>
          )}

          <button type="submit" className={styles.signupBtn} disabled={isLoading}>
            {isLoading ? "Creating Account..." : "Create Account"}
          </button>

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
      </div>
    </div>
  )
}
