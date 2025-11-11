import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

/**
 * Custom hook for managing URL parameters with state synchronization
 * Handles search, sort, pagination, and other filter parameters
 */
export const useURLParams = (defaultParams = {}) => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  
  const [params, setParams] = useState({
    search: '',
    sort: 'newest',
    show: 10,
    page: 1,
    ...defaultParams
  })

  // Function to update URL parameters
  const updateURLParams = useCallback((newParams) => {
    const urlParams = new URLSearchParams(searchParams)
    
    Object.entries(newParams).forEach(([key, value]) => {
      const defaults = {
        search: '',
        sort: 'newest',
        show: 10,
        page: 1
      }
      
      if (value && value !== defaults[key] && value !== '') {
        urlParams.set(key, value)
      } else {
        urlParams.delete(key)
      }
    })
    
    const newURL = `${pathname}?${urlParams.toString()}`
    router.replace(newURL, { scroll: false })
  }, [searchParams, pathname, router])

  // Handle URL parameters initialization
  useEffect(() => {
    const urlParams = {
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      show: searchParams.get('show'),
      page: searchParams.get('page')
    }

    setParams(prevParams => {
      const newParams = { ...prevParams }
      let hasChanges = false

      if (urlParams.search !== null) {
        newParams.search = urlParams.search
        hasChanges = true
      }
      if (urlParams.sort !== null) {
        newParams.sort = urlParams.sort
        hasChanges = true
      }
      if (urlParams.show !== null) {
        newParams.show = parseInt(urlParams.show) || 10
        hasChanges = true
      }
      if (urlParams.page !== null) {
        newParams.page = parseInt(urlParams.page) || 1
        hasChanges = true
      }

      return hasChanges ? newParams : prevParams
    })
  }, [searchParams])

  // Update individual parameter
  const updateParam = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }))
    updateURLParams({ [key]: value })
  }, [updateURLParams])

  // Update multiple parameters at once
  const updateParams = useCallback((newParams) => {
    setParams(prev => ({ ...prev, ...newParams }))
    updateURLParams(newParams)
  }, [updateURLParams])

  // Reset to defaults
  const resetParams = useCallback(() => {
    const defaults = {
      search: '',
      sort: 'newest',
      show: 10,
      page: 1,
      ...defaultParams
    }
    setParams(defaults)
    updateURLParams(defaults)
  }, [defaultParams, updateURLParams])

  return {
    params,
    updateParam,
    updateParams,
    resetParams,
    updateURLParams
  }
}
