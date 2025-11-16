import { useState } from "react"

export const useFormState = () => {
  const [form, setForm] = useState({
    org: "",
    orgName: "",
    logo: "",
    password: "",
    confirmPassword: "",
  })
  
  const [logoPreview, setLogoPreview] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false,
    lowercase: false,
    uppercase: false,
    number: false,
    match: false,
  })
  const [fieldErrors, setFieldErrors] = useState({})

  const handleInputChange = (e, validationStatus, clearValidationStatus, debouncedValidation, checkOrgAcronymExists, checkOrgNameExists) => {
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
    
    // Clear validation status when user starts typing
    if (name === "org" || name === "orgName") {
      clearValidationStatus(name)
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
    
    // Trigger real-time validation for org fields
    if (name === "org") {
      debouncedValidation("org", value, checkOrgAcronymExists)
    } else if (name === "orgName") {
      debouncedValidation("orgName", value, checkOrgNameExists)
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

  return {
    form,
    logoPreview,
    showPassword,
    showConfirmPassword,
    passwordRequirements,
    fieldErrors,
    setForm,
    setFieldErrors,
    handleInputChange,
    handleLogoUpload,
    removeLogo,
    setShowPassword,
    setShowConfirmPassword
  }
}
