'use client'

import { useState, useEffect } from 'react'
import { getBrandingImageUrl } from '@/utils/shared/uploadPaths'

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
        
        const { API_BASE_URL } = await import('@/config/api');
        const baseUrl = API_BASE_URL || '';
        const { fetchPublicWithFallback } = await import('@/utils/shared/fetchPublicWithFallback');
        const data = await fetchPublicWithFallback(`${baseUrl}/api/superadmin/branding/public`);

        if (data?.success && data.data) {
          setLogoUrl(getBrandingImageUrl(data.data.logo_url, 'logo'))
          setLogoNameUrl(getBrandingImageUrl(data.data.name_url, 'name'))
          setFaviconUrl(getBrandingImageUrl(data.data.favicon_url, 'favicon'))
        } else {
          setLogoUrl(null)
          setLogoNameUrl(null)
          setFaviconUrl(getBrandingImageUrl(null, 'favicon'))
        }
      } catch (err) {
        setError(err.message)
        setLogoUrl(null)
        setLogoNameUrl(null)
        setFaviconUrl(getBrandingImageUrl(null, 'favicon'))
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
