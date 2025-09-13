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

  // Search function to filter featured projects
  const searchFeaturedProjects = (projects, query) => {
    if (!query.trim()) return projects
    
    const searchTerm = query.toLowerCase()
    return projects.filter(project => 
      project.title?.toLowerCase().includes(searchTerm) ||
      project.description?.toLowerCase().includes(searchTerm) ||
      project.orgName?.toLowerCase().includes(searchTerm)
    )
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
            event_date: project.eventStartDate,
            created_at: project.createdAt
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