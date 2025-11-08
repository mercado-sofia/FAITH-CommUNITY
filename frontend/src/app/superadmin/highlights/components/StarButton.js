import React, { useState, useEffect } from 'react'
import { useAddFeaturedHighlightMutation, useRemoveFeaturedHighlightMutation, useCheckFeaturedStatusQuery } from '@/rtk/superadmin/highlightsApi'
import styles from './styles/StarButton.module.css'

// Helper functions to manage starred highlights in localStorage
const STARRED_HIGHLIGHTS_KEY = 'superadmin_starred_highlights'

const getStarredHighlights = () => {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STARRED_HIGHLIGHTS_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

const setStarredHighlight = (highlightId, isStarred) => {
  if (typeof window === 'undefined') return
  try {
    const starred = getStarredHighlights()
    if (isStarred) {
      starred.add(highlightId)
    } else {
      starred.delete(highlightId)
    }
    localStorage.setItem(STARRED_HIGHLIGHTS_KEY, JSON.stringify(Array.from(starred)))
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('starredHighlightsChanged'))
  } catch (error) {
    console.error('Error saving starred highlights:', error)
  }
}

const StarButton = ({ highlightId, highlightTitle, onStarChange }) => {
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

    setIsLoading(true)
    const newStarredState = !isStarred
    
    try {
      // Use localStorage directly (API endpoints not implemented yet)
      setIsStarred(newStarredState)
      setStarredHighlight(highlightId, newStarredState)
      if (onStarChange) onStarChange(highlightId, newStarredState)
      
      // Try to use API if available (for future use)
      // This will fail silently if endpoints don't exist
      try {
        if (isStarred) {
          await removeFeaturedHighlight(highlightId).unwrap()
        } else {
          await addFeaturedHighlight(highlightId).unwrap()
        }
      } catch (apiError) {
        // API not available - that's okay, we're using localStorage
        // Silently ignore the error
      }
    } catch (error) {
      // Fallback: revert state if something goes wrong
      setIsStarred(!newStarredState)
      console.error('Error toggling star:', error)
    } finally {
      setIsLoading(false)
    }
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
  )
}

export default StarButton

