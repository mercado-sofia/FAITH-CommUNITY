import React, { useState, useEffect } from 'react'
import { useAddFeaturedProjectMutation, useRemoveFeaturedProjectMutation, useCheckFeaturedStatusQuery } from '@/rtk/superadmin/featuredProjectsApi'
import styles from './styles/StarButton.module.css'

const StarButton = ({ programId, programTitle }) => {
  const [isStarred, setIsStarred] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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

    setIsLoading(true)
    
    try {
      if (isStarred) {
        // Remove from featured projects
        const result = await removeFeaturedProject(programId).unwrap()
        if (result.success) {
          setIsStarred(false)
          console.log(`Removed "${programTitle}" from featured projects`)
        }
      } else {
        // Add to featured projects
        const result = await addFeaturedProject(programId).unwrap()
        if (result.success) {
          setIsStarred(true)
          console.log(`Added "${programTitle}" to featured projects`)
        }
      }
      
      // Refetch status to ensure consistency
      refetchStatus()
    } catch (error) {
      console.error('Error toggling featured status:', error)
      // Show user-friendly error message
      alert(error?.data?.message || 'Failed to update featured status')
    } finally {
      setIsLoading(false)
    }
  }

  if (statusLoading) {
    return (
      <div className={styles.starButton}>
        <div className={styles.starLoading}></div>
      </div>
    )
  }

  return (
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
  )
}

export default StarButton
