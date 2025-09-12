'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/programsApi'
import { getFeaturedProjectImageUrl } from '@/utils/uploadPaths'
import StarButton from './StarButton'
import ProgramDetailsModal from './ProgramDetailsModal'
import styles from '../programs.module.css'

const FeaturedProjects = () => {
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const { 
    data: featuredProjects = [], 
    isLoading, 
    error,
    refetch 
  } = useGetAllFeaturedProjectsQuery()

  // Debug: Log what the component receives
  console.log('FeaturedProjects component - Received data:', {
    featuredProjectsLength: featuredProjects.length,
    isLoading,
    error,
    firstProject: featuredProjects[0] || null,
    allStatuses: featuredProjects.map(p => ({ id: p.id, title: p.title, status: p.status }))
  });

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
    console.error('Featured projects error:', error);
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

  // Determine the appropriate grid class based on number of projects
  const getGridClass = () => {
    const count = featuredProjects.length;
    if (count === 1) return styles.singleCard;
    if (count === 2) return styles.twoCards;
    if (count === 3) return styles.threeCards;
    return ''; // Default grid for 4+ projects
  };

  return (
    <div className={styles.featuredSection}>
      <h2 className={styles.sectionTitle}>Featured Projects</h2>
      <div className={`${styles.featuredGrid} ${getGridClass()}`}>
        {featuredProjects.map((project) => {
          // Debug logging for image data
          console.log('SuperAdmin FeaturedProjects - Processing project:', {
            id: project.id,
            title: project.title,
            hasImage: !!project.image,
            imageType: project.image ? (project.image.startsWith('data:image') ? 'base64' : 'file') : 'none',
            imageLength: project.image ? project.image.length : 0,
            imagePreview: project.image ? project.image.substring(0, 100) + '...' : null,
            isValidBase64: project.image ? project.image.includes('base64,') : false
          });
          
          return (
          <div key={project.id} className={styles.featuredCard}>
            <div className={styles.cardImageContainer}>
              {project.image ? (
                <Image 
                  src={getFeaturedProjectImageUrl(project.image)}
                  alt={project.title}
                  className={styles.cardImage}
                  width={300}
                  height={200}
                  onLoad={() => {
                    console.log(`Image loaded successfully for: ${project.title}`);
                  }}
                  onError={(e) => {
                    console.log(`Image failed to load for: ${project.title}`, {
                      src: e.target.src.substring(0, 100) + '...',
                      error: e
                    });
                    e.target.style.display = 'none'
                    e.target.nextSibling.style.display = 'flex'
                  }}
                />
              ) : null}
              <div className={styles.imagePlaceholder} style={{ display: project.image ? 'none' : 'flex' }}>
                <span>No Image</span>
              </div>
              <div 
                className={styles.orgBadge}
                style={{ backgroundColor: project.orgColor || '#444444' }}
              >
                <span className={styles.orgAcronym}>{project.orgAcronym}</span>
              </div>
              <StarButton programId={project.id} programTitle={project.title} />
            </div>
            
            <div className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{project.title}</h3>
              <p className={styles.cardOrganization}>{project.orgName}</p>
              <p className={styles.cardDescription}>
                {project.description?.length > 120 
                  ? `${project.description.substring(0, 120)}...` 
                  : project.description}
              </p>
              
              <div className={styles.cardFooter}>
                <span className={`${styles.statusBadge} ${styles[project.status?.toLowerCase()]}`}>
                  {project.status}
                </span>
                <span className={styles.cardDate}>
                  {project.eventStartDate ? new Date(project.eventStartDate).toLocaleDateString() : 
                   project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              
              {/* View Details Button */}
              <div className={styles.featuredCardFooter}>
                <button 
                  className={styles.viewDetailsButton}
                  onClick={() => {
                    setSelectedProgram(project)
                    setIsModalOpen(true)
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          </div>
          );
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