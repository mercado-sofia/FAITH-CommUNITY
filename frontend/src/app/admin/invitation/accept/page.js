"use client"

import { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import styles from "./accept.module.css"

const AcceptInvitation = () => {
  const [form, setForm] = useState({
    org: "",
    orgName: "",
    logo: "",
    password: "",
    confirmPassword: "",
  })
  const [isValidating, setIsValidating] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState("")
  const [email, setEmail] = useState("")

  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setError("Invalid invitation link. No token provided.")
      setIsValidating(false)
      return
    }

    setToken(tokenParam)
    validateToken(tokenParam)
  }, [searchParams])

  const validateToken = async (token) => {
    try {
      const response = await fetch(`http://localhost:8080/api/invitations/validate/${token}`)
      const data = await response.json()

      if (response.ok) {
        setEmail(data.email)
        setSuccess("Valid invitation token. Please complete your account setup.")
      } else {
        setError(data.error || "Invalid or expired invitation token")
      }
    } catch (err) {
      setError("Failed to validate invitation token")
    } finally {
      setIsValidating(false)
    }
  }

  const handleInputChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validate password confirmation
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match!")
      return
    }

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    if (!form.org || !form.orgName) {
      setError("Organization acronym and name are required")
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch("http://localhost:8080/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          org: form.org,
          orgName: form.orgName,
          logo: form.logo,
          password: form.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess("Account created successfully! You can now log in.")
        setTimeout(() => {
          router.push("/admin/login")
        }, 3000)
      } else {
        setError(data.error || "Failed to create account")
      }
    } catch (err) {
      setError("Failed to create account. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isValidating) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Validating invitation...</p>
        </div>
      </div>
    )
  }

  if (error && !email) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <h1>Invalid Invitation</h1>
          <p>{error}</p>
          <button 
            onClick={() => router.push("/")} 
            className={styles.homeButton}
          >
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Complete Your Admin Account Setup</h1>
          <p>You&apos;ve been invited to become an admin for FAITH-CommUNITY</p>
          <p className={styles.email}>Email: {email}</p>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && <div className={styles.successMessage}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div className={styles.formField}>
              <label htmlFor="org">Organization Acronym *</label>
              <input
                type="text"
                id="org"
                name="org"
                placeholder="e.g., FAIPS, FTL, FAHSS"
                value={form.org}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="orgName">Organization Name *</label>
              <input
                type="text"
                id="orgName"
                name="orgName"
                placeholder="Full organization name"
                value={form.orgName}
                onChange={handleInputChange}
                required
                disabled={isSubmitting}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="logo">Organization Logo URL (Optional)</label>
              <input
                type="url"
                id="logo"
                name="logo"
                placeholder="https://example.com/logo.png"
                value={form.logo}
                onChange={handleInputChange}
                disabled={isSubmitting}
                className={styles.formInput}
              />
            </div>

            <div className={styles.formField}>
              <label htmlFor="password">Password *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter secure password (min 6 characters)"
                  value={form.password}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={styles.formInput}
                />
                {form.password && (
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                        fill="currentColor"
                      />
                      {!showPassword && (
                        <path
                          d="M2 2l20 20M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.11 11 7.5a11.79 11.79 0 01-4 5.19m-5.6.36A9.12 9.12 0 0112 20c-5 0-9.27-3.11-11-7.5 1.64-4.24 5.81-7.5 10.99-7.5z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </button>
                )}
              </div>
            </div>

            <div className={styles.formField}>
              <label htmlFor="confirmPassword">Confirm Password *</label>
              <div className={styles.passwordInputWrapper}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Confirm your password"
                  value={form.confirmPassword}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={styles.formInput}
                />
                {form.confirmPassword && (
                  <button
                    type="button"
                    className={styles.eyeIcon}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isSubmitting}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                        fill="currentColor"
                      />
                      {!showConfirmPassword && (
                        <path
                          d="M2 2l20 20M9.9 4.24A9.12 9.12 0 0112 4c5 0 9.27 3.11 11 7.5a11.79 11.79 0 01-4 5.19m-5.6.36A9.12 9.12 0 0112 20c-5 0-9.27-3.11-11-7.5 1.64-4.24 5.81-7.5 10.99-7.5z"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      )}
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className={styles.submitButton} 
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating Account..." : "Create Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AcceptInvitation
