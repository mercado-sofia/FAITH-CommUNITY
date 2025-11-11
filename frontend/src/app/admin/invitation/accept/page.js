"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TbMessage2Exclamation } from "react-icons/tb"
import styles from "./accept.module.css"

// Custom hooks
import { useInvitationValidation, useOrganizationValidation, useFormState, useInvitationSubmission } from "./hooks"

// Components
import { LoadingState, InvitationState, StepIndicator, OrganizationStep, PasswordStep } from "./components"

const AcceptInvitation = () => {
  // API base URL with environment variable support
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  
  const [token, setToken] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

  const searchParams = useSearchParams()

  // Custom hooks
  const { isValidating, error: validationError, success: validationSuccess, validateToken, setError: setValidationError, setSuccess: setValidationSuccess } = useInvitationValidation(API_BASE_URL)
  const { validationStatus, checkOrgAcronymExists, checkOrgNameExists, debouncedValidation, clearValidationStatus } = useOrganizationValidation(API_BASE_URL)
  const { form, logoPreview, showPassword, showConfirmPassword, passwordRequirements, fieldErrors, setForm, setFieldErrors, handleInputChange, handleLogoUpload, removeLogo, setShowPassword, setShowConfirmPassword } = useFormState()
  const { isSubmitting, error: submissionError, success: submissionSuccess, submitInvitation, setError: setSubmissionError, setSuccess: setSubmissionSuccess } = useInvitationSubmission(API_BASE_URL)

  useEffect(() => {
    const tokenParam = searchParams.get("token")
    if (!tokenParam) {
      setValidationError("Invalid invitation link. No token provided.")
      return
    }

    setToken(tokenParam)
    validateToken(tokenParam)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // Enhanced input change handler that includes validation
  const enhancedHandleInputChange = (e) => {
    handleInputChange(e, validationStatus, clearValidationStatus, debouncedValidation, checkOrgAcronymExists, checkOrgNameExists)
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
      
      // Check validation status for org fields
      if (form.org && validationStatus.org.isValid === false) {
        errors.org = validationStatus.org.message
      }
      if (form.orgName && validationStatus.orgName.isValid === false) {
        errors.orgName = validationStatus.orgName.message
      }
      
      // Check if validation is still in progress
      if (validationStatus.org.isValidating || validationStatus.orgName.isValidating) {
        setSubmissionError("Please wait for validation to complete")
        return
      }
      
      // Check if validation failed
      if (validationStatus.org.isValid === false || validationStatus.orgName.isValid === false) {
        setSubmissionError("Please fix the validation errors before proceeding")
        return
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
      setSubmissionError("")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

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
    await submitInvitation(form, token)
  }

  if (isValidating) {
    return <LoadingState />
  }

  if (validationError) {
    if (validationError === "ALREADY_ACCEPTED") {
      return <InvitationState type="alreadyAccepted" />
    }
    return <InvitationState type="error" />
  }

  if (submissionSuccess && submissionSuccess.includes("Account created successfully")) {
    return <InvitationState type="success" success={submissionSuccess} />
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Admin Account Setup</h1>
        </div>

        {submissionError && <div className={styles.errorMessage}>{submissionError}</div>}
        {validationSuccess && !validationSuccess.includes("Account created successfully") && (
          <div className={styles.successMessage}>
            <TbMessage2Exclamation className={styles.successIcon} />
            <span>{validationSuccess}</span>
          </div>
        )}

        <StepIndicator currentStep={currentStep} />

        <form onSubmit={handleSubmit} className={styles.form}>
          {currentStep === 1 && (
            <OrganizationStep
              form={form}
              logoPreview={logoPreview}
              handleLogoUpload={handleLogoUpload}
              removeLogo={removeLogo}
              handleInputChange={enhancedHandleInputChange}
              fieldErrors={fieldErrors}
              validationStatus={validationStatus}
              isSubmitting={isSubmitting}
              handleNextStep={handleNextStep}
            />
          )}

          {currentStep === 2 && (
            <PasswordStep
              form={form}
              handleInputChange={enhancedHandleInputChange}
              fieldErrors={fieldErrors}
              passwordRequirements={passwordRequirements}
              showPassword={showPassword}
              showConfirmPassword={showConfirmPassword}
              setShowPassword={setShowPassword}
              setShowConfirmPassword={setShowConfirmPassword}
              isSubmitting={isSubmitting}
              handlePrevStep={handlePrevStep}
              handleSubmit={handleSubmit}
            />
          )}
        </form>
      </div>
    </div>
  )
}

export default AcceptInvitation
