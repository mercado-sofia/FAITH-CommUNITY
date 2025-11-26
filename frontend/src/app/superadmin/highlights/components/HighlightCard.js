'use client'

import { useState, useEffect, useMemo, memo } from 'react'
import Image from 'next/image'
import DOMPurify from 'dompurify'
import { getOrganizationImageUrl } from '@/utils/shared/uploadPaths'
import StarButton from './StarButton'
import styles from './styles/HighlightCard.module.css'

const HighlightCard = ({ highlight, onViewDetails, searchQuery = '' }) => {
  const [imageError, setImageError] = useState(false)
  const [videoError, setVideoError] = useState(false)

  // Reset error states when highlight changes
  useEffect(() => {
    setImageError(false)
    setVideoError(false)
  }, [highlight.id])

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

  // Memoize image and video URLs to prevent unnecessary recalculations
  const imageUrl = useMemo(() => {
    if (!highlight.media || highlight.media.length === 0) return null
    
    // Get the first image from media array
    const firstImage = highlight.media.find(item => 
      item.type === 'image' || 
      item.mimetype?.startsWith('image/') ||
      /\.(jpg|jpeg|png|gif|webp)$/i.test(item.filename || item.url)
    )
    
    return firstImage?.url || firstImage?.filename || null
  }, [highlight.media])

  const videoUrl = useMemo(() => {
    if (!highlight.media || highlight.media.length === 0) return null
    
    // Get the first video from media array
    const firstVideo = highlight.media.find(item => 
      item.type === 'video' || 
      item.mimetype?.startsWith('video/') ||
      /\.(mp4|avi|mov|wmv|flv|webm|mkv)$/i.test(item.filename || item.url)
    )
    
    return firstVideo?.url || firstVideo?.filename || null
  }, [highlight.media])

  // Get impact level label
  const impactLevelLabel = useMemo(() => {
    if (!highlight.impact_level) return null
    switch (highlight.impact_level.toLowerCase()) {
      case 'low':
        return 'Small Impact'
      case 'average':
        return 'Average Impact'
      case 'high':
        return 'High Impact'
      default:
        return null
    }
  }, [highlight.impact_level])

  const isApproved = useMemo(() => highlight.status?.toLowerCase() === 'approved', [highlight.status])
  
  // Determine what to show: image first, then video, then placeholder
  const hasImage = imageUrl && !imageError
  const hasVideo = videoUrl && !hasImage && !videoError
  const showPlaceholder = !hasImage && !hasVideo

  return (
    <div className={styles.featuredCard}>
      <div className={styles.cardImageContainer}>
        {hasImage ? (
          <Image 
            key={`image-${highlight.id}-${imageUrl}`}
            src={imageUrl}
            alt={highlight.title}
            className={styles.cardImage}
            width={300}
            height={200}
            onError={() => setImageError(true)}
            priority={false}
          />
        ) : hasVideo ? (
          <video
            key={`video-${highlight.id}-${videoUrl}`}
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
              // If video fails to load, set video error
              setVideoError(true)
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
            {impactLevelLabel}
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
        
        <div className={styles.cardMeta}>
        <div className={styles.cardOrganization}>
          {highlight.organization_logo ? (() => {
            const logoUrl = getOrganizationImageUrl(highlight.organization_logo, 'logo');
            if (logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE') {
              return (
                <Image
                  src={logoUrl}
                  alt={`${highlight.organization_acronym || highlight.organization_name || 'Organization'} logo`}
                  width={16}
                  height={16}
                  className={styles.orgLogo}
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              );
            }
            return null;
          })() : null}
          <p className={styles.orgName}>
            {searchQuery 
              ? highlightText(highlight.organization_name || 'Unknown Organization', searchQuery)
              : (highlight.organization_name || 'Unknown Organization')
            }
          </p>
        </div>
          
          {(highlight.program_title || highlight.program_id) && (
            <p className={styles.cardProgram}>
              <span className={styles.programLabel}>Program:</span>{' '}
              {searchQuery && highlight.program_title 
                ? highlightText(highlight.program_title, searchQuery)
                : (highlight.program_title || `ID: ${highlight.program_id}`)
              }
            </p>
          )}
        </div>
        
        <p className={styles.cardDescription}>
          {searchQuery 
            ? highlightText(truncateText(highlight.description, 100), searchQuery)
            : truncateText(highlight.description, 100)
          }
        </p>
        
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

export default memo(HighlightCard)

