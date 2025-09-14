"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { TbMessage2Exclamation } from "react-icons/tb"
import { FaCheck, FaTimes, FaEye, FaEyeSlash, FaRegCircle, FaRegCheckCircle } from "react-icons/fa"
import Image from "next/image"
import styles from "./accept.module.css"
import logger from "../../../../utils/logger"

const AcceptInvitation = () => {
  // API base URL with environment variable support
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  const [form, setForm] = useState({
    org: "",
    orgName: "",
    logo: "",
    password: "",
    confirmPassword: "",
  })
  const [logoPreview, setLogoPreview] = useState(null)
  const [isValidating, setIsValidating] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [token, setToken] = useState("")
  const [currentStep, setCurrentStep] = useState(1)
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    match: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})

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
  }, [searchParams, validateToken])

  const validateToken = useCallback(async (token) => {
    try {
      logger.info('Validating invitation token', { token: token.substring(0, 8) + '...' })
      
      const response = await fetch(`${API_BASE_URL}/api/invitations/validate/${token}`)
      const data = await response.json()

      if (response.ok) {
        logger.info('Token validation successful')
        setSuccess("Please complete your account setup.")
      } else {
        logger.apiError(`${API_BASE_URL}/api/invitations/validate/${token}`, new Error(data.error), { 
          status: response.status 
        })
        setError(data.error || "Invalid or expired invitation token")
      }
    } catch (err) {
      logger.apiError(`${API_BASE_URL}/api/invitations/validate/${token}`, err, { 
        context: 'token_validation' 
      })
      setError("Failed to validate invitation token")
    } finally {
      setIsValidating(false)
    }
  }, [API_BASE_URL])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setForm({ ...form, [name]: value })
    
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[name]
        return newErrors
      })
    }
    
    // Track password requirements
    if (name === "password") {
      setPasswordRequirements(prev => ({
        ...prev,
        length: value.length >= 8,
        lowercase: /[a-z]/.test(value),
        uppercase: /[A-Z]/.test(value),
        number: /\d/.test(value),
        match: value === form.confirmPassword && value.length > 0
      }))
    } else if (name === "confirmPassword") {
      setPasswordRequirements(prev => ({
        ...prev,
        match: value === form.password && value.length > 0
      }))
    }
  }

  const handleLogoUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setFieldErrors(prev => ({ ...prev, logo: "Please select a valid image file" }))
        return
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setFieldErrors(prev => ({ ...prev, logo: "Image size must be less than 5MB" }))
        return
      }
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      setLogoPreview(previewUrl)
      setForm(prev => ({ ...prev, logo: file }))
      
      // Clear any previous errors
      setFieldErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors.logo
        return newErrors
      })
    }
  }

  const removeLogo = () => {
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview)
    }
    setLogoPreview(null)
    setForm(prev => ({ ...prev, logo: "" }))
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1 fields
      const errors = {}
      if (!form.org) {
        errors.org = "Organization acronym is required"
      }
      if (!form.orgName) {
        errors.orgName = "Organization name is required"
      }
      if (!form.logo) {
        errors.logo = "Organization logo is required"
      }
      
      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors)
        return
      }
      
      setFieldErrors({})
      setCurrentStep(2)
    }
  }

  const handlePrevStep = () => {
    if (currentStep === 2) {
      setCurrentStep(1)
      setError("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    // Validate all fields
    const errors = {}
    if (!form.org) {
      errors.org = "Organization acronym is required"
    }
    if (!form.orgName) {
      errors.orgName = "Organization name is required"
    }
    if (!form.logo) {
      errors.logo = "Organization logo is required"
    }
    if (form.password.length < 8) {
      errors.password = "Password must be at least 8 characters long"
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "Passwords do not match"
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setFieldErrors({})
    setIsSubmitting(true)

    try {
      // Handle logo upload - logo is required
      let logoPath = null
      logger.info('Starting invitation acceptance process', { 
        org: form.org, 
        orgName: form.orgName,
        hasLogo: !!form.logo,
        logoType: typeof form.logo
      })
      
      if (form.logo && form.logo instanceof File) {
        logger.info('Uploading logo file', { fileName: form.logo.name, size: form.logo.size })
        const formData = new FormData()
        formData.append('logo', form.logo)
        
        try {
          const uploadResponse = await fetch(`${API_BASE_URL}/api/upload/public/organization-logo`, {
            method: "POST",
            body: formData,
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            logger.info('Logo upload successful', { logoPath: uploadData.logoPath })
            logoPath = uploadData.logoPath
          } else {
            let uploadError
            try {
              uploadError = await uploadResponse.json()
            } catch (parseError) {
              uploadError = { error: `Upload failed with status ${uploadResponse.status}` }
            }
            logger.apiError(`${API_BASE_URL}/api/upload/public/organization-logo`, new Error(uploadError.error), { 
              status: uploadResponse.status,
              fileName: form.logo.name
            })
            throw new Error(uploadError.error || "Failed to upload logo")
          }
        } catch (uploadErr) {
          if (uploadErr.name === 'TypeError' && uploadErr.message.includes('fetch')) {
            logger.apiError(`${API_BASE_URL}/api/upload/public/organization-logo`, uploadErr, { 
              context: 'network_error',
              fileName: form.logo.name
            })
            throw new Error("Network error. Please check your connection and try again.")
          }
          throw uploadErr
        }
      } else if (typeof form.logo === 'string') {
        logger.info('Using existing logo path', { logoPath: form.logo })
        logoPath = form.logo
      } else {
        logger.error('Logo is required but not provided', { logoType: typeof form.logo })
        throw new Error("Logo is required")
      }

      const invitationData = {
        token,
        org: form.org,
        orgName: form.orgName,
        logo: logoPath,
        password: form.password,
      }
      
      logger.info('Sending invitation acceptance request', { 
        org: form.org, 
        orgName: form.orgName,
        hasLogo: !!logoPath,
        token: token.substring(0, 8) + '...'
      })

      const response = await fetch(`${API_BASE_URL}/api/invitations/accept`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitationData),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        logger.apiError(`${API_BASE_URL}/api/invitations/accept`, parseError, { 
          status: response.status,
          context: 'json_parse_error'
        })
        throw new Error(`Server returned invalid response (status: ${response.status})`)
      }

      if (response.ok) {
        logger.info('Invitation accepted successfully', { 
          adminId: data.admin?.id,
          organizationId: data.admin?.organization_id
        })
        
        // Fetch organization data to get the org acronym
        try {
          const orgResponse = await fetch(`${API_BASE_URL}/api/organization/org/${form.org}`)
          if (orgResponse.ok) {
            const orgData = await orgResponse.json()
            logger.info('Organization data fetched', { 
              org: orgData.data?.org,
              orgName: orgData.data?.orgName
            })
          }
        } catch (orgError) {
          logger.apiError(`${API_BASE_URL}/api/organization/org/${form.org}`, orgError, {
            context: 'fetch_organization_after_creation'
          })
        }
        
        setSuccess("Account created successfully! Redirecting to login...")
        
        // Redirect to login after a short delay
        setTimeout(() => {
          router.push("/admin/login")
        }, 2000)
      } else {
        logger.apiError(`${API_BASE_URL}/api/invitations/accept`, new Error(data.error), { 
          status: response.status,
          org: form.org,
          token: token.substring(0, 8) + '...'
        })
        setError(data.error || "Failed to create account")
      }
    } catch (err) {
      logger.apiError(`${API_BASE_URL}/api/invitations/accept`, err, { 
        context: 'invitation_acceptance',
        org: form.org,
        token: token.substring(0, 8) + '...'
      })
      
      // Provide more specific error messages based on error type
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Network error. Please check your connection and try again.")
      } else if (err.message.includes('Logo is required')) {
        setError("Please upload an organization logo.")
      } else if (err.message.includes('Network error')) {
        setError(err.message)
      } else {
        setError("Failed to create account. Please try again.")
      }
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

  if (error) {
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

  // Show success container when account is created successfully
  if (success && success === "Account created successfully! You can now log in.") {
    return (
      <div className={styles.container}>
        <div className={styles.successContainer}>
          <div className={styles.successIconContainer}>
            <TbMessage2Exclamation className={styles.successIconLarge} />
          </div>
          <h1 className={styles.successTitle}>Account Created Successfully!</h1>
          <p className={styles.successMessage}>You can now log in to your admin account.</p>
          <div className={styles.successActions}>
            <button 
              onClick={() => router.push("/admin/login")} 
              className={styles.loginButton}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Admin Account Setup</h1>
        </div>

        {error && <div className={styles.errorMessage}>{error}</div>}
        {success && success !== "Account created successfully! You can now log in." && (
          <div className={styles.successMessage}>
            <TbMessage2Exclamation className={styles.successIcon} />
            <span>{success}</span>
          </div>
        )}

        {/* Step Indicator */}
        <div className={styles.stepIndicator}>
          <div className={styles.stepLabels}>
            <div className={`${styles.stepLabel} ${currentStep >= 1 ? styles.active : ''}`}>
              Organization Details
            </div>
            <div className={`${styles.stepLabel} ${currentStep >= 2 ? styles.active : ''}`}>
              Password Setup
            </div>
          </div>
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: `${(currentStep / 2) * 100}%` }}></div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className={styles.stepContent}>
              <div className={styles.formField}>
                <label>Organization Logo</label>
                <div className={styles.logoUploadContainer}>
                  <div className={styles.logoPreview}>
                    {logoPreview ? (
                      <Image 
                        src={logoPreview} 
                        alt="Logo preview" 
                        className={styles.logoImage}
                        width={100}
                        height={100}
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles.logoPlaceholder}>
                        <span>No Image</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.logoActions}>
                    <div className={styles.buttonRow}>
                      <input
                        type="file"
                        id="logo"
                        name="logo"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={isSubmitting}
                        className={styles.fileInput}
                      />
                      <label htmlFor="logo" className={styles.uploadButton}>
                        Upload
                      </label>
                      {logoPreview && (
                        <button
                          type="button"
                          onClick={removeLogo}
                          className={styles.removeButton}
                          disabled={isSubmitting}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <div className={styles.fileInfo}>
                      JPG, PNG or HEIC 5 MB Max
                    </div>
                  </div>
                </div>
                {fieldErrors.logo && <span className={styles.fieldError}>{fieldErrors.logo}</span>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="org">Organization Acronym</label>
                <input
                  type="text"
                  id="org"
                  name="org"
                  placeholder="e.g., FAIPS, FTL, FAHSS"
                  value={form.org}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={`${styles.formInput} ${fieldErrors.org ? styles.inputError : ''}`}
                />
                {fieldErrors.org && <span className={styles.fieldError}>{fieldErrors.org}</span>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="orgName">Organization Name</label>
                <input
                  type="text"
                  id="orgName"
                  name="orgName"
                  placeholder="Full organization name"
                  value={form.orgName}
                  onChange={handleInputChange}
                  required
                  disabled={isSubmitting}
                  className={`${styles.formInput} ${fieldErrors.orgName ? styles.inputError : ''}`}
                />
                {fieldErrors.orgName && <span className={styles.fieldError}>{fieldErrors.orgName}</span>}
              </div>

              <div className={styles.stepActions}>
                <button 
                  type="button" 
                  onClick={handleNextStep}
                  className={styles.nextButton}
                  disabled={isSubmitting}
                >
                  Next Step
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Password Setup */}
          {currentStep === 2 && (
            <div className={styles.stepContent}>              
              {/* Password Requirements */}
              <div className={styles.passwordRequirements}>
                <h4 className={styles.passwordRequirementsTitle}>Password Requirements:</h4>
                <ul className={styles.requirementsList}>
                  <li className={styles.requirementItem}>
                    <div className={`${styles.checkIcon} ${passwordRequirements.length ? styles.valid : ''}`}>
                      {passwordRequirements.length ? <FaRegCheckCircle /> : <FaRegCircle />}
                    </div>
                    <span className={`${styles.requirementText} ${passwordRequirements.length ? styles.validText : ''}`}>
                      Minimum of 8 characters
                    </span>
                  </li>
                  <li className={styles.requirementItem}>
                    <div className={`${styles.checkIcon} ${passwordRequirements.lowercase ? styles.valid : ''}`}>
                      {passwordRequirements.lowercase ? <FaRegCheckCircle /> : <FaRegCircle />}
                    </div>
                    <span className={`${styles.requirementText} ${passwordRequirements.lowercase ? styles.validText : ''}`}>
                      At least one lowercase letter (a-z)
                    </span>
                  </li>
                  <li className={styles.requirementItem}>
                    <div className={`${styles.checkIcon} ${passwordRequirements.uppercase ? styles.valid : ''}`}>
                      {passwordRequirements.uppercase ? <FaRegCheckCircle /> : <FaRegCircle />}
                    </div>
                    <span className={`${styles.requirementText} ${passwordRequirements.uppercase ? styles.validText : ''}`}>
                      At least one uppercase letter (A-Z)
                    </span>
                  </li>
                  <li className={styles.requirementItem}>
                    <div className={`${styles.checkIcon} ${passwordRequirements.number ? styles.valid : ''}`}>
                      {passwordRequirements.number ? <FaRegCheckCircle /> : <FaRegCircle />}
                    </div>
                    <span className={`${styles.requirementText} ${passwordRequirements.number ? styles.validText : ''}`}>
                      At least one number (0-9)
                    </span>
                  </li>
                </ul>
              </div>

              <div className={styles.formField}>
                <label htmlFor="password">Password</label>
                <div className={styles.passwordInputWrapper}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    placeholder="Enter secure password"
                    value={form.password}
                    onChange={handleInputChange}
                    required
                    disabled={isSubmitting}
                    className={`${styles.formInput} ${fieldErrors.password ? styles.inputError : ''}`}
                  />
                  {form.password && (
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isSubmitting}
                      tabIndex={-1}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {fieldErrors.password && <span className={styles.fieldError}>{fieldErrors.password}</span>}
              </div>

              <div className={styles.formField}>
                <label htmlFor="confirmPassword">Confirm Password</label>
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
                    className={`${styles.formInput} ${fieldErrors.confirmPassword ? styles.inputError : ''}`}
                  />
                  {form.confirmPassword && (
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={isSubmitting}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  )}
                </div>
                {fieldErrors.confirmPassword && <span className={styles.fieldError}>{fieldErrors.confirmPassword}</span>}
              </div>

              <div className={styles.stepActions}>
                <button 
                  type="button" 
                  onClick={handlePrevStep}
                  className={styles.backButton}
                  disabled={isSubmitting}
                >
                  Back to Step 1
                </button>
                <button 
                  type="submit" 
                  className={styles.submitButton} 
                  disabled={isSubmitting || !passwordRequirements.length || !passwordRequirements.lowercase || !passwordRequirements.uppercase || !passwordRequirements.number}
                >
                  {isSubmitting ? "Creating Account..." : "Create Account"}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

export default AcceptInvitation
