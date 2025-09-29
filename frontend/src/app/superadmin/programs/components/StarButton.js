import React, { useState, useEffect } from 'react'
import { useAddFeaturedProjectMutation, useRemoveFeaturedProjectMutation, useCheckFeaturedStatusQuery } from '@/rtk/superadmin/programsApi'
import UnfeatureConfirmationModal from './UnfeatureConfirmationModal'
import FeatureConfirmationModal from './FeatureConfirmationModal'
import styles from './styles/StarButton.module.css'

const StarButton = ({ programId, programTitle }) => {
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showUnfeatureModal, setShowUnfeatureModal] = useState(false)
  const [showFeatureModal, setShowFeatureModal] = useState(false)

  // Check if program is already featured
  const { 
    data: featuredStatus, 
    isLoading: statusLoading,
    refetch: refetchStatus 
  } = useCheckFeaturedStatusQuery(programId, {
    skip: !programId
  })

  // Mutations for starring/unstarring
  const [addFeaturedProject] = useAddFeaturedProjectMutation()
  const [removeFeaturedProject] = useRemoveFeaturedProjectMutation()

  // Update local state when featured status is fetched
  useEffect(() => {
    if (featuredStatus !== undefined) {
      setIsStarred(featuredStatus)
    }
  }, [featuredStatus])

  const handleStarClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (isLoading || statusLoading) return

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
      const result = await addFeaturedProject(programId).unwrap()
      if (result.success) {
        setIsStarred(true)
      }
      
      // Refetch status to ensure consistency
      refetchStatus()
    } catch (error) {
      // Handle error silently in production
      // Show user-friendly error message
      // Handle error silently in production
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromFeatured = async () => {
    setIsLoading(true)
    
    try {
      const result = await removeFeaturedProject(programId).unwrap()
      if (result.success) {
        setIsStarred(false)
      }
      
      // Refetch status to ensure consistency
      refetchStatus()
    } catch (error) {
      // Handle error silently in production
      // Show user-friendly error message
      // Handle error silently in production
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
        title={isStarred ? 'Remove from Featured Projects' : 'Add to Featured Projects'}
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
        projectTitle={programTitle}
        isLoading={isLoading}
      />

      <FeatureConfirmationModal
        isOpen={showFeatureModal}
        onClose={handleFeatureCancel}
        onConfirm={handleFeatureConfirm}
        projectTitle={programTitle}
        isLoading={isLoading}
      />
    </>
  )
}

export default StarButton
