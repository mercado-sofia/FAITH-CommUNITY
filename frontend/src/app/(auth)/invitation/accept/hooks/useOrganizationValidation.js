import { useState, useCallback, useRef } from "react"
import logger from "@/utils/logger"

export const useOrganizationValidation = () => {
  const [validationStatus, setValidationStatus] = useState({
    org: { isValidating: false, isValid: null, message: "" },
    orgName: { isValidating: false, isValid: null, message: "" }
  })
  
  const debounceTimeoutRef = useRef({})

  // Function to check if organization acronym exists
  const checkOrgAcronymExists = useCallback(async (acronym) => {
    if (!acronym || acronym.length < 2) {
      setValidationStatus(prev => ({
        ...prev,
        org: { isValidating: false, isValid: null, message: "" }
      }))
      return
    }

    setValidationStatus(prev => ({
      ...prev,
      org: { isValidating: true, isValid: null, message: "Checking availability..." }
    }))

    try {
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/organization/check-acronym/${encodeURIComponent(acronym)}`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const data = await response.json()

      if (response.ok) {
        const exists = data.exists
        setValidationStatus(prev => ({
          ...prev,
          org: {
            isValidating: false,
            isValid: !exists,
            message: exists ? "Organization acronym already exists" : "Organization acronym is available"
          }
        }))
      } else {
        setValidationStatus(prev => ({
          ...prev,
          org: { isValidating: false, isValid: null, message: "Server error - please try again" }
        }))
      }
    } catch (err) {
      const { API_BASE_URL } = await import('@/config/api');
      logger.apiError(`${API_BASE_URL || ''}/api/organization/check-acronym/${acronym}`, err, {
        context: 'check_acronym_validation'
      })
      setValidationStatus(prev => ({
        ...prev,
        org: { isValidating: false, isValid: null, message: "Network error - check your connection" }
      }))
    }
  }, [])

  // Function to check if organization name exists
  const checkOrgNameExists = useCallback(async (orgName) => {
    if (!orgName || orgName.length < 3) {
      setValidationStatus(prev => ({
        ...prev,
        orgName: { isValidating: false, isValid: null, message: "" }
      }))
      return
    }

    setValidationStatus(prev => ({
      ...prev,
      orgName: { isValidating: true, isValid: null, message: "Checking availability..." }
    }))

    try {
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/organization/check-name/${encodeURIComponent(orgName)}`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        }
      })
      const data = await response.json()

      if (response.ok) {
        const exists = data.exists
        setValidationStatus(prev => ({
          ...prev,
          orgName: {
            isValidating: false,
            isValid: !exists,
            message: exists ? "Organization name already exists" : "Organization name is available"
          }
        }))
      } else {
        setValidationStatus(prev => ({
          ...prev,
          orgName: { isValidating: false, isValid: null, message: "Server error - please try again" }
        }))
      }
    } catch (err) {
      const { API_BASE_URL } = await import('@/config/api');
      logger.apiError(`${API_BASE_URL || ''}/api/organization/check-name/${orgName}`, err, {
        context: 'check_name_validation'
      })
      setValidationStatus(prev => ({
        ...prev,
        orgName: { isValidating: false, isValid: null, message: "Network error - check your connection" }
      }))
    }
  }, [])

  // Debounced validation function
  const debouncedValidation = useCallback((fieldName, value, validationFn) => {
    // Clear existing timeout
    if (debounceTimeoutRef.current[fieldName]) {
      clearTimeout(debounceTimeoutRef.current[fieldName])
    }

    // Set new timeout
    debounceTimeoutRef.current[fieldName] = setTimeout(() => {
      validationFn(value)
    }, 500) // 500ms debounce
  }, [])

  const clearValidationStatus = useCallback((fieldName) => {
    setValidationStatus(prev => ({
      ...prev,
      [fieldName]: { isValidating: false, isValid: null, message: "" }
    }))
  }, [])

  return {
    validationStatus,
    checkOrgAcronymExists,
    checkOrgNameExists,
    debouncedValidation,
    clearValidationStatus
  }
}
