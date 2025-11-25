'use client'

import { useState } from 'react'
import Image from 'next/image'
import { formatDistanceToNow } from 'date-fns'
import DOMPurify from 'dompurify'
import StarButton from './StarButton'
import styles from './styles/HighlightCard.module.css'

const HighlightCard = ({ highlight, onViewDetails, searchQuery = '' }) => {
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
    // Strip HTML tags for preview
    if (typeof document !== 'undefined') {
      const textContent = document.createElement('div')
      textContent.innerHTML = DOMPurify.sanitize(text)
      const plainText = (textContent.textContent || textContent.innerText || '').trim()
      return plainText.length > maxLength ? plainText.substring(0, maxLength) + '...' : plainText
    }
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
  }

  // Function to highlight matching text sequences
  const highlightText = (text, query) => {
    if (!text || !query || !query.trim()) {
      return text
    }

    const searchTerm = query.trim()
    const searchWords = searchTerm.split(/\s+/).filter(word => word.length > 0)
    
    // If no search words, return original text
    if (searchWords.length === 0) {
      return text
    }

    // Convert text to string if needed
    const textStr = String(text)
    
    // Collect all match positions for all search words
    const allMatches = []
    
    searchWords.forEach(word => {
      if (word.length > 0) {
        const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        
        // Find all matches at word boundaries (same logic as search)
        const wordBoundaryPattern = new RegExp(`(^|\\b)${escapedWord}`, 'gi')
        const wholeWordPattern = new RegExp(`\\b${escapedWord}\\b`, 'gi')
        
        // Check whole word matches
        let match
        while ((match = wholeWordPattern.exec(textStr)) !== null) {
          allMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            word: word
          })
        }
        
        // Reset regex
        wholeWordPattern.lastIndex = 0
        
        // Check word boundary matches (at start of word)
        while ((match = wordBoundaryPattern.exec(textStr)) !== null) {
          const matchStart = match.index + (match[1] ? match[1].length : 0)
          const matchEnd = matchStart + word.length
          
          // Avoid duplicates
          const isDuplicate = allMatches.some(m => 
            m.start === matchStart && m.end === matchEnd
          )
          
          if (!isDuplicate) {
            allMatches.push({
              start: matchStart,
              end: matchEnd,
              word: word
            })
          }
        }
      }
    })
    
    // If no matches, return original text
    if (allMatches.length === 0) {
      return text
    }
    
    // Sort matches by position
    allMatches.sort((a, b) => a.start - b.start)
    
    // Merge overlapping matches
    const mergedMatches = []
    for (let i = 0; i < allMatches.length; i++) {
      const current = allMatches[i]
      if (mergedMatches.length === 0) {
        mergedMatches.push(current)
      } else {
        const last = mergedMatches[mergedMatches.length - 1]
        if (current.start <= last.end) {
          // Overlapping - merge them
          last.end = Math.max(last.end, current.end)
        } else {
          // Non-overlapping - add new match
          mergedMatches.push(current)
        }
      }
    }
    
    // Build React elements array
    const parts = []
    let lastIndex = 0
    
    mergedMatches.forEach(match => {
      // Add text before match
      if (match.start > lastIndex) {
        parts.push(textStr.substring(lastIndex, match.start))
      }
      
      // Add highlighted match
      parts.push(
        <mark key={`${match.start}-${match.end}`} className={styles.highlightedText}>
          {textStr.substring(match.start, match.end)}
        </mark>
      )
      
      lastIndex = match.end
    })
    
    // Add remaining text
    if (lastIndex < textStr.length) {
      parts.push(textStr.substring(lastIndex))
    }
    
    return <>{parts}</>
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

  const getVideoUrl = () => {
    if (!highlight.media || highlight.media.length === 0) return null
    
    // Get the first video from media array
    const firstVideo = highlight.media.find(item => 
      item.type === 'video' || 
      item.mimetype?.startsWith('video/') ||
      /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(item.filename || item.url)
    )
    
    return firstVideo?.url || firstVideo?.filename || null
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return '#1d9782'
      case 'pending': return '#8b8e8d'
      case 'rejected': return '#e53e3e'
      default: return '#6b7280'
    }
  }

  // Get impact level label
  const getImpactLevelLabel = (impactLevel) => {
    if (!impactLevel) return null
    switch (impactLevel.toLowerCase()) {
      case 'low':
        return 'Low Impact'
      case 'average':
        return 'Average Impact'
      case 'high':
        return 'High Impact'
      default:
        return null
    }
  }

  const imageUrl = getImageUrl()
  const videoUrl = getVideoUrl()
  const isApproved = highlight.status?.toLowerCase() === 'approved'
  const impactLevelLabel = getImpactLevelLabel(highlight.impact_level)
  
  // Determine what to show: image first, then video, then placeholder
  const hasImage = imageUrl && !imageError
  const hasVideo = videoUrl && !hasImage
  const showPlaceholder = !hasImage && !hasVideo

  return (
    <div className={styles.featuredCard}>
      <div className={styles.cardImageContainer}>
        {hasImage ? (
          <Image 
            src={imageUrl}
            alt={highlight.title}
            className={styles.cardImage}
            width={300}
            height={200}
            onError={() => setImageError(true)}
          />
        ) : hasVideo ? (
          <video
            className={styles.cardImage}
            src={videoUrl}
            muted
            playsInline
            preload="metadata"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: '8px 8px 0 0',
              backgroundColor: '#000'
            }}
            onError={() => {
              // If video fails to load, show placeholder
              setImageError(true)
            }}
            onLoadedMetadata={(e) => {
              // Seek to first frame to show as preview
              e.target.currentTime = 0.1
            }}
          />
        ) : null}
        <div className={styles.imagePlaceholder} style={{ display: showPlaceholder ? 'flex' : 'none' }}>
          <span>No Image</span>
        </div>
        
        {/* Impact Level Badge - Only show for featured highlights */}
        {impactLevelLabel && (
          <div className={styles.impactBadge}>
            <span className={styles.impactLabel}>{impactLevelLabel}</span>
          </div>
        )}
        
        {/* Star Button - Only show for approved highlights */}
        {isApproved && (
          <StarButton 
            highlightId={highlight.id}
            highlightTitle={highlight.title}
            organizationId={highlight.organization_id}
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
          <h3 className={styles.cardTitle}>
            {searchQuery ? highlightText(highlight.title, searchQuery) : highlight.title}
          </h3>
        </div>
        
        {/* Associated Program - Display directly under title */}
        {(highlight.program_title || highlight.program_id) && (
          <p className={styles.cardProgram}>
            <span className={styles.programLabel}>Associated Program:</span>{' '}
            {searchQuery && highlight.program_title 
              ? highlightText(highlight.program_title, searchQuery)
              : (highlight.program_title || `Program ID: ${highlight.program_id}`)
            }
          </p>
        )}

        {/* Year - Display if available */}
        {highlight.year && (
          <p className={styles.cardProgram} style={{ marginTop: '4px' }}>
            <span className={styles.programLabel}>Year:</span>{' '}
            {highlight.year}
          </p>
        )}
        
        <p className={styles.cardOrganization}>
          {searchQuery 
            ? highlightText(highlight.organization_name || 'Unknown Organization', searchQuery)
            : (highlight.organization_name || 'Unknown Organization')
          }
        </p>
        
        <p className={styles.cardDescription}>
          {searchQuery 
            ? highlightText(truncateText(highlight.description), searchQuery)
            : truncateText(highlight.description)
          }
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

