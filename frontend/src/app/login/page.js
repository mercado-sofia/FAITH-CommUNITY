"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useDispatch } from "react-redux"
import { loginAdmin, logoutAdmin } from "../../rtk/superadmin/adminSlice"
import styles from "./login.module.css"
import { FaUser, FaLock } from "react-icons/fa"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showError, setShowError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const dispatch = useDispatch()

  // Function to completely clear all session data
  const clearAllSessionData = () => {
    console.log("🧹 Clearing all session data")

    // Clear localStorage
    localStorage.removeItem("adminToken")
    localStorage.removeItem("adminData")
    localStorage.removeItem("token")
    localStorage.removeItem("userRole")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userName")

    // Clear all cookies
    document.cookie = "userRole=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"
    document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT"

    // Clear Redux state
    dispatch(logoutAdmin())

    console.log("✅ All session data cleared")
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setShowError(false)

    console.log("🔐 Login attempt:", { email, timestamp: new Date().toISOString() })

    // ALWAYS clear all existing session data first
    clearAllSessionData()

    // Check for superadmin credentials first
    if (email === "superadmin@faith.com" && password === "super123") {
      console.log("👑 Superadmin login detected")

      // Set ONLY superadmin credentials
      document.cookie = "userRole=superadmin; path=/; max-age=86400"
      localStorage.setItem("token", "superadmin")
      localStorage.setItem("userRole", "superadmin")

      console.log("👑 Superadmin tokens set, redirecting to /superadmin")
      setIsLoading(false)

      // Force page reload to ensure clean state
      window.location.href = "/superadmin"
      return
    }

    // Try admin login with JWT
    try {
      console.log("🔍 Attempting admin login via API")

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
        console.log("✅ Admin login successful")

        // Set ONLY admin credentials
        localStorage.setItem("adminToken", data.token)
        localStorage.setItem("adminData", JSON.stringify(data.admin))
        document.cookie = "userRole=admin; path=/; max-age=86400"

        console.log("💾 Admin tokens stored")

        // Update Redux state
        dispatch(
          loginAdmin({
            token: data.token,
            admin: data.admin,
          }),
        )

        console.log("🔄 Redux state updated")

        // Force page reload to ensure clean state
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

          <p className={styles.label}>Email</p>
          <div className={styles.inputGroup}>
            <FaUser className={styles.icon} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setShowError(false)
              }}
              required
              disabled={isLoading}
            />
          </div>

          <p className={styles.label}>Password</p>
          <div className={styles.inputGroup}>
            <FaLock className={styles.icon} />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setShowError(false)
              }}
              required
              disabled={isLoading}
            />
          </div>
          {showError && (
            <p className={styles.errorMessage}>{errorMessage || "The email or password you entered is incorrect."}</p>
          )}
          <button type="submit" className={styles.loginBtn} disabled={isLoading}>
            {isLoading ? "Logging in..." : "Log In"}
          </button>
        </form>
      </div>
    </div>
  )
}
