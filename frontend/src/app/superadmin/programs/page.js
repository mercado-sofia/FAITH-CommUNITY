'use client'

import React, { useState } from 'react'
import { useGetAllProgramsByOrganizationQuery, useGetProgramsStatisticsQuery } from '@/rtk/superadmin/programsApi'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/featuredProjectsApi'
import StarButton from './components/StarButton'
import styles from './programs.module.css'

const SuperadminProgramsPage = () => {
  const [selectedOrganization, setSelectedOrganization] = useState('all')
  const [selectedStatus, setSelectedStatus] = useState('all')

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
    // Check if image is base64 data or file path
    const isBase64Image = program.image && program.image.startsWith('data:image');
    const imageSource = isBase64Image 
      ? program.image 
      : program.image 
        ? `http://localhost:8080/uploads/programs/${program.image}`
        : null;

    return (
      <div key={program.id} className={styles.programCard}>
        <div className={styles.programImageContainer}>
          {imageSource ? (
            <img 
              src={imageSource}
              alt={program.title}
              className={styles.programImage}
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
      
      <div className={styles.programContent}>
        <h4 className={styles.programTitle}>{program.title}</h4>
        <p className={styles.programCategory}>{program.category}</p>
        <p className={styles.programDescription}>
          {program.description?.length > 100 
            ? `${program.description.substring(0, 100)}...` 
            : program.description}
        </p>
        
        <div className={styles.programFooter}>
          <span className={`${styles.programStatusBadge} ${styles[program.status?.toLowerCase()]}`}>
            {program.status}
          </span>
          <span className={styles.programDate}>
            {program.dateCreated ? new Date(program.dateCreated).toLocaleDateString() : 'N/A'}
          </span>
        </div>
      </div>
    </div>
    )
  }

  const renderProgramSection = (programs, title, statusKey) => {
    const filteredPrograms = selectedStatus === 'all' || selectedStatus === statusKey 
      ? programs 
      : []

    if (filteredPrograms.length === 0 && selectedStatus !== 'all' && selectedStatus !== statusKey) {
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
          <button 
            className={styles.featuredProjectsButton}
            onClick={() => window.location.href = '/superadmin/programs/featured'}
          >
            <div className={styles.buttonIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.starIcon}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </div>
            <div className={styles.buttonContent}>
              <span className={styles.buttonTitle}>Featured Projects</span>
              <span className={styles.buttonSubtitle}>Manage highlights</span>
            </div>
            <div className={styles.buttonArrow}>
              <svg viewBox="0 0 24 24" fill="currentColor" className={styles.arrowIcon}>
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
              </svg>
            </div>
          </button>
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
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Programs by Organization */}
      <div className={styles.programsSection}>
        <h2 className={styles.sectionTitle}>Programs by Organization</h2>
        
        {filteredOrganizations.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No organizations found with the selected filters.</p>
          </div>
        ) : (
          filteredOrganizations.map((org) => (
            <div key={org.organizationId} className={styles.organizationSection}>
              <div className={styles.organizationHeader}>
                <div className={styles.organizationInfo}>
                  {org.organizationLogo && (() => {
                    const isBase64Logo = org.organizationLogo.startsWith('data:image');
                    const logoSource = isBase64Logo 
                      ? org.organizationLogo 
                      : `http://localhost:8080/uploads/logos/${org.organizationLogo}`;
                    
                    return (
                      <img 
                        src={logoSource}
                        alt={`${org.organizationName} logo`}
                        className={styles.organizationLogo}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    );
                  })()}
                  <div className={styles.organizationDetails}>
                    <h3 className={styles.organizationName}>
                      <span className={styles.organizationAcronym}>{org.organizationAcronym}</span>
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
          ))
        )}
      </div>
    </div>
  )
}

export default SuperadminProgramsPage