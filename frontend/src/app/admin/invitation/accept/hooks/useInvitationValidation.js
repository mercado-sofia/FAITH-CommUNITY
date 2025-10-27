import { useState, useCallback } from "react"
import logger from "@/utils/logger"

export const useInvitationValidation = (API_BASE_URL) => {
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const validateToken = useCallback(async (token) => {
    try {
      
      const response = await fetch(`${API_BASE_URL}/api/invitations/validate/${token}`)
      const data = await response.json()

      if (response.ok) {
        setSuccess("Please complete your account setup.")
      } else if (response.status === 410) {
        // Special case for already accepted invitations
        setError("ALREADY_ACCEPTED")
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

  return {
    isValidating,
    error,
    success,
    validateToken,
    setError,
    setSuccess
  }
}
