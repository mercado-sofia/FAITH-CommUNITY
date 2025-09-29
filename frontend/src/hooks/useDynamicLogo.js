'use client'

import { useState, useEffect } from 'react'

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
          setLogoUrl(data.data.logo_url)
          setLogoNameUrl(data.data.name_url)
          setFaviconUrl(data.data.favicon_url)
        } else {
          // If no branding data, use default logo
          setLogoUrl('/assets/logos/faith_logo.png')
        }
      } catch (err) {
        console.error('Error fetching dynamic logo:', err)
        setError(err.message)
        // Fallback to default logo on error
        setLogoUrl('/assets/logos/faith_logo.png')
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
