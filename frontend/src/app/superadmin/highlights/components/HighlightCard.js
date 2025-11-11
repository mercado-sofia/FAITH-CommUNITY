'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import StarButton from './StarButton'
import styles from './styles/HighlightCard.module.css'

const HighlightCard = ({ highlight, onViewDetails }) => {
  const [imageError, setImageError] = useState(false)

  const formatDate = (dateString) => {
    if (!dateString) return 'No date'
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true })
    } catch {
      return 'Invalid date'
    }
  }

  const truncateText = (text, maxLength = 120) => {
    if (!text) return ''
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  const getImageUrl = () => {
    if (!highlight.media || highlight.media.length === 0) return null
    
    // Get the first image from media array
    const firstImage = highlight.media.find(item => 
      item.type === 'image' || 
      item.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)
    )
    
    return firstImage?.url || firstImage?.filename || null
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#1d9782'
      case 'pending': return '#8b8e8d'
      case 'rejected': return '#e53e3e'
      default: return '#6b7280'
    }
  }

  // Get organization color for badge
  const getOrganizationColor = () => {
    if (highlight.organization_color) {
      return highlight.organization_color
    }
    // Default fallback color if no organization color is set
    return '#1d9782'
  }

  // Get text color for organization badge based on background color
  const getTextColorForBadge = (bgColor) => {
    if (!bgColor) return 'white'
    
    const color = bgColor.toLowerCase()
    
    // Check for white colors
    if (color === '#ffffff' || color === '#fff' || color === 'white') {
      return '#374151'
    }
    
    // Check for light gray colors
    if (color === '#f3f4f6' || color === '#f9fafb' || color === '#e5e7eb' || 
        color === '#d1d5db' || color === '#9ca3af' || color === '#6b7280') {
      return '#374151'
    }
    
    // Check if it's a light color by hex value
    if (color.startsWith('#')) {
      const hex = color.replace('#', '')
      const r = parseInt(hex.substr(0, 2), 16)
      const g = parseInt(hex.substr(2, 2), 16)
      const b = parseInt(hex.substr(4, 2), 16)
      const brightness = (r * 299 + g * 587 + b * 114) / 1000
      
      // If brightness is high (light color), use dark text
      return brightness > 128 ? '#374151' : 'white'
    }
    
    // Default to white for other colors
    return 'white'
  }

  const imageUrl = getImageUrl()
  const isApproved = highlight.status?.toLowerCase() === 'approved'
  const orgColor = getOrganizationColor()
  const badgeTextColor = getTextColorForBadge(orgColor)

  return (
    <div className={styles.featuredCard}>
      <div className={styles.cardImageContainer}>
        {imageUrl && !imageError ? (
          <Image 
            src={imageUrl}
            alt={highlight.title}
            className={styles.cardImage}
            width={300}
            height={200}
            onError={() => setImageError(true)}
          />
        ) : null}
        <div className={styles.imagePlaceholder} style={{ display: imageUrl && !imageError ? 'none' : 'flex' }}>
          <span>No Image</span>
        </div>
        
        {/* Organization Badge */}
        {highlight.organization_acronym && (
          <div 
            className={styles.orgBadge}
            style={{ 
              backgroundColor: orgColor,
              color: badgeTextColor
            }}
          >
            <span className={styles.orgAcronym}>{highlight.organization_acronym}</span>
          </div>
        )}
        
        {/* Star Button - Only show for approved highlights */}
        {isApproved && (
          <StarButton 
            highlightId={highlight.id}
            highlightTitle={highlight.title}
            onStarChange={() => {
              // Trigger refresh when star changes
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('starredHighlightsChanged'))
              }
            }}
          />
        )}
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{highlight.title}</h3>
        </div>
        <p className={styles.cardOrganization}>{highlight.organization_name || 'Unknown Organization'}</p>
        
        {/* Associated Program */}
        {highlight.program_title && (
          <p className={styles.cardProgram} style={{ marginTop: '4px', marginBottom: '8px', fontSize: '0.875rem', color: '#6b7280' }}>
            <span style={{ fontWeight: '500' }}>Program:</span> {highlight.program_title}
          </p>
        )}
        
        <p className={styles.cardDescription}>
          {truncateText(highlight.description)}
        </p>
        
        <div className={styles.cardFooter}>
          <div className={styles.statusBadgeContainer}>
            <span 
              className={`${styles.statusBadge} ${styles[highlight.status?.toLowerCase()]}`}
              style={{ backgroundColor: getStatusColor(highlight.status) }}
            >
              {highlight.status || 'Unknown'}
            </span>
          </div>
          <span className={styles.cardDate}>
            {formatDate(highlight.created_at)}
          </span>
        </div>
        
        {/* View Details Button */}
        <div className={styles.featuredCardFooter}>
          <button 
            className={styles.viewDetailsButton}
            onClick={() => {
              if (onViewDetails) {
                onViewDetails(highlight)
              }
            }}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default HighlightCard

