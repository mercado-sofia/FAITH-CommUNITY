"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "./reset-password.module.css"
import { FaSpinner } from "react-icons/fa"
import { LuCircleCheck } from "react-icons/lu"
import { AuthLeftPanel, PasswordField } from "../components"
import { postJson } from "../api/authClient"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
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

  const validateToken = async (tokenToValidate, userTypeToValidate) => {
    try {
      let validatePath
      switch (userTypeToValidate) {
        case "superadmin":
          validatePath = "/api/superadmin/auth/validate-reset-token"
          break
        case "user":
          validatePath = "/api/users/validate-reset-token"
          break
        case "admin":
        default:
          validatePath = "/api/admins/validate-reset-token"
          break
      }
      const { ok, data } = await postJson(validatePath, { token: tokenToValidate })
      if (ok) setIsTokenValid(true)
      else {
        setIsTokenValid(false)
        setMessage(data?.error || "Invalid or expired reset link. Please request a new password reset.")
      }
    } catch (error) {
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
    let userTypeToSet = "admin"
    if (typeParam === "superadmin" || typeParam === "user") userTypeToSet = typeParam
    setUserType(userTypeToSet)
    validateToken(tokenParam, userTypeToSet)
  }, [searchParams])

  const getResetPath = () => {
    switch (userType) {
      case "superadmin":
        return "/api/superadmin/auth/reset-password"
      case "user":
        return "/api/users/reset-password"
      case "admin":
      default:
        return "/api/admins/reset-password"
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) { setMessage("Passwords do not match"); return }
    if (newPassword.length < 8) { setMessage("Password must be at least 8 characters long"); return }
    if (!/(?=.*[a-z])/.test(newPassword)) { setMessage("Password must contain at least one lowercase letter"); return }
    if (!/(?=.*[A-Z])/.test(newPassword)) { setMessage("Password must contain at least one uppercase letter"); return }
    if (!/(?=.*\d)/.test(newPassword)) { setMessage("Password must contain at least one number"); return }

    setIsLoading(true)
    setMessage("")
    try {
      const { ok, data } = await postJson(getResetPath(), { token, newPassword })
      if (ok) {
        setIsSuccess(true)
        setMessage(data.message)
        setNewPassword("")
        setConfirmPassword("")
      } else {
        setMessage(data?.error || "Failed to reset password")
      }
    } catch (error) {
      setMessage("Network error. Please try again.")
    }
    setIsLoading(false)
  }

  const handleFocus = (fieldName) => { setFocusedField(fieldName) }
  const handleBlur = () => { setFocusedField("") }
  const handleBackToLogin = () => { router.push("/login") }

  const getUserTypeDisplay = () => {
    switch (userType) {
      case "superadmin": return "Superadmin"
      case "user": return "User"
      case "admin":
      default: return "Admin"
    }
  }

  if (isValidatingToken) {
    return (
      <div className={styles.container}>
        <AuthLeftPanel labelText="Reset Password" />
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

  if (!token || !isTokenValid) {
    return (
      <div className={styles.container}>
        <AuthLeftPanel labelText="Reset Password" />
        <div className={styles.rightPane}>
          <div className={styles.contentContainer}>
            <div className={styles.errorContainer}>
              <h2 className={styles.title}>Invalid Reset Link</h2>
              <p className={styles.errorMessage}>{message}</p>
              <button onClick={handleBackToLogin} className={styles.loginBtn}>Back to Login</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <AuthLeftPanel labelText="Reset Password" />
      <div className={styles.rightPane}>
        <div className={styles.contentContainer}>
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className={styles.form}>
              <h2 className={styles.title}>Reset Your Password</h2>
              <p className={styles.description}>Enter your new password below for your {getUserTypeDisplay()} account. Make sure it&apos;s secure and easy to remember.</p>

              <label htmlFor="newPassword" className={`${styles.label} ${focusedField === 'newPassword' || newPassword ? styles.focused : ''}`}>New Password</label>
              <PasswordField
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => handleFocus('newPassword')}
                onBlur={handleBlur}
                disabled={isLoading}
                ariaLabel="New password"
              />

              <label htmlFor="confirmPassword" className={`${styles.label} ${focusedField === 'confirmPassword' || confirmPassword ? styles.focused : ''}`}>Confirm New Password</label>
              <PasswordField
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onFocus={() => handleFocus('confirmPassword')}
                onBlur={handleBlur}
                disabled={isLoading}
                ariaLabel="Confirm password"
              />

              {/* Password Requirements */}
              <div className={styles.passwordRequirements}>
                <h4>Password Requirements:</h4>
                <ul>
                  <li className={newPassword && newPassword.length >= 8 ? styles.requirementMet : ''}><span className={styles.checkIcon}>{newPassword && newPassword.length >= 8 ? '✓' : '○'}</span>Minimum of 8 characters</li>
                  <li className={newPassword && /(?=.*[a-z])/.test(newPassword) ? styles.requirementMet : ''}><span className={styles.checkIcon}>{newPassword && /(?=.*[a-z])/.test(newPassword) ? '✓' : '○'}</span>At least one lowercase letter (a-z)</li>
                  <li className={newPassword && /(?=.*[A-Z])/.test(newPassword) ? styles.requirementMet : ''}><span className={styles.checkIcon}>{newPassword && /(?=.*[A-Z])/.test(newPassword) ? '✓' : '○'}</span>At least one uppercase letter (A-Z)</li>
                  <li className={newPassword && /(?=.*\d)/.test(newPassword) ? styles.requirementMet : ''}><span className={styles.checkIcon}>{newPassword && /(?=.*\d)/.test(newPassword) ? '✓' : '○'}</span>At least one number (0-9)</li>
                </ul>
              </div>

              {message && (<p className={styles.errorMessage}>{message}</p>)}

              <button type="submit" className={styles.loginBtn} disabled={isLoading} aria-busy={isLoading}>
                Reset Password
                {isLoading && <FaSpinner className={styles.spinner} />}
              </button>
            </form>
          ) : (
            <div className={styles.successContainer}>
              <div className={styles.successIcon}><LuCircleCheck /></div>
              <h2 className={styles.title}>Password Reset Successful!</h2>
              <p className={styles.successMessage}>{message}</p>
              <button onClick={handleBackToLogin} className={styles.loginBtn}>Back to Login</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}