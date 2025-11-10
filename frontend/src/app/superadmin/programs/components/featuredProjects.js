'use client'

import React, { useState } from 'react'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/programsApi'
import ProgramDetailsModal from './ProgramDetailsModal'
import ProgramCard from './ProgramCard'
import styles from '../programs.module.css'

const FeaturedProjects = ({ searchQuery = '' }) => {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { 
    data: featuredProjects = [], 
    isLoading, 
    error,
    refetch 
  } = useGetAllFeaturedProjectsQuery()

  // Hierarchical search function with priority scoring
  // Priority order: Organization Name > Program Title > Description > Category/Location > Other fields > Collaborators
  const searchFeaturedProjects = (projects, query) => {
    if (!query || !query.trim()) return projects
    
    const searchTerm = query.toLowerCase().trim()
    
    // Score projects based on match priority (higher score = higher priority)
    const scoredProjects = projects.map(project => {
      let score = 0
      let matches = false
      
      // Priority 1: Organization Name/Acronym match (1000 points - highest)
      const orgNameMatch = project.orgName?.toLowerCase().includes(searchTerm) || false
      const orgAcronymMatch = project.orgAcronym?.toLowerCase().includes(searchTerm) || false
      if (orgNameMatch || orgAcronymMatch) {
        score += 1000
        matches = true
      }
      
      // Priority 2: Program Title match (100 points)
      const titleMatch = project.title?.toLowerCase().includes(searchTerm) || false
      if (titleMatch) {
        score += 100
        matches = true
      }
      
      // Priority 3: Program Description match (50 points)
      const descriptionMatch = project.description?.toLowerCase().includes(searchTerm) || false
      if (descriptionMatch) {
        score += 50
        matches = true
      }
      
      // Priority 4: Category match (30 points)
      const categoryMatch = project.category?.toLowerCase().includes(searchTerm) || false
      if (categoryMatch) {
        score += 30
        matches = true
      }
      
      // Priority 5: Location match (30 points)
      const locationMatch = project.location?.toLowerCase().includes(searchTerm) || false
      if (locationMatch) {
        score += 30
        matches = true
      }
      
      // Priority 6: Status match (20 points)
      const statusMatch = project.status?.toLowerCase().includes(searchTerm) || false
      if (statusMatch) {
        score += 20
        matches = true
      }
      
      // Priority 7: Slug match (20 points)
      const slugMatch = project.slug?.toLowerCase().includes(searchTerm) || false
      if (slugMatch) {
        score += 20
        matches = true
      }
      
      // Priority 8: Submitted by fields (10 points)
      const submittedByNameMatch = project.submitted_by_name?.toLowerCase().includes(searchTerm) || false
      const submittedByRoleMatch = project.submitted_by_role?.toLowerCase().includes(searchTerm) || false
      if (submittedByNameMatch || submittedByRoleMatch) {
        score += 10
        matches = true
      }
      
      // Priority 9: Collaborator information (lowest priority - 5 points)
      const collaboratorMatch = project.collaborators?.some(collab => 
        collab.organization_name?.toLowerCase().includes(searchTerm) ||
        collab.organization_acronym?.toLowerCase().includes(searchTerm)
      ) || false
      if (collaboratorMatch) {
        score += 5
        matches = true
      }
      
      // If no matches found, return null to filter out
      if (!matches) return null
      
      return { project, score }
    }).filter(item => item !== null)
    
    // Sort by score (descending) and return only projects
    return scoredProjects
      .sort((a, b) => b.score - a.score)
      .map(item => item.project)
  }

  // Filter featured projects based on search query
  const filteredFeaturedProjects = searchFeaturedProjects(featuredProjects, searchQuery)

  // Helper function to extract detailed error information
  const getErrorDetails = (error) => {
    if (!error) return null

    const errorDetails = {
      status: error.status || 'UNKNOWN',
      statusText: error.statusText || '',
      message: '',
      errorType: '',
      failedPart: '',
      suggestion: ''
    }

    // Extract error message from various possible locations
    if (error.data) {
      if (typeof error.data === 'string') {
        errorDetails.message = error.data
      } else if (error.data.message) {
        errorDetails.message = error.data.message
      } else if (error.data.error) {
        errorDetails.message = error.data.error
      } else if (error.data.details) {
        errorDetails.message = error.data.details
      }
    } else if (error.error) {
      errorDetails.message = typeof error.error === 'string' ? error.error : error.error.message || 'Unknown error'
    } else if (error.message) {
      errorDetails.message = error.message
    }

    // Determine error type and failed part
    if (error.status === 'FETCH_ERROR' || error.status === 'PARSING_ERROR') {
      errorDetails.errorType = 'Network Error'
      errorDetails.failedPart = 'Unable to connect to the server'
      errorDetails.suggestion = 'Please check your internet connection and ensure the API server is running. If the problem persists, contact support.'
    } else if (error.status === 401) {
      errorDetails.errorType = 'Authentication Error'
      errorDetails.failedPart = 'Your session has expired'
      errorDetails.suggestion = 'Please log out and log in again to refresh your session.'
    } else if (error.status === 403) {
      errorDetails.errorType = 'Authorization Error'
      errorDetails.failedPart = 'Access denied'
      errorDetails.suggestion = 'You do not have permission to access this resource. Please contact your administrator.'
    } else if (error.status === 404) {
      errorDetails.errorType = 'Not Found Error'
      errorDetails.failedPart = 'The requested resource was not found'
      errorDetails.suggestion = 'The API endpoint may have changed or the resource has been removed. Please contact support.'
    } else if (error.status >= 500) {
      errorDetails.errorType = 'Server Error'
      errorDetails.failedPart = 'Server encountered an error'
      errorDetails.suggestion = 'The server is experiencing issues. Please try again in a few moments. If the problem persists, contact support.'
    } else if (error.status >= 400) {
      errorDetails.errorType = 'Client Error'
      errorDetails.failedPart = 'Invalid request'
      errorDetails.suggestion = 'There was an issue with your request. Please try again or contact support if the problem persists.'
    } else {
      errorDetails.errorType = 'Unknown Error'
      errorDetails.failedPart = 'An unexpected error occurred'
      errorDetails.suggestion = 'Please try again. If the problem persists, contact support.'
    }

    // If no message was extracted, use a default
    if (!errorDetails.message) {
      errorDetails.message = errorDetails.failedPart || 'An unexpected error occurred'
    }

    return errorDetails
  }

  if (isLoading) {
    return (
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading featured projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    const errorDetails = getErrorDetails(error)

    return (
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to Load Featured Projects</p>
          
          {/* Featured Projects API Error Details */}
          {errorDetails && (
            <div style={{ 
              background: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '8px', 
              padding: '1rem', 
              marginBottom: '1rem',
              textAlign: 'left'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#dc2626',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  ❌ Featured Projects API Error
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Failed API Endpoint:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem', fontFamily: 'monospace' }}>
                  GET /api/superadmin/featured-projects
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Error Type:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {errorDetails.errorType}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Status Code:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {errorDetails.status} {errorDetails.statusText ? `(${errorDetails.statusText})` : ''}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Failed Part:</strong>
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: '0.5rem' }}>
                  {errorDetails.failedPart}
                </span>
              </div>
              <div style={{ marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>Error Message:</strong>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6b7280', 
                  marginTop: '0.25rem',
                  padding: '0.5rem',
                  background: '#fff',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb',
                  fontFamily: 'monospace',
                  wordBreak: 'break-word'
                }}>
                  {errorDetails.message}
                </div>
              </div>
              <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fecaca' }}>
                <strong style={{ fontSize: '13px', color: '#374151' }}>What to do:</strong>
                <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '0.25rem', margin: 0 }}>
                  {errorDetails.suggestion}
                </p>
              </div>
            </div>
          )}

          <button onClick={refetch} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  if (featuredProjects.length === 0) {
    return (
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.emptyState}>
          <p>No featured projects available at the moment.</p>
        </div>
      </div>
    )
  }

  // Show search results message if searching
  if (searchQuery && filteredFeaturedProjects.length === 0) {
    return (
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.emptyState}>
          <p>No featured projects found matching &quot;{searchQuery}&quot;.</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.featuredSection}>
      <h2 className={styles.sectionTitle}>Featured Projects</h2>
      <div className={styles.featuredGrid}>
        {filteredFeaturedProjects.map((project) => {
          // Transform featured project data to match program structure
          const programData = {
            id: project.id,
            title: project.title,
            description: project.description,
            status: project.status,
            image: project.image,
            organization_name: project.orgName,
            organization_acronym: project.orgAcronym,
            organization_color: project.orgColor,
            event_start_date: project.event_start_date,
            event_end_date: project.event_end_date,
            created_at: project.created_at,
            is_collaborative: project.is_collaborative || false,
            collaborators: project.collaborators || []
          }

          return (
            <ProgramCard
              key={project.id}
              program={programData}
              onViewDetails={(program) => {
                setSelectedProgram(program)
                setIsModalOpen(true)
              }}
              showOrganizationBadge={true}
              organizationData={{
                name: project.orgName,
                acronym: project.orgAcronym,
                color: project.orgColor || '#444444'
              }}
            />
          )
        })}
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

export default FeaturedProjects