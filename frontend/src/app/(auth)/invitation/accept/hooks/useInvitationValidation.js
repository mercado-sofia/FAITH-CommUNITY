import { useState, useCallback } from "react"
import logger from "@/utils/logger"

export const useInvitationValidation = () => {
  const [isValidating, setIsValidating] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const validateToken = useCallback(async (token) => {
    try {
      const { API_BASE_URL } = await import('@/config/api');
      const response = await fetch(`${API_BASE_URL || ''}/api/invitations/validate/${token}`, {
        credentials: 'include', // CRITICAL: Include httpOnly cookies
        headers: {
          'Content-Type': 'application/json',
        }
      })
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
      const { API_BASE_URL } = await import('@/config/api');
      logger.apiError(`${API_BASE_URL || ''}/api/invitations/validate/${token}`, err, { 
        context: 'token_validation' 
      })
      setError("Failed to validate invitation token")
    } finally {
      setIsValidating(false)
    }
  }, [])

  return {
    isValidating,
    error,
    success,
    validateToken,
    setError,
    setSuccess
  }
}
