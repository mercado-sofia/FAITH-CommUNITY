import { useState, useEffect } from 'react'
import { useAddFeaturedHighlightMutation, useRemoveFeaturedHighlightMutation, useCheckFeaturedStatusQuery } from '@/rtk/superadmin/highlightsApi'
import UnfeatureConfirmationModal from './UnfeatureConfirmationModal'
import FeatureConfirmationModal from './FeatureConfirmationModal'
import styles from './styles/StarButton.module.css'

// Helper functions to manage starred highlights in localStorage
// Store as ordered array to preserve the order in which highlights were starred
const STARRED_HIGHLIGHTS_KEY = 'superadmin_starred_highlights'
const MAX_FEATURED_HIGHLIGHTS = 8

const getStarredHighlights = () => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STARRED_HIGHLIGHTS_KEY)
    if (!stored) return new Set()
    
    // Handle both old format (array) and new format (array)
    const array = JSON.parse(stored)
    return new Set(Array.isArray(array) ? array : [])
  } catch {
    return new Set()
  }
}

// Get starred highlights as ordered array (preserves order)
const getStarredHighlightsOrdered = () => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(STARRED_HIGHLIGHTS_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

const setStarredHighlight = (highlightId, isStarred) => {
  if (typeof window === 'undefined') return
  try {
    const starredOrdered = getStarredHighlightsOrdered()
    
    if (isStarred) {
      // Check if already starred
      if (starredOrdered.includes(highlightId)) {
        return // Already starred, no change needed
      }
      
      // Check if we've reached the maximum
      if (starredOrdered.length >= MAX_FEATURED_HIGHLIGHTS) {
        throw new Error(`Maximum of ${MAX_FEATURED_HIGHLIGHTS} featured highlights allowed`)
      }
      
      // Add to the end of the array (preserves order)
      starredOrdered.push(highlightId)
    } else {
      // Remove from array
      const index = starredOrdered.indexOf(highlightId)
      if (index > -1) {
        starredOrdered.splice(index, 1)
      }
    }
    
    localStorage.setItem(STARRED_HIGHLIGHTS_KEY, JSON.stringify(starredOrdered))
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('starredHighlightsChanged'))
  } catch (error) {
    console.error('Error saving starred highlights:', error)
    throw error
  }
}

// Export for use in other components
export const getFeaturedHighlightsOrdered = () => {
  return getStarredHighlightsOrdered()
}

const StarButton = ({ highlightId, highlightTitle, onStarChange }) => {
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showUnfeatureModal, setShowUnfeatureModal] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)

  // Check if highlight is already featured
  // Note: API endpoints may not exist yet (for future purposes)
  // Skip API queries for now and only use localStorage
  // These are kept for future use when API endpoints are implemented
  const { 
    data: featuredStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus,
    error: statusError
  } = useCheckFeaturedStatusQuery(highlightId, {
    skip: true // Skip API query for now - use localStorage only
  })

  // Mutations for starring/unstarring (for future use)
  const [addFeaturedHighlight] = useAddFeaturedHighlightMutation()
  const [removeFeaturedHighlight] = useRemoveFeaturedHighlightMutation()
  
  // Suppress unused variable warnings
  void featuredStatus
  void statusLoading
  void refetchStatus
  void statusError

  // Check localStorage on mount and when highlightId changes
  useEffect(() => {
    if (highlightId) {
      const starred = getStarredHighlights()
      setIsStarred(starred.has(highlightId))
    }
  }, [highlightId])

  // Listen for changes from other components
  useEffect(() => {
    const handleStarredChange = () => {
      if (highlightId) {
        const starred = getStarredHighlights()
        setIsStarred(starred.has(highlightId))
      }
    }
    
    if (typeof window !== 'undefined') {
      window.addEventListener('starredHighlightsChanged', handleStarredChange)
      return () => {
        window.removeEventListener('starredHighlightsChanged', handleStarredChange)
      }
    }
  }, [highlightId])

  const handleStarClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading) return

    if (isStarred) {
      // Show confirmation modal for unfeaturing
      setShowUnfeatureModal(true)
    } else {
      // Show confirmation modal for featuring
      setShowFeatureModal(true)
    }
  }

  const addToFeatured = async () => {
    setIsLoading(true)
    
    try {
      // Check if we've reached the maximum before adding
      const starredOrdered = getStarredHighlightsOrdered()
      if (starredOrdered.length >= MAX_FEATURED_HIGHLIGHTS) {
        alert(`Maximum of ${MAX_FEATURED_HIGHLIGHTS} featured highlights allowed. Please unfeature another highlight first.`)
        setIsLoading(false)
        return
      }
      
      const newStarredState = true
      setIsStarred(newStarredState)
      setStarredHighlight(highlightId, newStarredState)
      if (onStarChange) onStarChange(highlightId, newStarredState)
      
      // Try to use API if available (for future use)
      // This will fail silently if endpoints don't exist
      try {
        await addFeaturedHighlight(highlightId).unwrap()
      } catch (apiError) {
        // API not available - that's okay, we're using localStorage
        // Silently ignore the error
      }
    } catch (error) {
      // Fallback: revert state if something goes wrong
      setIsStarred(false)
      console.error('Error adding to featured:', error)
      if (error.message && error.message.includes('Maximum')) {
        alert(error.message)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromFeatured = async () => {
    setIsLoading(true)
    
    try {
      const newStarredState = false
      setIsStarred(newStarredState)
      setStarredHighlight(highlightId, newStarredState)
      if (onStarChange) onStarChange(highlightId, newStarredState)
      
      // Try to use API if available (for future use)
      // This will fail silently if endpoints don't exist
      try {
        await removeFeaturedHighlight(highlightId).unwrap()
      } catch (apiError) {
        // API not available - that's okay, we're using localStorage
        // Silently ignore the error
      }
    } catch (error) {
      // Fallback: revert state if something goes wrong
      setIsStarred(true)
      console.error('Error removing from featured:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUnfeatureConfirm = async () => {
    await removeFromFeatured()
    setShowUnfeatureModal(false)
  }

  const handleUnfeatureCancel = () => {
    setShowUnfeatureModal(false)
  }

  const handleFeatureConfirm = async () => {
    await addToFeatured()
    setShowFeatureModal(false)
  }

  const handleFeatureCancel = () => {
    setShowFeatureModal(false)
  }

  // Don't show loading state (API queries are skipped)
  // if (statusLoading && !statusError) {
  //   return (
  //     <div className={styles.starButton}>
  //       <div className={styles.starLoading}></div>
  //     </div>
  //   )
  // }

  return (
    <>
      <button
        className={`${styles.starButton} ${isStarred ? styles.starred : styles.unstarred}`}
        onClick={handleStarClick}
        disabled={isLoading}
        title={isStarred ? 'Remove from Featured Highlights' : 'Add to Featured Highlights'}
      >
        {isLoading ? (
          <div className={styles.starLoading}></div>
        ) : (
          <svg 
            className={styles.starIcon} 
            viewBox="0 0 24 24" 
            fill={isStarred ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        )}
      </button>

      <UnfeatureConfirmationModal
        isOpen={showUnfeatureModal}
        onClose={handleUnfeatureCancel}
        onConfirm={handleUnfeatureConfirm}
        highlightTitle={highlightTitle}
        isLoading={isLoading}
      />

      <FeatureConfirmationModal
        isOpen={showFeatureModal}
        onClose={handleFeatureCancel}
        onConfirm={handleFeatureConfirm}
        highlightTitle={highlightTitle}
        isLoading={isLoading}
      />
    </>
  )
}

export default StarButton

