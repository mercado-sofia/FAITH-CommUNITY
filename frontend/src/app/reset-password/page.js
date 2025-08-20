"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import styles from "./reset-password.module.css"
import { FaLock, FaEye, FaEyeSlash, FaCheckCircle } from "react-icons/fa"
import Image from "next/image"

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setMessage("Invalid reset link. Please request a new password reset.")
      return
    }
    setToken(tokenParam)
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setMessage("Password must be at least 6 characters long")
      return
    }

    setIsLoading(true)
    setMessage("")

    try {
      const response = await fetch("http://localhost:8080/api/admins/reset-password", {
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

  const handleBackToLogin = () => {
    router.push("/login")
  }

  if (!token && !isSuccess) {
    return (
      <div className={styles.container}>
        <div className={styles.leftPane}>
          <span className={styles.resetLabel}>Reset Password</span>
        </div>
        <div className={styles.rightPane}>
          <div className={styles.logoWrapper}>
            <Image src="/logo/faith_community_logo.png" alt="Logo" width={80} height={80} />
          </div>
          <div className={styles.errorContainer}>
            <h2 className={styles.title}>Invalid Reset Link</h2>
            <p className={styles.errorMessage}>{message}</p>
            <button onClick={handleBackToLogin} className={styles.loginBtn}>
              Back to Login
            </button>
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
        <div className={styles.logoWrapper}>
          <Image src="/logo/faith_community_logo.png" alt="Logo" width={80} height={80} />
        </div>
        
        {!isSuccess ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <h2 className={styles.title}>Reset Your Password</h2>
            <p className={styles.description}>
              Enter your new password below. Make sure it's secure and easy to remember.
            </p>

            <label htmlFor="newPassword" className={styles.label}>
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
                required
                disabled={isLoading}
                minLength={6}
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

            <label htmlFor="confirmPassword" className={styles.label}>
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
                required
                disabled={isLoading}
                minLength={6}
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

            {message && (
              <p className={styles.errorMessage}>
                {message}
              </p>
            )}

            <button type="submit" className={styles.loginBtn} disabled={isLoading}>
              {isLoading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        ) : (
          <div className={styles.successContainer}>
            <div className={styles.successIcon}>
              <FaCheckCircle />
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
  )
}
