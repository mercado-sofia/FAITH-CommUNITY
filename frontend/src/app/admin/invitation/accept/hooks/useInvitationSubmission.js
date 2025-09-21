import { useState } from "react"
import logger from "@/utils/logger"

export const useInvitationSubmission = (API_BASE_URL) => {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  const submitInvitation = async (form, token) => {
    setError("")
    setSuccess("")
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
        
        setSuccess("Account created successfully! You can now log in.")
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

  return {
    isSubmitting,
    error,
    success,
    submitInvitation,
    setError,
    setSuccess
  }
}
