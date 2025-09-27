// Validation middleware
export const validateOrganizationId = (req, res, next) => {
  const { organization_id } = req.params.organization_id ? req.params : req.body

  if (!organization_id) {
    return res.status(400).json({
      success: false,
      message: "Organization ID is required",
    })
  }

  if (isNaN(organization_id)) {
    return res.status(400).json({
      success: false,
      message: "Organization ID must be a valid number",
    })
  }

  next()
}

export const validateEmail = (email) => {
  if (!email) return true // Optional field
  return /\S+@\S+\.\S+/.test(email)
}

export const validateFacebookUrl = (url) => {
  if (!url) return true // Optional field
  return url.includes("facebook.com")
}

export const validateTextLength = (text, minLength = 1, maxLength = 1000) => {
  if (!text || typeof text !== "string") return false
  const trimmed = text.trim()
  return trimmed.length >= minLength && trimmed.length <= maxLength
}