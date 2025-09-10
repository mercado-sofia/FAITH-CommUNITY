'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useGetAllProgramsByOrganizationQuery, useGetProgramsStatisticsQuery, useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/programsApi'
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths'
import StarButton from './components/StarButton'
import ProgramDetailsModal from './components/ProgramDetailsModal'
import FeaturedProjects from './components/featuredProjects'
import styles from './programs.module.css'

const SuperadminProgramsPage = () => {
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { 
    data: organizationPrograms = [], 
    isLoading: programsLoading, 
    error: programsError,
    refetch: refetchPrograms 
  } = useGetAllProgramsByOrganizationQuery()

  const { 
    data: statistics = {}, 
    isLoading: statsLoading 
  } = useGetProgramsStatisticsQuery()

  // Filter organizations based on selected filters
  const filteredOrganizations = organizationPrograms.filter(org => {
    if (selectedOrganization !== 'all' && org.organizationId !== parseInt(selectedOrganization)) {
      return false
    }
    return true
  })

  // Get all unique organizations for filter dropdown
  const organizationOptions = organizationPrograms.map(org => ({
    id: org.organizationId,
    name: org.organizationName,
    acronym: org.organizationAcronym
  }))

  const renderProgramCard = (program) => {
    // Use the new upload path utility
    const imageSource = getProgramImageUrl(program.image);

    const formatDate = (dateString) => {
      if (!dateString) return 'Not specified';
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return 'Invalid date';
      }
    };

    const formatProgramDates = (program) => {
      // Handle multiple dates array (from admin creation flow)
      if (program.multiple_dates && Array.isArray(program.multiple_dates) && program.multiple_dates.length > 0) {
        if (program.multiple_dates.length === 1) {
          return formatDate(program.multiple_dates[0]);
        } else if (program.multiple_dates.length === 2) {
          return `${formatDate(program.multiple_dates[0])} & ${formatDate(program.multiple_dates[1])}`;
        } else {
          return `${formatDate(program.multiple_dates[0])} +${program.multiple_dates.length - 1} more dates`;
        }
      } 
      // Handle single date range
      else if (program.event_start_date && program.event_end_date) {
        const startDate = new Date(program.event_start_date);
        const endDate = new Date(program.event_end_date);
        
        if (startDate.getTime() === endDate.getTime()) {
          return formatDate(program.event_start_date);
        } else {
          return `${formatDate(program.event_start_date)} - ${formatDate(program.event_end_date)}`;
        }
      }
      // Handle single event date
      else if (program.event_date) {
        return formatDate(program.event_date);
      }
      return 'Not specified';
    };

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
      };
      return categoryMap[category] || category || 'Uncategorized';
    };

    const getStatusColor = (status) => {
      switch (status?.toLowerCase()) {
        case 'upcoming': return '#1e40af';
        case 'active': return '#065f46';
        case 'completed': return '#374151';
        default: return '#6b7280';
      }
    };

    return (
      <div key={program.id} className={styles.programCard}>
        {/* Enhanced Image Section */}
        <div className={styles.programImageContainer}>
          {imageSource ? (
            <Image 
              src={imageSource}
              alt={program.title}
              className={styles.programImage}
              width={300}
              height={200}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className={styles.programImagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
            <span>No Image</span>
          </div>
          <StarButton programId={program.id} programTitle={program.title} />
        </div>
      
        {/* Enhanced Content Section */}
        <div className={styles.programContent}>
          <div className={styles.programHeader}>
            <h4 className={styles.programTitle}>{program.title}</h4>
            {program.posted_date && (
              <span className={styles.postedDate}>
                Posted: {formatDate(program.posted_date)}
              </span>
            )}
          </div>

          {/* Program Details Grid - Enhanced */}
          <div className={styles.programDetailsGrid}>
            <div className={styles.programDetailItem}>
              <span className={styles.programDetailLabel}>Category</span>
              <span className={styles.programDetailValue}>
                {getCategoryLabel(program.category)}
              </span>
            </div>

            <div className={styles.programDetailItem}>
              <span className={styles.programDetailLabel}>Event Date(s)</span>
              <span className={styles.programDetailValue}>
                {formatProgramDates(program)}
              </span>
            </div>

            {/* Show multiple dates if available */}
            {program.multiple_dates && program.multiple_dates.length > 1 && (
              <div className={styles.programDetailItem}>
                <span className={styles.programDetailLabel}>All Event Dates</span>
                <div className={styles.multipleDatesContainer}>
                  {program.multiple_dates.slice(0, 3).map((date, index) => (
                    <span key={index} className={styles.dateChip}>
                      {formatDate(date)}
                    </span>
                  ))}
                  {program.multiple_dates.length > 3 && (
                    <span className={styles.dateChip}>
                      +{program.multiple_dates.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {program.created_at && (
              <div className={styles.programDetailItem}>
                <span className={styles.programDetailLabel}>Created</span>
                <span className={styles.programDetailValue}>
                  {formatDate(program.created_at)}
                </span>
              </div>
            )}

            {/* Organization Info */}
            {program.organization_name && (
              <div className={styles.programDetailItem}>
                <span className={styles.programDetailLabel}>Organization</span>
                <span className={styles.programDetailValue}>
                  {program.organization_name}
                </span>
              </div>
            )}
          </div>

          {/* Enhanced Description */}
          <div className={styles.programDescriptionSection}>
            <h5 className={styles.descriptionTitle}>Description</h5>
            <p className={styles.programDescription}>
              {program.description?.length > 150 
                ? `${program.description.substring(0, 150)}...` 
                : program.description || 'No description provided'}
            </p>
          </div>

          {/* Additional Images Preview - Enhanced */}
          {program.additional_images && program.additional_images.length > 0 && (
            <div className={styles.additionalImagesPreview}>
              <h5 className={styles.additionalImagesTitle}>Additional Images</h5>
              <div className={styles.additionalImagesThumbnails}>
                {program.additional_images.slice(0, 4).map((imagePath, index) => (
                  <div key={index} className={styles.additionalImageThumbnail}>
                    <Image 
                      src={getProgramImageUrl(imagePath, 'additional')}
                      alt={`Additional ${index + 1}`}
                      width={80}
                      height={80}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                ))}
                {program.additional_images.length > 4 && (
                  <div className={styles.additionalImageMore}>
                    +{program.additional_images.length - 4}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Program Stats */}
          <div className={styles.programStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Status</span>
              <span className={styles.statValue} style={{ color: getStatusColor(program.status) }}>
                {program.status}
              </span>
            </div>
            {program.participants_count && (
              <div className={styles.statItem}>
                <span className={styles.statLabel}>Participants</span>
                <span className={styles.statValue}>{program.participants_count}</span>
              </div>
            )}
          </div>
        
          {/* Enhanced Footer */}
          <div className={styles.programFooter}>
            <button 
              className={styles.viewDetailsButton}
              onClick={() => {
                setSelectedProgram(program)
                setIsModalOpen(true)
              }}
            >
              View Full Details
            </button>
          </div>
        </div>
      </div>
    )
  }

  const renderProgramSection = (programs, title, statusKey) => {
    const filteredPrograms = selectedStatus === 'all' || selectedStatus.toLowerCase() === statusKey.toLowerCase() 
      ? programs 
      : []

    if (filteredPrograms.length === 0 && selectedStatus !== 'all' && selectedStatus.toLowerCase() !== statusKey.toLowerCase()) {
      return null
    }

    return (
      <div className={styles.programSection}>
        <h4 className={styles.programSectionTitle}>
          {title} ({filteredPrograms.length})
        </h4>
        {filteredPrograms.length > 0 ? (
          <div className={styles.programGrid}>
            {filteredPrograms.map(renderProgramCard)}
          </div>
        ) : (
          <div className={styles.emptyProgramSection}>
            <p>No {title.toLowerCase()} programs</p>
          </div>
        )}
      </div>
    )
  }

  if (programsLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Programs Management</h1>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading programs...</p>
        </div>
      </div>
    )
  }

  if (programsError) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Programs Management</h1>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to load programs</p>
          <button onClick={refetchPrograms} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <h1 className={styles.pageTitle}>Programs Management</h1>
        </div>
        <div className={styles.statsContainer}>
          {!statsLoading && (
            <>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{statistics.totalPrograms}</span>
                <span className={styles.statLabel}>Total Programs</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{statistics.upcomingPrograms}</span>
                <span className={styles.statLabel}>Upcoming</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{statistics.activePrograms}</span>
                <span className={styles.statLabel}>Active</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{statistics.completedPrograms}</span>
                <span className={styles.statLabel}>Completed</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statNumber}>{statistics.totalOrganizations}</span>
                <span className={styles.statLabel}>Organizations</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Featured Projects Section */}
      <FeaturedProjects />

      {/* Programs by Organization */}
      <div className={styles.programsSection}>
        <h2 className={styles.sectionTitle}>Programs by Organization</h2>
        
        {/* Filters */}
        <div className={styles.filtersContainer}>
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Organization:</label>
            <select 
              value={selectedOrganization} 
              onChange={(e) => setSelectedOrganization(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Organizations</option>
              {organizationOptions.map(org => (
                <option key={org.id} value={org.id}>
                  {org.acronym} - {org.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Status:</label>
            <select 
              value={selectedStatus} 
              onChange={(e) => setSelectedStatus(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Status</option>
              <option value="Upcoming">Upcoming</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>

        {filteredOrganizations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No organizations found with the selected filters.</p>
          </div>
        ) : (
          filteredOrganizations.map(org => {
            console.log('Organization data:', {
              id: org.organizationId,
              name: org.organizationName,
              acronym: org.organizationAcronym,
              color: org.organizationColor,
              hasColor: !!org.organizationColor,
              fullOrgData: org
            });
            
            return (
              <div key={org.organizationId} className={styles.organizationSection}>
                <div className={styles.organizationHeader}>
                  <div className={styles.organizationInfo}>
                    {org.organizationLogo && (
                      <Image 
                        src={getOrganizationImageUrl(org.organizationLogo, 'logo')}
                        alt={`${org.organizationName} logo`}
                        className={styles.organizationLogo}
                        width={60}
                        height={60}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    )}
                    <div className={styles.organizationDetails}>
                      <h3 className={styles.organizationName}>
                        <span 
                          className={styles.organizationAcronym}
                          style={{ 
                            backgroundColor: org.organizationColor || '#667eea'
                          }}
                        >
                          {org.organizationAcronym}
                        </span>
                        {org.organizationName}
                      </h3>
                      <div className={styles.organizationStats}>
                        <span>Total: {org.programs.upcoming.length + org.programs.active.length + org.programs.completed.length}</span>
                        <span>Upcoming: {org.programs.upcoming.length}</span>
                        <span>Active: {org.programs.active.length}</span>
                        <span>Completed: {org.programs.completed.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={styles.organizationPrograms}>
                  {renderProgramSection(org.programs.upcoming, 'Upcoming Programs', 'upcoming')}
                  {renderProgramSection(org.programs.active, 'Active Programs', 'active')}
                  {renderProgramSection(org.programs.completed, 'Completed Programs', 'completed')}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Program Details Modal */}
      <ProgramDetailsModal 
        program={selectedProgram}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProgram(null)
        }}
      />
    </div>
  )
}

export default SuperadminProgramsPage