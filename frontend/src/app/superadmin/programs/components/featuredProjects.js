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
    return (
      <div className={styles.featuredSection}>
        <h2 className={styles.sectionTitle}>Featured Projects</h2>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to load featured projects</p>
          <p style={{fontSize: '12px', color: '#666'}}>
            Error: {error?.data?.message || error?.error || 'Unknown error'}
          </p>
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