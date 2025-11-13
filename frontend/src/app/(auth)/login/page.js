"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginAdmin, loginSuperAdmin, logoutAdmin } from "../../../rtk/superadmin/adminSlice"
import styles from "./login.module.css"
import { FaUser, FaSpinner } from "react-icons/fa"
import { AuthLeftPanel, ForgotPasswordModal, OtpInput, PasswordField } from "../components"
import { postJson } from "../api/authClient"
import { usePublicSiteName } from "@/app/(public)/hooks/usePublicData"

// Superadmin email constant (must match backend)
const SUPERADMIN_EMAIL = 'faithcommunityfaces@gmail.com'

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [otp, setOtp] = useState("")
  const [needsOtp, setNeedsOtp] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState("")
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false)
  const [focusedFields, setFocusedFields] = useState({})
  const [fieldErrors, setFieldErrors] = useState({})
  const [lastAttemptedSystem, setLastAttemptedSystem] = useState(null)
  const [attemptCount, setAttemptCount] = useState(0)
  const [remainingAttempts, setRemainingAttempts] = useState(7)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [isLockedOut, setIsLockedOut] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()
  const { siteNameData } = usePublicSiteName()
  const siteName = siteNameData?.site_name || "FAITH CommUNITY"

  // Countdown timer for lockout
  useEffect(() => {
    if (isLockedOut && lockoutSeconds > 0) {
      const timer = setInterval(() => {
            setLockoutSeconds(prev => {
          if (prev <= 1) {
            setIsLockedOut(false)
            setErrorMessage("")
            setAttemptCount(0)
            setRemainingAttempts(7)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isLockedOut, lockoutSeconds])

  // Format time remaining as MM:SS
  const formatTimeRemaining = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Function to completely clear all session data
  const clearAllSessionData = () => {
    // Check for window/document to avoid SSR errors
    if (typeof window === 'undefined') return;

    // Clear admin tokens
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminData")
   
    // Clear superadmin tokens
    localStorage.removeItem("superAdminToken")
    localStorage.removeItem("superAdminData")
   
    // Clear user tokens
    localStorage.removeItem("userToken")
    localStorage.removeItem("userData")
   
    // Clear general tokens
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userName")

    if (typeof document !== 'undefined') {
      document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
      document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    }

    dispatch(logoutAdmin())
  }

  const handleFocus = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: true }))
  }

  const handleBlur = (fieldName) => {
    setFocusedFields(prev => ({ ...prev, [fieldName]: false }))
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    setForgotPasswordLoading(true)
    setForgotPasswordMessage("")
    setForgotPasswordSuccess(false)

    try {
      const endpoints = [
        "/api/admins/forgot-password",
        "/api/superadmin/auth/forgot-password", 
        "/api/users/forgot-password"
      ]

      let successCount = 0

      for (const endpoint of endpoints) {
        const { ok, status, data } = await postJson(endpoint, { email: forgotPasswordEmail })
        if (ok) successCount++
        else if (status === 429) {
          setForgotPasswordMessage("Too many requests. Please wait before trying again.")
        } else if (data && data.error) {
          setForgotPasswordMessage(data.error)
        }
      }

      if (successCount > 0) {
        setForgotPasswordSuccess(true)
        setForgotPasswordMessage("If an account with that email exists, password reset links have been sent to all associated accounts.")
        setForgotPasswordEmail("")
      } else if (!forgotPasswordMessage) {
        setForgotPasswordMessage("Failed to send reset emails. Please try again.")
      }
    } catch (error) {
      setForgotPasswordMessage("Network error. Please try again.")
    }

    setForgotPasswordLoading(false)
  }

  const validateForm = () => {
    const errors = {}
    if (!email.trim()) errors.email = "Email is required"
    if (!password.trim()) errors.password = "Password is required"
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }
    return errors
  }

  const getGeneralErrorMessage = (errors) => {
    if (errors.email && errors.password) return "Email and password are required"
    if (errors.email) return errors.email
    if (errors.password) return errors.password
    return ""
  }

  const attempt = async (system) => {
    setLastAttemptedSystem(system)
    switch (system) {
      case "superadmin":
        return await postJson('/api/superadmin/auth/login', { email, password, otp: needsOtp ? otp : undefined })
      case "admin":
        return await postJson('/api/admins/login', { email, password })
      case "user":
        return await postJson('/api/users/login', { email, password })
      default:
        throw new Error("Unknown authentication system")
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()

    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage(getGeneralErrorMessage(validationErrors))
      setShowError(true)
      return
    }

    setIsLoading(true)
    setShowError(false)
    setFieldErrors({})
    clearAllSessionData()

    try {
      // Detect which system to try based on email or previous attempts
      // If email matches superadmin email, try superadmin first
      let systemToTry = lastAttemptedSystem
      
      if (!systemToTry) {
        // Auto-detect based on email
        if (email.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase().trim()) {
          systemToTry = "superadmin"
        } else {
          systemToTry = "admin" // Default to admin
        }
      }
      
      let result = await attempt(systemToTry)
      let successfulSystem = null
      
      if (result.ok) {
        successfulSystem = systemToTry
        // Reset attempt tracking on success
        setAttemptCount(0)
        setRemainingAttempts(7)
        setIsLockedOut(false)
      } else if (result.status === 429) {
        // Rate limit hit - don't try other systems
        const data = result.data || {}
        const remainingSecs = data.remainingSeconds || 300 // Default to 5 minutes
        const attempts = data.attempts || 7
        
        setIsLockedOut(true)
        setLockoutSeconds(remainingSecs)
        setAttemptCount(attempts)
        setRemainingAttempts(0)
        setErrorMessage(data.error || `Too many failed login attempts. Please wait ${formatTimeRemaining(remainingSecs)} before trying again.`)
        setShowError(true)
        setFieldErrors({ email: "Rate limit exceeded", password: "Rate limit exceeded" })
        setIsLoading(false)
        return
      }

      if (result && result.ok) {
        const data = result.data
        switch (successfulSystem) {
          case "superadmin":
            document.cookie = "userRole=superadmin; path=/; max-age=86400"
            localStorage.setItem("superAdminToken", data.token)
            localStorage.setItem("superAdminData", JSON.stringify(data.superadmin))
            localStorage.setItem("token", data.token)
            localStorage.setItem("user", JSON.stringify(data.superadmin))
            localStorage.setItem("userRole", "superadmin")
            dispatch(loginSuperAdmin({ token: data.token, superadmin: data.superadmin }))
            break
          case "admin":
            localStorage.setItem("adminToken", data.token)
            localStorage.setItem("adminData", JSON.stringify(data.admin))
            document.cookie = "userRole=admin; path=/; max-age=86400"
            dispatch(loginAdmin({ token: data.token, admin: data.admin }))
            break
          case "user":
            localStorage.setItem("userToken", data.token)
            localStorage.setItem("userData", JSON.stringify(data.user))
            document.cookie = "userRole=user; path=/; max-age=86400"
            localStorage.setItem("token", "user")
            localStorage.setItem("userRole", "user")
            break
        }

        setIsLoading(false)
        window.location.href = successfulSystem === 'user' ? '/' : `/${successfulSystem}`
        return
      }

      // Handle rate limiting (this should now be caught earlier in the logic above)
      if (result && result.status === 429) {
        const data = result.data || {}
        const remainingSecs = data.remainingSeconds || 300
        const attempts = data.attempts || 7
        
        setIsLockedOut(true)
        setLockoutSeconds(remainingSecs)
        setAttemptCount(attempts)
        setRemainingAttempts(0)
        setErrorMessage(data.error || `Too many failed login attempts. Please wait ${formatTimeRemaining(remainingSecs)} before trying again.`)
        setShowError(true)
        setFieldErrors({ email: "Rate limit exceeded", password: "Rate limit exceeded" })
        setIsLoading(false)
        return
      }

      if (result && result.error) {
        setErrorMessage("Network error: Unable to connect to the server. Please check your internet connection and try again.")
        setShowError(true)
        setIsLoading(false)
        return
      }

      const data = result?.data
      // Handle 2FA requirement for superadmin accounts
      if (data && (data.requireTwoFA || /(2fa|two.?factor)/i.test(data.error || "")) && lastAttemptedSystem === "superadmin") {
        setNeedsOtp(true)
        setErrorMessage("Enter the 6-digit code from your authenticator app.")
        setShowError(true)
        setIsLoading(false)
        return
      }

      // Update attempt count from response if available
      if (data?.attempts !== undefined) {
        setAttemptCount(data.attempts)
        setRemainingAttempts(data.remainingAttempts !== undefined ? data.remainingAttempts : Math.max(0, 7 - data.attempts))
      }

      if (successfulSystem === "user" && data?.requiresVerification) {
        setErrorMessage("Please verify your email address before logging in. Check your email for a verification link.")
        setShowError(true)
        setFieldErrors({ email: "Please verify your email address", password: "Please verify your email address" })
      } else {
        // If login failed and we haven't tried all systems yet, try fallback
        const isSuperadminEmail = email.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase().trim()
        
        // If we tried admin but email is superadmin, try superadmin
        if (systemToTry === "admin" && isSuperadminEmail && !lastAttemptedSystem) {
          setLastAttemptedSystem("superadmin")
          // Retry with superadmin
          const superadminResult = await attempt("superadmin")
          if (superadminResult && superadminResult.ok) {
            const superadminData = superadminResult.data
            document.cookie = "userRole=superadmin; path=/; max-age=86400"
            localStorage.setItem("superAdminToken", superadminData.token)
            localStorage.setItem("superAdminData", JSON.stringify(superadminData.superadmin))
            localStorage.setItem("token", superadminData.token)
            localStorage.setItem("user", JSON.stringify(superadminData.superadmin))
            localStorage.setItem("userRole", "superadmin")
            dispatch(loginSuperAdmin({ token: superadminData.token, superadmin: superadminData.superadmin }))
            setIsLoading(false)
            window.location.href = "/superadmin"
            return
          }
        }
        
        const baseError = (data && data.error) || "Invalid email or password. Please check your credentials and try again."
        // Only show attempts info in error message if attempts > 3 (tracker will show separately)
        setErrorMessage(baseError)
        setShowError(true)
        setFieldErrors({ email: "Invalid email or password", password: "Invalid email or password" })
      }
    } catch (error) {
      setErrorMessage("Network error. Please check your connection and try again.")
      setShowError(true)
      setFieldErrors({ email: "Network error", password: "Network error" })
    }

    setIsLoading(false)
  }

  return (
    <div className={styles.container}>
      <AuthLeftPanel labelText="Log In" />
      <div className={styles.rightPane}>
        <form onSubmit={handleLogin} className={styles.form} noValidate>
          <h2 className={styles.title}>Log In</h2>

          <label htmlFor="email" className={`${styles.label} ${focusedFields.email ? styles.focused : ''} ${email ? styles.hasValue : ''} ${fieldErrors.email ? styles.labelError : ''}`}>
            Email
          </label>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              id="email"
              type="text"
              name="email"
              placeholder="Enter your email"
              aria-label="Email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                const newEmail = e.target.value
                setEmail(newEmail)
                // Clear last attempted system when email changes to allow auto-detection
                if (lastAttemptedSystem) {
                  setLastAttemptedSystem(null)
                }
                if (showError || Object.keys(fieldErrors).length > 0) {
                  setShowError(false)
                  setFieldErrors({})
                }
              }}
              onFocus={() => handleFocus('email')}
              onBlur={() => handleBlur('email')}
              disabled={isLoading}
              className={fieldErrors.email ? styles.inputError : ""}
            />
          </div>

          <label htmlFor="password" className={`${styles.label} ${focusedFields.password ? styles.focused : ''} ${password ? styles.hasValue : ''} ${fieldErrors.password ? styles.labelError : ''}`}>
            Password
          </label>
          <PasswordField
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              // Clear last attempted system when password changes to allow trying different system
              if (lastAttemptedSystem) {
                setLastAttemptedSystem(null)
              }
              if (showError || Object.keys(fieldErrors).length > 0) {
                setShowError(false)
                setFieldErrors({})
              }
            }}
            onFocus={() => handleFocus('password')}
            onBlur={() => handleBlur('password')}
            disabled={isLoading}
            error={fieldErrors.password}
          />

          {needsOtp && (
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
          )}

          <div className={styles.forgotPasswordLink}>
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className={styles.forgotPasswordButton}
            >
              Forgot Password?
            </button>
          </div>

          {showError && (
            <div className={styles.errorContainer}>
              <p className={styles.errorMessage}>
                {errorMessage}
              </p>
              {isLockedOut && lockoutSeconds > 0 && (
                <p className={styles.lockoutTimer}>
                  Try again in: {formatTimeRemaining(lockoutSeconds)}
                </p>
              )}
              {!isLockedOut && attemptCount > 3 && (
                <p className={styles.attemptInfo}>
                  Failed login attempts: {attemptCount}/7 {remainingAttempts > 0 && `(${remainingAttempts} remaining)`}
                </p>
              )}
            </div>
          )}

          <button type="submit" className={styles.loginBtn} disabled={isLoading || isLockedOut} aria-busy={isLoading}>
            Log In
            {isLoading && <FaSpinner className={styles.spinner} />}
          </button>

          <div className={styles.signupLink}>
            <p>Don&apos;t have an account? <button type="button" onClick={() => router.push('/signup')} className={styles.signupButton}>Sign Up</button></p>
          </div>
        </form>
        <div className={styles.backLink}>
          <button
            type="button"
            onClick={() => router.push('/')}
            className={styles.backButton}
          >
            Go Back to {siteName}
          </button>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={showForgotPassword}
        email={forgotPasswordEmail}
        setEmail={setForgotPasswordEmail}
        message={forgotPasswordMessage}
        success={forgotPasswordSuccess}
        loading={forgotPasswordLoading}
        onClose={() => {
          setShowForgotPassword(false)
          setForgotPasswordEmail("")
          setForgotPasswordMessage("")
          setForgotPasswordSuccess(false)
        }}
        onSubmit={handleForgotPassword}
      />
    </div>
  )
}