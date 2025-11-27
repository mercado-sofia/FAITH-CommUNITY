import { useState, useEffect } from 'react'
import { useAddFeaturedHighlightMutation, useRemoveFeaturedHighlightMutation, useCheckFeaturedStatusQuery } from '@/rtk/superadmin/highlightsApi'
import UnfeatureConfirmationModal from './UnfeatureConfirmationModal'
import FeatureConfirmationModal from './FeatureConfirmationModal'
import styles from './styles/StarButton.module.css'

const StarButton = ({ highlightId, highlightTitle, organizationId, onStarChange, highlightStatus }) => {
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showUnfeatureModal, setShowUnfeatureModal] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)

  // Check if highlight is already featured using API
  // Skip query if highlight is archived
  const { 
    data: featuredStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus
  } = useCheckFeaturedStatusQuery(highlightId, {
    skip: !highlightId || highlightStatus === 'archived'
  })

  // Mutations for starring/unstarring
  const [addFeaturedHighlight] = useAddFeaturedHighlightMutation()
  const [removeFeaturedHighlight] = useRemoveFeaturedHighlightMutation()

  // Update starred state when API response changes
  // Also check highlight status - if archived, always set to false
  useEffect(() => {
    if (highlightStatus === 'archived') {
      setIsStarred(false)
      return
    }
    if (featuredStatus) {
      setIsStarred(featuredStatus.isFeatured || false)
    }
  }, [featuredStatus, highlightStatus])

  // Refetch status when highlightId changes
  useEffect(() => {
    if (highlightId && highlightStatus !== 'archived') {
      refetchStatus()
    }
  }, [highlightId, highlightStatus, refetchStatus])

  // Listen for highlight status changes (archive/unarchive) and refetch featured status
  useEffect(() => {
    const handleHighlightStatusChanged = () => {
      // Refetch featured status when highlight status changes
      if (highlightStatus !== 'archived') {
        refetchStatus()
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('highlightStatusChanged', handleHighlightStatusChanged)
      
      return () => {
        window.removeEventListener('highlightStatusChanged', handleHighlightStatusChanged)
      }
    }
  }, [refetchStatus, highlightStatus])

  // Refetch featured status when highlight status changes from archived to non-archived
  useEffect(() => {
    if (highlightStatus && highlightStatus !== 'archived' && highlightId) {
      // If highlight was just restored (status changed from archived), refetch featured status
      refetchStatus()
    }
  }, [highlightStatus, highlightId, refetchStatus])

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

  const addToFeatured = async (impactLevel = 'average') => {
    setIsLoading(true)
    
    try {
      await addFeaturedHighlight({ highlightId, organizationId, impactLevel }).unwrap()
      setIsStarred(true)
      if (onStarChange) onStarChange(highlightId, true)
      // Refetch status to get updated display order
      refetchStatus()
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('starredHighlightsChanged'))
      }
    } catch (error) {
      setIsStarred(false)
      const errorMessage = error?.data?.error || error?.message || 'Failed to add highlight to featured'
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromFeatured = async () => {
    setIsLoading(true)
    
    try {
      await removeFeaturedHighlight(highlightId).unwrap()
      setIsStarred(false)
      if (onStarChange) onStarChange(highlightId, false)
      // Refetch status
      refetchStatus()
      // Dispatch event to notify other components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('starredHighlightsChanged'))
      }
    } catch (error) {
      setIsStarred(true)
      const errorMessage = error?.data?.error || error?.message || 'Failed to remove highlight from featured'
      alert(errorMessage)
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

  const handleFeatureConfirm = async (impactLevel) => {
    await addToFeatured(impactLevel)
    setShowFeatureModal(false)
  }

  const handleFeatureCancel = () => {
    setShowFeatureModal(false)
  }

  // Show loading state while checking featured status
  if (statusLoading) {
    return (
      <div className={styles.starButton}>
        <div className={styles.starLoading}></div>
      </div>
    )
  }

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

