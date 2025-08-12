'use client'

import React from 'react'
import { useGetAllFeaturedProjectsQuery } from '@/rtk/superadmin/featuredProjectsApi'
import styles from './featured.module.css'

const FeaturedProjectsPage = () => {
  const { 
    data: featuredProjects = [], 
    isLoading, 
    error,
    refetch 
  } = useGetAllFeaturedProjectsQuery()

  const renderFeaturedProjectCard = (project) => {
    // Check if image is base64 data or file path
    const isBase64Image = project.image && project.image.startsWith('data:image');
    const imageSource = isBase64Image 
      ? project.image 
      : project.image 
        ? `http://localhost:8080/uploads/programs/${project.image}`
        : null;

    return (
      <div key={project.id} className={styles.projectCard}>
        <div className={styles.projectImageContainer}>
          {imageSource ? (
            <img 
              src={imageSource}
              alt={project.title}
              className={styles.projectImage}
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
          ) : null}
          <div className={styles.projectImagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
            <span>No Image</span>
          </div>
          <div className={styles.featuredBadge}>
            ⭐ Featured
          </div>
        </div>
      
        <div className={styles.projectContent}>
          <h4 className={styles.projectTitle}>{project.title}</h4>
          <div className={styles.organizationInfo}>
            <span className={styles.orgAcronym}>{project.orgAcronym}</span>
            <span className={styles.orgName}>{project.orgName}</span>
          </div>
          <p className={styles.projectDescription}>
            {project.description?.length > 150 
              ? `${project.description.substring(0, 150)}...` 
              : project.description}
          </p>
          
          <div className={styles.projectFooter}>
            <span className={`${styles.projectStatusBadge} ${styles[project.status?.toLowerCase()]}`}>
              {project.status}
            </span>
            <span className={styles.projectDate}>
              {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Featured Projects</h1>
        </div>
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Loading featured projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.pageTitle}>Featured Projects</h1>
        </div>
        <div className={styles.errorContainer}>
          <p className={styles.errorMessage}>Failed to load featured projects</p>
          <button onClick={refetch} className={styles.retryButton}>
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
          <h1 className={styles.pageTitle}>Featured Projects</h1>
          <button 
            className={styles.backButton}
            onClick={() => window.location.href = '/superadmin/programs'}
          >
            ← Back to Programs
          </button>
        </div>
        <p className={styles.subtitle}>
          Manage projects that will be showcased on the public portal
        </p>
      </div>

      {featuredProjects.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>⭐</div>
          <h3>No Featured Projects Yet</h3>
          <p>Start featuring projects by clicking the star button on any program in the Programs Management page.</p>
          <button 
            className={styles.goToProgramsButton}
            onClick={() => window.location.href = '/superadmin/programs'}
          >
            Go to Programs
          </button>
        </div>
      ) : (
        <div className={styles.projectsSection}>
          <div className={styles.projectsHeader}>
            <h2 className={styles.sectionTitle}>
              Featured Projects ({featuredProjects.length})
            </h2>
          </div>
          
          <div className={styles.projectsGrid}>
            {featuredProjects.map(renderFeaturedProjectCard)}
          </div>
        </div>
      )}
    </div>
  )
}

export default FeaturedProjectsPage
