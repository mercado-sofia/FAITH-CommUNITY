'use client'

import React from 'react'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/featuredProjectsApi'
import styles from '../programs.module.css'

const FeaturedProjects = () => {
  const { 
    data: featuredProjects = [], 
    isLoading, 
    error,
    refetch 
  } = useGetAllFeaturedProjectsQuery()

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

  return (
    <div className={styles.featuredSection}>
      <h2 className={styles.sectionTitle}>Featured Projects</h2>
      <div className={styles.featuredGrid}>
        {featuredProjects.map((project) => (
          <div key={project.id} className={styles.featuredCard}>
            <div className={styles.cardImageContainer}>
              {project.image ? (
                <img 
                  src={`http://localhost:8080/uploads/featured/${project.image}`}
                  alt={project.title}
                  className={styles.cardImage}
                  onError={(e) => {
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
                  {project.dateCreated ? new Date(project.dateCreated).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default FeaturedProjects