"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginAdmin, loginSuperAdmin, logoutAdmin } from "../../../rtk/superadmin/adminSlice"
import styles from "./login.module.css"
import { FaUser, FaSpinner } from "react-icons/fa"
import { AuthLeftPanel, ForgotPasswordModal, OtpInput, PasswordField } from "../components"
import { postJson } from "../api/authClient"
import { usePublicSiteName } from "@/app/(public)/hooks/usePublicData"
import { 
  getRedirectUrlFromParams, 
  prepareRedirectAfterLogin 
} from "@/utils/redirectUtils"

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
  const [remainingAttempts, setRemainingAttempts] = useState(10)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const [isLockedOut, setIsLockedOut] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()
  const searchParams = useSearchParams()
  const { siteNameData } = usePublicSiteName()
  const siteName = siteNameData?.site_name || "FAITH CommUNITY"
  
  // Helper function to get redirect path and set persistence flag
  const getRedirectPath = (system) => {
    let redirectPath = system === 'user' ? '/' : `/${system}`;
    
    if (system === 'user') {
      // getRedirectUrlFromParams already checks sessionStorage as fallback
      const redirectUrl = getRedirectUrlFromParams(searchParams);
      if (redirectUrl) {
        // prepareRedirectAfterLogin sets flags and returns the redirectUrl
        redirectPath = prepareRedirectAfterLogin(redirectUrl);
      }
    }
    
    return redirectPath;
  };

  // Countdown timer for lockout
  useEffect(() => {
    if (isLockedOut && lockoutSeconds > 0) {
      const timer = setInterval(() => {
            setLockoutSeconds(prev => {
          if (prev <= 1) {
            setIsLockedOut(false)
            setErrorMessage("")
            setAttemptCount(0)
            setRemainingAttempts(10)
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
    
    // Log attempt for debugging
    if (process.env.NODE_ENV === 'development') {
      console.log('[Login] Attempting login for system:', system);
      console.log('[Login] Email:', email);
      console.log('[Login] Has password:', !!password);
      console.log('[Login] Needs OTP:', needsOtp);
    }
    
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
      
      // Handle 401 errors - but don't return early if we should try fallback systems
      // Only return early for 2FA requirements or if we've already tried all systems
      if (result.status === 401 && result.data) {
        const data = result.data;
        
        // Log for debugging
        if (process.env.NODE_ENV === 'development') {
          console.error('[Login] 401 Unauthorized:', {
            system: systemToTry,
            error: data.error,
            attempts: data.attempts,
            remainingAttempts: data.remainingAttempts,
            requireTwoFA: data.requireTwoFA,
            lastAttemptedSystem: lastAttemptedSystem
          });
        }
        
        // Handle 2FA requirement - return early for this
        if (data.requireTwoFA && systemToTry === "superadmin") {
          setNeedsOtp(true);
          setErrorMessage("Enter the 6-digit code from your authenticator app.");
          setShowError(true);
          setIsLoading(false);
          return;
        }
        
        // Update attempt count
        if (data.attempts !== undefined) {
          setAttemptCount(data.attempts);
          setRemainingAttempts(data.remainingAttempts !== undefined ? data.remainingAttempts : Math.max(0, 10 - data.attempts));
        }
        
        // Don't return early here - let the fallback logic below handle trying other systems
        // Only show error if we've already tried all systems or this is a retry
        if (lastAttemptedSystem) {
          // We've already tried a different system, so show error
          const errorMsg = data.error || "Invalid credentials. Please check your email and password.";
          setErrorMessage(errorMsg);
          setShowError(true);
          setIsLoading(false);
          return;
        }
        // Otherwise, continue to fallback logic below
      }
      
      if (result.ok) {
        successfulSystem = systemToTry
        // Reset attempt tracking on success
        setAttemptCount(0)
        setRemainingAttempts(10)
        setIsLockedOut(false)
      } else if (result.status === 429) {
        // Rate limit hit - don't try other systems
        const data = result.data || {}
        const remainingSecs = data.remainingSeconds || 300 // Default to 5 minutes (300 seconds)
        const attempts = data.attempts || 10 // When locked out, attempts should be 10
        
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
        // Tokens are now in httpOnly cookies - don't store in localStorage!
        // Only store non-sensitive user data
        switch (successfulSystem) {
          case "superadmin":
            document.cookie = "userRole=superadmin; path=/; max-age=86400"
            localStorage.setItem("superAdminData", JSON.stringify(data.superadmin))
            // REMOVED: localStorage.setItem("superAdminToken", ...) - token is in httpOnly cookie
            dispatch(loginSuperAdmin({ token: null, superadmin: data.superadmin })) // Token in cookie
            break
          case "admin":
            localStorage.setItem("adminData", JSON.stringify(data.admin))
            document.cookie = "userRole=admin; path=/; max-age=86400"
            // REMOVED: localStorage.setItem("adminToken", ...) - token is in httpOnly cookie
            dispatch(loginAdmin({ token: null, admin: data.admin })) // Token in cookie
            break
          case "user":
            localStorage.setItem("userData", JSON.stringify(data.user))
            document.cookie = "userRole=user; path=/; max-age=86400"
            // REMOVED: localStorage.setItem("userToken", ...) - token is in httpOnly cookie
            break
        }

        setIsLoading(false)
        
        // Log successful login for debugging
        console.log('[Login] Login successful for:', successfulSystem);
        console.log('[Login] User data:', data);
        console.log('[Login] Cookies before redirect:', document.cookie);
        console.log('[Login] Response headers:', 'Check Network tab for Set-Cookie headers');
        
        // IMPORTANT: With Next.js rewrites, cookies are set by backend and forwarded through Next.js
        // Use a longer delay and verify cookies are set before redirecting
        // This ensures cookies are fully processed by the browser
        const redirectDelay = 1500; // Increased to 1.5 seconds
        const maxWaitTime = 3000; // Maximum wait time
        const startTime = Date.now();
        
        const checkCookiesAndRedirect = () => {
          const elapsed = Date.now() - startTime;
          
          // Check if cookies are available (we can't read httpOnly cookies, but we can check if refresh_token cookie exists via document.cookie)
          // Note: httpOnly cookies won't show in document.cookie, but the browser should have them
          // We'll rely on the delay and the retry mechanism in the layout
          
          if (elapsed >= redirectDelay) {
            const redirectPath = getRedirectPath(successfulSystem);
            
            console.log('[Login] Redirecting to:', redirectPath);
            console.log('[Login] After redirect, check if access_token and refresh_token cookies exist');
            // Use window.location.replace to avoid adding to history (prevents back button issues)
            window.location.replace(redirectPath);
            return;
          }
          
          // Continue waiting
          setTimeout(checkCookiesAndRedirect, 100);
        };
        
        // Start checking after initial delay
        setTimeout(checkCookiesAndRedirect, redirectDelay);
        
        // Fallback: redirect anyway after max wait time
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            console.warn('[Login] Max wait time reached, forcing redirect');
            const redirectPath = getRedirectPath(successfulSystem);
            window.location.replace(redirectPath);
          }
        }, maxWaitTime);
        
        return
      }

      // Note: 429 status is already handled earlier in the code (line 270-284)
      // This block is unreachable but kept for safety

      if (result && result.error) {
        setErrorMessage("Network error: Unable to connect to the server. Please check your internet connection and try again.")
        setShowError(true)
        setIsLoading(false)
        return
      }

      // If we reach here, the login failed but wasn't handled above
      // This handles cases where result.data might be null or empty
      const data = result?.data
      
      // Log the full result for debugging
      if (process.env.NODE_ENV === 'development' && !result.ok) {
        console.error('[Login] Login failed (unhandled):', {
          status: result.status,
          data: data,
          system: systemToTry,
          hasData: !!data,
          dataKeys: data ? Object.keys(data) : []
        });
      }
      
      // Handle case where data is null or empty
      if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
        if (result.status === 401) {
          setErrorMessage("Invalid credentials. Please check your email and password.")
        } else if (result.status === 500) {
          setErrorMessage("Server error. Please try again later.")
        } else {
          setErrorMessage(`Login failed with status ${result.status}. Please try again.`)
        }
        setShowError(true)
        setIsLoading(false)
        return
      }
      
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
        setRemainingAttempts(data.remainingAttempts !== undefined ? data.remainingAttempts : Math.max(0, 10 - data.attempts))
      }

      // Handle email verification requirement for user accounts
      if (data?.requiresVerification) {
        setErrorMessage("Please verify your email address before logging in. Check your email for a verification link.")
        setShowError(true)
        setFieldErrors({ email: "Please verify your email address", password: "Please verify your email address" })
        setIsLoading(false)
        return
      }

      // Handle inactive account
      if (data?.accountInactive) {
        setErrorMessage(data.error || "Your account has been deactivated. Please contact support for assistance.")
        setShowError(true)
        setFieldErrors({ email: "Account inactive", password: "Account inactive" })
        setIsLoading(false)
        return
      }

      // If login failed and we haven't tried all systems yet, try fallback
      const isSuperadminEmail = email.toLowerCase().trim() === SUPERADMIN_EMAIL.toLowerCase().trim()
      
      // Track which systems we've tried in this login attempt
      const systemsTried = [systemToTry]
      
      // Try fallback systems in order: admin -> user -> superadmin
      // Only try fallbacks if:
      // 1. The current attempt failed (not ok)
      // 2. We haven't already tried user system
      // 3. The current system is "admin" (default)
      if (!result.ok && systemToTry === "admin" && !systemsTried.includes("user")) {
        // If admin failed, try user system
        if (process.env.NODE_ENV === 'development') {
          console.log('[Login] Admin login failed, trying user system as fallback');
        }
        setLastAttemptedSystem("admin") // Mark that we tried admin
        systemsTried.push("user")
        const userResult = await attempt("user")
        
        if (userResult && userResult.ok) {
          const userData = userResult.data
          // Handle email verification for user
          if (userData.requiresVerification) {
            setErrorMessage("Please verify your email address before logging in. Check your email for a verification link.")
            setShowError(true)
            setFieldErrors({ email: "Please verify your email address", password: "Please verify your email address" })
            setIsLoading(false)
            return
          }
          
          // Tokens are now in httpOnly cookies - don't store in localStorage!
          // Only store non-sensitive user data
          localStorage.setItem("userData", JSON.stringify(userData.user))
          document.cookie = "userRole=user; path=/; max-age=86400"
          setIsLoading(false)
          
          // Use same redirect logic as main success handler
          const redirectPath = getRedirectPath('user');
          if (process.env.NODE_ENV === 'development') {
            console.log('[Login] User login successful via fallback, redirecting to:', redirectPath);
          }
          // Use window.location.replace to avoid adding to history
          setTimeout(() => {
            window.location.replace(redirectPath)
          }, 500)
          return
        }
        
        // If user login failed, check for email verification requirement
        if (userResult && userResult.data?.requiresVerification) {
          setErrorMessage("Please verify your email address before logging in. Check your email for a verification link.")
          setShowError(true)
          setFieldErrors({ email: "Please verify your email address", password: "Please verify your email address" })
          setIsLoading(false)
          return
        }
        
        // If user login failed, check for inactive account
        if (userResult && userResult.data?.accountInactive) {
          setErrorMessage(userResult.data.error || "Your account has been deactivated. Please contact support for assistance.")
          setShowError(true)
          setFieldErrors({ email: "Account inactive", password: "Account inactive" })
          setIsLoading(false)
          return
        }
        
        // If user also failed and email is superadmin, try superadmin
        if (isSuperadminEmail && !systemsTried.includes("superadmin")) {
          if (process.env.NODE_ENV === 'development') {
            console.log('[Login] User login also failed, trying superadmin as final fallback');
          }
          setLastAttemptedSystem("user") // Mark that we tried user
          systemsTried.push("superadmin")
          const superadminResult = await attempt("superadmin")
          if (superadminResult && superadminResult.ok) {
            const superadminData = superadminResult.data
            document.cookie = "userRole=superadmin; path=/; max-age=86400"
            // Tokens are now in httpOnly cookies - don't store in localStorage!
            // Only store non-sensitive user data
            localStorage.setItem("superAdminData", JSON.stringify(superadminData.superadmin))
            dispatch(loginSuperAdmin({ token: null, superadmin: superadminData.superadmin })) // Token in cookie
            setIsLoading(false)
            window.location.href = "/superadmin"
            return
          }
        }
        
        // If all fallbacks failed, show error from the last attempt (user system)
        const errorData = userResult?.data || result?.data || data
        const baseError = (errorData && errorData.error) || "Invalid email or password. Please check your credentials and try again."
        setErrorMessage(baseError)
        setShowError(true)
        setFieldErrors({ email: "Invalid email or password", password: "Invalid email or password" })
        setIsLoading(false)
      } else if (systemToTry === "user" && !result.ok) {
        // If we directly tried user system and it failed, show the error
        const baseError = (result?.data?.error || data?.error) || "Invalid email or password. Please check your credentials and try again."
        setErrorMessage(baseError)
        setShowError(true)
        setFieldErrors({ email: "Invalid email or password", password: "Invalid email or password" })
        setIsLoading(false)
      } else if (!result.ok && lastAttemptedSystem) {
        // If we've already tried fallbacks and still failed, show error
        const baseError = (result?.data?.error || data?.error) || "Invalid email or password. Please check your credentials and try again."
        setErrorMessage(baseError)
        setShowError(true)
        setFieldErrors({ email: "Invalid email or password", password: "Invalid email or password" })
        setIsLoading(false)
      } else if (!result.ok) {
        // Final fallback - show generic error
        const baseError = (result?.data?.error || data?.error) || "Invalid email or password. Please check your credentials and try again."
        setErrorMessage(baseError)
        setShowError(true)
        setFieldErrors({ email: "Invalid email or password", password: "Invalid email or password" })
        setIsLoading(false)
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
              {!isLockedOut && remainingAttempts <= 3 && remainingAttempts > 0 && (
                <p className={styles.attemptInfo}>
                  Failed login attempts: {attemptCount}/10 ({remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining)
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