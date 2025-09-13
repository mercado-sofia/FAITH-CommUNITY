'use client'

import React from 'react'
import Image from 'next/image'
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths'
import StarButton from './StarButton'
import styles from './styles/ProgramCard.module.css'

const ProgramCard = ({ 
  program, 
  onViewDetails, 
  showOrganizationBadge = false, 
  organizationData = null 
}) => {
  // Use the new upload path utility
  const imageSource = getProgramImageUrl(program.image)

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified'
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    } catch (error) {
      return 'Invalid date'
    }
  }

  const formatProgramDates = (program) => {
    // Handle multiple dates array (from admin creation flow)
    if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
      if (program.multiple_dates.length === 1) {
        return formatDate(program.multiple_dates[0])
      } else if (program.multiple_dates.length === 2) {
        return `${formatDate(program.multiple_dates[0])} & ${formatDate(program.multiple_dates[1])}`
      } else {
        return `${formatDate(program.multiple_dates[0])} +${program.multiple_dates.length - 1} more dates`
      }
    } 
    // Handle single date range
    else if (program.event_start_date && program.event_end_date) {
      const startDate = new Date(program.event_start_date)
      const endDate = new Date(program.event_end_date)
      
      if (startDate.getTime() === endDate.getTime()) {
        return formatDate(program.event_start_date)
      } else {
        return `${formatDate(program.event_start_date)} - ${formatDate(program.event_end_date)}`
      }
    }
    // Handle single event date
    else if (program.event_date) {
      return formatDate(program.event_date)
    }
    return 'Not specified'
  }

  const getCategoryLabel = (category) => {
    const categoryMap = {
      outreach: 'Outreach',
      education: 'Education',
      health: 'Health',
      environment: 'Environment',
      community: 'Community Development',
      youth: 'Youth Programs',
      women: 'Women Empowerment',
      elderly: 'Elderly Care',
      disaster: 'Disaster Relief',
      other: 'Other'
    }
    return categoryMap[category] || category || 'Uncategorized'
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'upcoming': return '#1e40af'
      case 'active': return '#065f46'
      case 'completed': return '#374151'
      default: return '#6b7280'
    }
  }

  // Get organization data for badge
  const orgData = organizationData || {
    name: program.organization_name || 'Unknown Organization',
    acronym: program.organization_acronym || 'ORG',
    color: program.organization_color || '#444444'
  }

  return (
    <div className={styles.featuredCard}>
      <div className={styles.cardImageContainer}>
        {imageSource ? (
          <Image 
            src={imageSource}
            alt={program.title}
            className={styles.cardImage}
            width={300}
            height={200}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div className={styles.imagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
          <span>No Image</span>
        </div>
        
        {/* Organization Badge - show if requested or if we have org data */}
        {showOrganizationBadge && (
          <div 
            className={styles.orgBadge}
            style={{ backgroundColor: orgData.color }}
          >
            <span className={styles.orgAcronym}>{orgData.acronym}</span>
          </div>
        )}
        
        <StarButton programId={program.id} programTitle={program.title} />
      </div>
      
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{program.title}</h3>
        <p className={styles.cardOrganization}>{orgData.name}</p>
        <p className={styles.cardDescription}>
          {program.description?.length > 120 
            ? `${program.description.substring(0, 120)}...` 
            : program.description || 'No description provided'}
        </p>
        
        <div className={styles.cardFooter}>
          <span className={`${styles.statusBadge} ${styles[program.status?.toLowerCase()]}`}>
            {program.status}
          </span>
          <span className={styles.cardDate}>
            {formatProgramDates(program)}
          </span>
        </div>
        
        {/* View Details Button */}
        <div className={styles.featuredCardFooter}>
          <button 
            className={styles.viewDetailsButton}
            onClick={() => onViewDetails(program)}
          >
            View Details
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProgramCard
