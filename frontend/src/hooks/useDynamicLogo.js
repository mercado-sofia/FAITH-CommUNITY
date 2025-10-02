'use client'

import { useState, useEffect } from 'react'
import { getBrandingImageUrl } from '@/utils/uploadPaths'

/**
 * Custom hook to fetch and manage dynamic logo from branding API
 * @returns {Object} - { logoUrl, logoNameUrl, faviconUrl, isLoading, error }
 */
export const useDynamicLogo = () => {
  const [logoUrl, setLogoUrl] = useState(null)
  const [logoNameUrl, setLogoNameUrl] = useState(null)
  const [faviconUrl, setFaviconUrl] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchBranding = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
        const response = await fetch(`${baseUrl}/api/superadmin/branding/public`)
        
        if (!response.ok) {
          throw new Error(`Failed to fetch branding: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success && data.data) {
          setLogoUrl(getBrandingImageUrl(data.data.logo_url, 'logo'))
          setLogoNameUrl(getBrandingImageUrl(data.data.name_url, 'name'))
          setFaviconUrl(getBrandingImageUrl(data.data.favicon_url, 'favicon'))
        } else {
          // If no branding data, don't set any logo
          setLogoUrl(null)
          setLogoNameUrl(null)
          setFaviconUrl(null)
        }
      } catch (err) {
        setError(err.message)
        // Don't set any logo on error
        setLogoUrl(null)
        setLogoNameUrl(null)
        setFaviconUrl(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBranding()
  }, [])

  return {
    logoUrl,
    logoNameUrl,
    faviconUrl,
    isLoading,
    error
  }
}

export default useDynamicLogo
