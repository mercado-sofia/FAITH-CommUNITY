"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginAdmin, logoutAdmin } from "../../rtk/superadmin/adminSlice"
import styles from "./login.module.css"
import { FaUser, FaLock, FaEye, FaEyeSlash } from "react-icons/fa"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()

  // Function to completely clear all session data
  const clearAllSessionData = () => {
    console.log("🧹 Clearing all session data")

    // Clear admin tokens
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminData")
    
    // Clear superadmin tokens
    localStorage.removeItem("superAdminToken")
    localStorage.removeItem("superAdminData")
    
    // Clear general tokens
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userName")

    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"

    dispatch(logoutAdmin())

    console.log("✅ All session data cleared")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)

    // Login attempt logged

    clearAllSessionData()

    if (email === "superadmin@faith.com" && password === "super123") {
      // Superadmin login detected

      // Set the correct localStorage keys that superadmin layout expects
      document.cookie = "userRole=superadmin; path=/; max-age=86400"
      localStorage.setItem("superAdminToken", "superadmin-token-123")
      localStorage.setItem("superAdminData", JSON.stringify({
        id: 1,
        email: "superadmin@faith.com",
        name: "Super Administrator",
        role: "superadmin"
      }))
      localStorage.setItem("token", "superadmin")
      localStorage.setItem("userRole", "superadmin")

              // Superadmin tokens set, redirecting to /superadmin
      setIsLoading(false)
      window.location.href = "/superadmin"
      return
    }

    try {
      // Attempting admin login via API

      const response = await fetch("http://localhost:8080/api/admins/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()
      console.log("📡 API Response:", { status: response.status, data })

      if (response.ok) {
        // Admin login successful

        localStorage.setItem("adminToken", data.token)
        localStorage.setItem("adminData", JSON.stringify(data.admin))
        document.cookie = "userRole=admin; path=/; max-age=86400"

        dispatch(
          loginAdmin({
            token: data.token,
            admin: data.admin,
          })
        )

        // Redux state updated

        window.location.href = "/admin"
      } else {
        console.log("❌ Login failed:", data.error)
        setErrorMessage(data.error || "Login failed")
        setShowError(true)
      }
    } catch (error) {
      console.error("🚨 Network error:", error)
      setErrorMessage("Network error. Please try again.")
      setShowError(true)
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
        <form onSubmit={handleLogin} className={styles.form}>
          <h2 className={styles.title}>Log In</h2>

          <label htmlFor="email" className={styles.label}>
            Email
          </label>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email"
              aria-label="Email"
              autoComplete="off"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setShowError(false)
              }}
              required
              disabled={isLoading}
            />
          </div>

          <label htmlFor="password" className={styles.label}>
            Password
          </label>
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              // name="password"
              name={process.env.NODE_ENV === "development" ? `dev-password-${Math.random()}` : "password"}
              placeholder="Enter your password"
              aria-label="Password"
              autoComplete="off"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setShowError(false)
              }}
              required
              disabled={isLoading}
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

          {showError && (
            <p className={styles.errorMessage}>
              {errorMessage || "The email or password you entered is incorrect."}
            </p>
          )}

          <button type="submit" className={styles.loginBtn} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  )
}