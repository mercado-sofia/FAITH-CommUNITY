"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "./reset-password.module.css"
import { FaLock, FaEye, FaEyeSlash, FaSpinner } from "react-icons/fa"
import { LuCircleCheck } from "react-icons/lu"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState("")
  const [userType, setUserType] = useState("admin") // Default to admin
  const [focusedField, setFocusedField] = useState("")
  const [isValidatingToken, setIsValidatingToken] = useState(true)
  const [isTokenValid, setIsTokenValid] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  // Function to validate token
  const validateToken = async (tokenToValidate, userTypeToValidate) => {
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
      let validateEndpoint
      
      switch (userTypeToValidate) {
        case "superadmin":
          validateEndpoint = `${API_BASE_URL}/api/superadmin/auth/validate-reset-token`
          break
        case "user":
          validateEndpoint = `${API_BASE_URL}/api/users/validate-reset-token`
          break
        case "admin":
        default:
          validateEndpoint = `${API_BASE_URL}/api/admins/validate-reset-token`
          break
      }

      const response = await fetch(validateEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: tokenToValidate }),
      })

      if (response.ok) {
        setIsTokenValid(true)
      } else {
        setIsTokenValid(false)
        const data = await response.json()
        setMessage(data.error || "Invalid or expired reset link. Please request a new password reset.")
      }
    } catch (error) {
      console.error("Token validation error:", error)
      setIsTokenValid(false)
      setMessage("Network error. Please try again.")
    } finally {
      setIsValidatingToken(false)
    }
  }

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    const typeParam = searchParams.get("type")
    
    if (!tokenParam) {
      setMessage("Invalid reset link. Please request a new password reset.")
      setIsValidatingToken(false)
      return
    }
    
    setToken(tokenParam)
    
    // Set user type based on URL parameter
    let userTypeToSet = "admin" // Default to admin for backward compatibility
    if (typeParam === "superadmin" || typeParam === "user") {
      userTypeToSet = typeParam
    }
    setUserType(userTypeToSet)
    
    // Validate the token
    validateToken(tokenParam, userTypeToSet)
  }, [searchParams])

  const getResetEndpoint = () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    
    switch (userType) {
      case "superadmin":
        return `${API_BASE_URL}/api/superadmin/auth/reset-password`
      case "user":
        return `${API_BASE_URL}/api/users/reset-password`
      case "admin":
      default:
        return `${API_BASE_URL}/api/admins/reset-password`
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    if (newPassword.length < 8) {
      setMessage("Password must be at least 8 characters long")
      return
    }

    // Check for at least one lowercase letter
    if (!/(?=.*[a-z])/.test(newPassword)) {
      setMessage("Password must contain at least one lowercase letter")
      return
    }

    // Check for at least one uppercase letter
    if (!/(?=.*[A-Z])/.test(newPassword)) {
      setMessage("Password must contain at least one uppercase letter")
      return
    }

    // Check for at least one number
    if (!/(?=.*\d)/.test(newPassword)) {
      setMessage("Password must contain at least one number")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch(getResetEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          token,
          newPassword 
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setIsSuccess(true)
        setMessage(data.message)
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage(data.error || "Failed to reset password")
      }
    } catch (error) {
      console.error("Reset password error:", error)
      setMessage("Network error. Please try again.")
    }

    setIsLoading(false)
  }

  const handleFocus = (fieldName) => {
    setFocusedField(fieldName)
  }

  const handleBlur = (fieldName) => {
    setFocusedField("")
  }

  const handleBackToLogin = () => {
    router.push("/login")
  }

  const getUserTypeDisplay = () => {
    switch (userType) {
      case "superadmin":
        return "Superadmin"
      case "user":
        return "User"
      case "admin":
      default:
        return "Admin"
    }
  }

  // Show loading state while validating token
  if (isValidatingToken) {
    return (
      <div className={styles.container}>
        <div className={styles.leftPane}>
          <span className={styles.resetLabel}>Reset Password</span>
        </div>
        <div className={styles.rightPane}>
          <div className={styles.contentContainer}>
            <div className={styles.loadingContainer}>
              <FaSpinner className={styles.spinner} />
              <h2 className={styles.title}>Validating Reset Link...</h2>
              <p className={styles.description}>Please wait while we verify your reset link.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Show error if token is invalid or missing
  if (!token || !isTokenValid) {
    return (
      <div className={styles.container}>
        <div className={styles.leftPane}>
          <span className={styles.resetLabel}>Reset Password</span>
        </div>
        <div className={styles.rightPane}>
          <div className={styles.contentContainer}>
            <div className={styles.errorContainer}>
              <h2 className={styles.title}>Invalid Reset Link</h2>
              <p className={styles.errorMessage}>{message}</p>
              <button onClick={handleBackToLogin} className={styles.loginBtn}>
                Back to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <span className={styles.resetLabel}>Reset Password</span>
      </div>
      <div className={styles.rightPane}>
        <div className={styles.contentContainer}>
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <h2 className={styles.title}>Reset Your Password</h2>
              <p className={styles.description}>
                Enter your new password below for your {getUserTypeDisplay()} account. Make sure it&apos;s secure and easy to remember.
              </p>

              <label htmlFor="newPassword" className={`${styles.label} ${focusedField === 'newPassword' || newPassword ? styles.focused : ''}`}>
                New Password
              </label>
              <div className={styles.inputGroup}>
                <FaLock className={styles.icon} />
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onFocus={() => handleFocus('newPassword')}
                  onBlur={() => handleBlur('newPassword')}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>

              <label htmlFor="confirmPassword" className={`${styles.label} ${focusedField === 'confirmPassword' || confirmPassword ? styles.focused : ''}`}>
                Confirm New Password
              </label>
              <div className={styles.inputGroup}>
                <FaLock className={styles.icon} />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onFocus={() => handleFocus('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                  required
                  disabled={isLoading}
                  minLength={8}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  disabled={isLoading}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
                             </div>

               {/* Password Requirements */}
               <div className={styles.passwordRequirements}>
                 <h4>Password Requirements:</h4>
                 <ul>
                   <li className={newPassword && newPassword.length >= 8 ? styles.requirementMet : ''}>
                     <span className={styles.checkIcon}>
                       {newPassword && newPassword.length >= 8 ? '✓' : '○'}
                     </span>
                     Minimum of 8 characters
                   </li>
                   <li className={newPassword && /(?=.*[a-z])/.test(newPassword) ? styles.requirementMet : ''}>
                     <span className={styles.checkIcon}>
                       {newPassword && /(?=.*[a-z])/.test(newPassword) ? '✓' : '○'}
                     </span>
                     At least one lowercase letter (a-z)
                   </li>
                   <li className={newPassword && /(?=.*[A-Z])/.test(newPassword) ? styles.requirementMet : ''}>
                     <span className={styles.checkIcon}>
                       {newPassword && /(?=.*[A-Z])/.test(newPassword) ? '✓' : '○'}
                     </span>
                     At least one uppercase letter (A-Z)
                   </li>
                   <li className={newPassword && /(?=.*\d)/.test(newPassword) ? styles.requirementMet : ''}>
                     <span className={styles.checkIcon}>
                       {newPassword && /(?=.*\d)/.test(newPassword) ? '✓' : '○'}
                     </span>
                     At least one number (0-9)
                   </li>
                 </ul>
               </div>

               {message && (
                 <p className={styles.errorMessage}>
                   {message}
                 </p>
               )}

              <button type="submit" className={styles.loginBtn} disabled={isLoading}>
                Reset Password
                {isLoading && <FaSpinner className={styles.spinner} />}
              </button>
            </form>
          ) : (
            <div className={styles.successContainer}>
              <div className={styles.successIcon}>
                <LuCircleCheck />
              </div>
              <h2 className={styles.title}>Password Reset Successful!</h2>
              <p className={styles.successMessage}>{message}</p>
              <button onClick={handleBackToLogin} className={styles.loginBtn}>
                Back to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
