'use client'

import React, { useState } from 'react'
import { useGetAllProgramsByOrganizationQuery, useGetProgramsStatisticsQuery } from '@/rtk/superadmin/programsApi'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/featuredProjectsApi'
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`${styles.programStatusBadge} ${styles[program.status?.toLowerCase()]}`}>
              {program.status}
            </span>
            <button 
              className={styles.viewDetailsButton}
              onClick={() => {
                setSelectedProgram(program)
                setIsModalOpen(true)
              }}
            >
              View Details
            </button>
          </div>
          <span className={styles.programDate}>
            {(() => {
              // Show the posted date (created_at) - when the program was created
              if (program.createdAt) {
                try {
                  const createdDate = new Date(program.createdAt);
                  if (isNaN(createdDate.getTime())) {
                    console.error('Invalid createdAt date for program:', program.id, program.createdAt);
                    return 'Invalid Date';
                  }
                  return createdDate.toLocaleDateString();
                } catch (error) {
                  console.error('Error parsing createdAt for program:', program.id, error);
                  return 'Date Error';
                }
              }
              return 'N/A';
            })()}
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

      {/* Featured Projects Section */}
      <FeaturedProjects />

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
                  {org.organizationLogo && (
                    <img 
                      src={getOrganizationImageUrl(org.organizationLogo, 'logo')}
                      alt={`${org.organizationName} logo`}
                      className={styles.organizationLogo}
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  )}
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