"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginAdmin, logoutAdmin } from "../../rtk/superadmin/adminSlice"
import styles from "./login.module.css"
import { FaUser, FaLock, FaEye, FaEyeSlash, FaTimes, FaSpinner } from "react-icons/fa"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
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
  const router = useRouter()
  const dispatch = useDispatch()

  // Function to completely clear all session data
  const clearAllSessionData = () => {
    console.log("Clearing all session data")

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

    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"

    dispatch(logoutAdmin())

    console.log("All session data cleared")
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
      // Try to send reset emails to all authentication systems
      const endpoints = [
        "http://localhost:8080/api/admins/forgot-password",
        "http://localhost:8080/api/superadmin/auth/forgot-password", 
        "http://localhost:8080/api/users/forgot-password"
      ]

      let successCount = 0
      let errorMessages = []

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email: forgotPasswordEmail }),
          })

          if (response.ok) {
            successCount++
          } else {
            const data = await response.json()
            if (data.error) {
              errorMessages.push(data.error)
            }
          }
        } catch (error) {
          console.error(`Error with endpoint ${endpoint}:`, error)
          errorMessages.push(`Network error for ${endpoint.split('/').pop()}`)
        }
      }

      if (successCount > 0) {
        setForgotPasswordSuccess(true)
        setForgotPasswordMessage("If an account with that email exists, password reset links have been sent to all associated accounts.")
        setForgotPasswordEmail("")
      } else {
        setForgotPasswordMessage("Failed to send reset emails. Please try again.")
      }
    } catch (error) {
      console.error("Forgot password error:", error)
      setForgotPasswordMessage("Network error. Please try again.")
    }

    setForgotPasswordLoading(false)
  }

  const validateForm = () => {
    const errors = {}
    
    // Check for empty fields
    if (!email.trim()) {
      errors.email = "Email is required"
    }
    if (!password.trim()) {
      errors.password = "Password is required"
    }
    
    // Check for valid email format only if email is not empty
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address"
    }
    
    return errors
  }

  const getGeneralErrorMessage = (errors) => {
    if (errors.email && errors.password) {
      return "Email and password are required"
    } else if (errors.email) {
      return errors.email
    } else if (errors.password) {
      return errors.password
    }
    return ""
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    
    // Validate form first
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors)
      setErrorMessage(getGeneralErrorMessage(validationErrors))
      setShowError(true)
      return
    }
    
    setIsLoading(true)
    setShowError(false)
    setFieldErrors({}) // Clear field errors

    clearAllSessionData()

    // First, check which authentication systems have this email
    const authSystems = []
    
    try {
      // Check superadmin
      const superadminCheck = await fetch("http://localhost:8080/api/superadmin/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const superadminData = await superadminCheck.json()
      if (superadminCheck.ok && superadminData.exists) {
        authSystems.push("superadmin")
      }
    } catch (error) {
      console.log("Superadmin check failed:", error.message)
    }

    try {
      // Check admin
      const adminCheck = await fetch("http://localhost:8080/api/admins/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const adminData = await adminCheck.json()
      if (adminCheck.ok && adminData.exists) {
        authSystems.push("admin")
      }
    } catch (error) {
      console.log("Admin check failed:", error.message)
    }

    try {
      // Check user
      const userCheck = await fetch("http://localhost:8080/api/users/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const userData = await userCheck.json()
      if (userCheck.ok && userData.exists) {
        authSystems.push("user")
      }
    } catch (error) {
      console.log("User check failed:", error.message)
    }

    console.log("Available auth systems for email:", authSystems)

    // If email exists in multiple systems, show a message asking user to specify
    if (authSystems.length > 1) {
      setErrorMessage(`This email is associated with multiple accounts (${authSystems.join(', ')}). Please contact support to resolve this.`)
      setShowError(true)
      setFieldErrors({
        email: "Multiple accounts found",
        password: "Multiple accounts found"
      })
      setIsLoading(false)
      return
    }

    // If no systems found, show generic error
    if (authSystems.length === 0) {
      setErrorMessage("Invalid email or password. Please check your credentials and try again.")
      setShowError(true)
      setFieldErrors({
        email: "Invalid email or password",
        password: "Invalid email or password"
      })
      setIsLoading(false)
      return
    }

    // Try login with the specific system
    const system = authSystems[0]
    
    try {
      let response, data, redirectUrl
      
      switch (system) {
        case "superadmin":
          response = await fetch("http://localhost:8080/api/superadmin/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
          data = await response.json()
          redirectUrl = "/superadmin"
          break
          
        case "admin":
          response = await fetch("http://localhost:8080/api/admins/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
          data = await response.json()
          redirectUrl = "/admin"
          break
          
        case "user":
          response = await fetch("http://localhost:8080/api/users/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
          })
          data = await response.json()
          redirectUrl = "/"
          break
          
        default:
          throw new Error("Unknown authentication system")
      }

      if (response.ok) {
        // Login successful
        console.log(`${system} login successful:`, data)
        
        // Set appropriate localStorage based on system
        switch (system) {
          case "superadmin":
            document.cookie = "userRole=superadmin; path=/; max-age=86400"
            localStorage.setItem("superAdminToken", data.token)
            localStorage.setItem("superAdminData", JSON.stringify(data.superadmin))
            localStorage.setItem("token", "superadmin")
            localStorage.setItem("userRole", "superadmin")
            break
            
          case "admin":
            localStorage.setItem("adminToken", data.token)
            localStorage.setItem("adminData", JSON.stringify(data.admin))
            document.cookie = "userRole=admin; path=/; max-age=86400"
            dispatch(loginAdmin({
              token: data.token,
              admin: data.admin,
            }))
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
        window.location.href = redirectUrl
        return
        
      } else {
        // Login failed
        if (system === "user" && data.requiresVerification) {
          setErrorMessage("Please verify your email address before logging in. Check your email for a verification link.")
          setShowError(true)
          setFieldErrors({
            email: "Please verify your email address",
            password: "Please verify your email address"
          })
        } else {
          setErrorMessage(data.error || "Invalid email or password. Please check your credentials and try again.")
          setShowError(true)
          setFieldErrors({
            email: "Invalid email or password",
            password: "Invalid email or password"
          })
        }
      }
      
    } catch (error) {
      console.error("Login error:", error)
      setErrorMessage("Network error. Please check your connection and try again.")
      setShowError(true)
      setFieldErrors({
        email: "Network error",
        password: "Network error"
      })
    }

    setIsLoading(false)
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPane}>
        <span className={styles.loginLabel}>Log In</span>
      </div>
      <div className={styles.rightPane}>
        <div className={styles.logoWrapper}>
          <Image src="/logo/faith_community_logo.png" alt="Logo" width={80} height={80} />
        </div>
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
                setEmail(e.target.value)
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
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name={process.env.NODE_ENV === "development" ? `dev-password-${Math.random()}` : "password"}
              placeholder="Enter your password"
              aria-label="Password"
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (showError || Object.keys(fieldErrors).length > 0) {
                  setShowError(false)
                  setFieldErrors({})
                }
              }}
              onFocus={() => handleFocus('password')}
              onBlur={() => handleBlur('password')}
              disabled={isLoading}
              className={fieldErrors.password ? styles.inputError : ""}
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
            <p className={styles.errorMessage}>
              {errorMessage}
            </p>
          )}

          <button type="submit" className={styles.loginBtn} disabled={isLoading}>
            Log In
            {isLoading && <FaSpinner className={styles.spinner} />}
          </button>

          <div className={styles.signupLink}>
            <p>Don't have an account? <button type="button" onClick={() => router.push('/signup')} className={styles.signupButton}>Sign Up</button></p>
          </div>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Forgot Password</h3>
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotPasswordEmail("")
                  setForgotPasswordMessage("")
                  setForgotPasswordSuccess(false)
                }}
                className={styles.closeButton}
              >
                <FaTimes />
              </button>
            </div>
           
            {!forgotPasswordSuccess ? (
              <form onSubmit={handleForgotPassword} className={styles.forgotPasswordForm}>
                <p className={styles.modalDescription}>
                  Enter your email address and we'll send you a link to reset your password.
                </p>
               
                <div className={styles.inputGroup}>
                  <FaUser className={styles.icon} />
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    required
                    disabled={forgotPasswordLoading}
                  />
                </div>

                {forgotPasswordMessage && (
                  <p className={styles.errorMessage}>
                    {forgotPasswordMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className={styles.loginBtn}
                  disabled={forgotPasswordLoading}
                >
                  Send Reset Link
                  {forgotPasswordLoading && <FaSpinner className={styles.spinner} />}
                </button>
              </form>
            ) : (
              <div className={styles.successMessage}>
                <p>{forgotPasswordMessage}</p>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className={styles.loginBtn}
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
