'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FaTimes, FaTag, FaCalendar, FaEye, FaBuilding, FaHistory, FaInfoCircle, FaUser, FaClock } from 'react-icons/fa'
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/uploadPaths'
import { useGetProgramByIdQuery } from '@/rtk/superadmin/programsApi'
import { formatProgramDates, formatDateShort, formatDateTime } from '@/utils/dateUtils.js'
import styles from './styles/ProgramDetailsModal.module.css'

const ProgramDetailsModal = ({ program, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('details')
  const scrollPositionRef = useRef(0)

  // Reset tab when program changes
  useEffect(() => {
    if (isOpen && program?.id) {
      setActiveTab('details')
    }
  }, [isOpen, program?.id])

  // Fetch complete program details when modal opens
  const { 
    data: fullProgramData
  } = useGetProgramByIdQuery(program?.id, {
    skip: !isOpen || !program?.id,
    refetchOnMountOrArgChange: true
  })

  // Lock body scroll when modal is open
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) {
      return
    }

    if (isOpen) {
      // Save current scroll position in ref
      scrollPositionRef.current = window.scrollY
      
      // Lock body scroll
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPositionRef.current}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
      document.body.style.width = '100%'
    } else {
      // Restore body scroll when modal closes
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        if (typeof document !== 'undefined' && document.body) {
          const savedScrollY = scrollPositionRef.current
          
          // Restore body styles
          document.body.style.position = ''
          document.body.style.top = ''
          document.body.style.left = ''
          document.body.style.right = ''
          document.body.style.overflow = ''
          document.body.style.width = ''
          
          // Restore scroll position after a brief delay to ensure styles are applied
          requestAnimationFrame(() => {
            if (typeof window !== 'undefined') {
              window.scrollTo(0, savedScrollY)
            }
          })
        }
      })
    }
  }, [isOpen])

  if (!isOpen || !program) return null

  // Use fetched data if available, otherwise fallback to passed program data
  // Prefer fetched data as it includes complete information like submitted_by_name and submitted_by_role
  // If query has completed (even if it returned null), use that; otherwise use initial program data
  const programData = fullProgramData !== undefined ? (fullProgramData || program) : program
  
  // Use the new upload path utility
  const imageSource = getProgramImageUrl(programData.image);

  // Using centralized date utilities - formatProgramDates is now imported

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

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick} key={`modal-${program?.id}`}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Program Details</h2>
          <button 
            className={styles.modalCloseButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </div>
        
        <div className={styles.modalBody}>
          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <button
              className={`${styles.tab} ${activeTab === 'details' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <FaInfoCircle className={styles.tabIcon} />
              Details
            </button>
            <button
              className={`${styles.tab} ${activeTab === 'activity' ? styles.activeTab : ''}`}
              onClick={() => setActiveTab('activity')}
            >
              <FaHistory className={styles.tabIcon} />
              Activity Tracker
            </button>
          </div>

          {/* Tab Content */}
          {activeTab === 'details' && (
            <div className={styles.contentLayout}>
              {/* Top Section - Image and Program Info Side by Side */}
              <div className={styles.topSection}>
              {/* Left - Program Image */}
              <div className={styles.imageSection}>
                {imageSource ? (
                  <Image 
                    src={imageSource}
                    alt={programData.title}
                    className={styles.programImage}
                    width={400}
                    height={300}
                    onError={(e) => {
                      e.target.style.display = 'none'
                      e.target.nextSibling.style.display = 'flex'
                    }}
                  />
                ) : null}
                <div className={styles.imagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
                  <FaEye />
                  <span>No image available</span>
                </div>
              </div>

              {/* Right - Program Title, Status, Program Details */}
              <div className={styles.programInfoSection}>
                <h3 className={styles.programTitle}>{programData.title}</h3>
                
                {/* Status Badge */}
                {programData.status && (
                  <div className={`${styles.statusBadge} ${styles[programData.status]}`}>
                    {programData.status.charAt(0).toUpperCase() + programData.status.slice(1)}
                  </div>
                )}

                {/* Program Details */}
                <div className={styles.detailsSection}>
                  <div className={styles.detailsGrid}>
                    <div className={styles.detailItem}>
                      <FaTag className={styles.detailIcon} />
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Category</span>
                        <span className={styles.detailValue}>
                          {getCategoryLabel(programData.category)}
                        </span>
                      </div>
                    </div>

                    <div className={styles.detailItem}>
                      <FaCalendar className={styles.detailIcon} />
                      <div className={styles.detailContent}>
                        <span className={styles.detailLabel}>Event Date(s)</span>
                        <span className={styles.detailValue}>
                          {formatProgramDates(programData)}
                        </span>
                      </div>
                    </div>

                    {programData.created_at && (
                      <div className={styles.detailItem}>
                        <FaCalendar className={styles.detailIcon} />
                        <div className={styles.detailContent}>
                          <span className={styles.detailLabel}>Created</span>
                          <span className={styles.detailValue}>
                            {formatDateShort(programData.created_at)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Description - Full Width Below */}
            <div className={styles.descriptionSection}>
              <h4 className={styles.sectionTitle}>Description</h4>
              <p className={styles.description}>
                {programData.description || 'No description provided'}
              </p>
            </div>

            {/* Collaborator Section - Only show if program is collaborative */}
            {programData.is_collaborative && programData.collaborators && programData.collaborators.length > 0 && (() => {
              // Filter out the primary organization (the one that created the program)
              // Only show actual collaborators, not the primary organization
              const actualCollaborators = programData.collaborators.filter(collab => collab.role !== 'primary');
              
              // If no actual collaborators after filtering, don't show the section
              if (actualCollaborators.length === 0) {
                return null;
              }
              
              return (
                <div className={styles.collaboratorSection}>
                  <h4 className={styles.sectionTitle}>Collaborator</h4>
                  <div className={styles.organizationInfo}>
                    {actualCollaborators.map((collab, index) => {
                    const logoUrl = collab.organization_logo 
                      ? getOrganizationImageUrl(collab.organization_logo, 'logo')
                      : null;
                    
                    return (
                      <div key={index} className={styles.orgCard}>
                        <div className={styles.orgDetails}>
                          {/* Logo container */}
                          <div className={styles.orgLogoContainer}>
                            {logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE' ? (
                              <Image
                                src={logoUrl}
                                alt={`${collab.organization_name} logo`}
                                width={48}
                                height={48}
                                className={styles.orgLogo}
                              />
                            ) : (
                              <div className={styles.orgLogoPlaceholder}>
                                <FaBuilding />
                              </div>
                            )}
                          </div>
                          <div className={styles.orgTextContainer}>
                            <div className={styles.orgName}>
                              {collab.organization_name} {collab.organization_acronym && `(${collab.organization_acronym})`}
                            </div>
                            {collab.admin_email && (
                              <div className={styles.adminEmail}>
                                {collab.admin_email}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Additional Images - Full Width Below - Only show if there are additional images */}
            {programData.additional_images && programData.additional_images.length > 0 && (
              <div className={styles.additionalImagesSection}>
                <h4 className={styles.sectionTitle}>Additional Images</h4>
                <div className={styles.additionalImagesGrid}>
                  {programData.additional_images.map((imagePath, index) => (
                    <div key={index} className={styles.additionalImageContainer}>
                      <Image
                        src={getProgramImageUrl(imagePath, 'additional')}
                        alt={`Additional ${index + 1}`}
                        className={styles.additionalImage}
                        width={150}
                        height={150}
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
            </div>
          )}

          {/* Activity Tracker Tab */}
          {activeTab === 'activity' && (
            <div className={styles.activityTrackerContent}>
              <h3 className={styles.activityTrackerTitle}>Activity History</h3>
              
              <div className={styles.activityList}>
                {/* Created Activity */}
                {programData.created_at && (
                  <>
                    <div className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        <FaClock />
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityHeader}>
                          <span className={styles.activityAction}>Program Created</span>
                          <span className={styles.activityDate}>
                            {formatDateTime(programData.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Submitted By Information */}
                    <div className={styles.activityItem}>
                      <div className={styles.activityIcon}>
                        <FaUser />
                      </div>
                      <div className={styles.activityContent}>
                        <div className={styles.activityHeader}>
                          <span className={styles.activityAction}>Submitted by</span>
                        </div>
                        <div className={styles.activityDetails}>
                          <div className={styles.activityDetailRow}>
                            <span className={styles.activityDetailValue}>
                              {programData.submitted_by_name && programData.submitted_by_name.trim() 
                                ? programData.submitted_by_name 
                                : 'Not specified'}
                              {programData.submitted_by_role && programData.submitted_by_role.trim() && (
                                <span className={styles.activityRole}> ({programData.submitted_by_role})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Updated Activity - Only show if program has been updated AND has edited_by data */}
                {(() => {
                  // Check if edited_by_name exists and has real data (not empty, not null, not "Not specified")
                  const hasEditedByData = programData.edited_by_name && 
                    typeof programData.edited_by_name === 'string' &&
                    programData.edited_by_name.trim() !== '' &&
                    programData.edited_by_name.trim().toLowerCase() !== 'not specified';
                  
                  // Check if program has been updated (updated_at exists and is different from created_at)
                  // Use a 1 second threshold to account for MySQL timestamp precision
                  const hasBeenUpdated = programData.updated_at && 
                    programData.created_at && 
                    (() => {
                      const updatedTime = new Date(programData.updated_at).getTime();
                      const createdTime = new Date(programData.created_at).getTime();
                      // Program has been updated if updated_at is at least 1 second after created_at
                      return (updatedTime - createdTime) >= 1000;
                    })();
                  
                  // Only show if program has been updated AND has edited_by data
                  if (hasBeenUpdated && hasEditedByData) {
                    return (
                      <>
                        <div className={styles.activityItem}>
                          <div className={styles.activityIcon}>
                            <FaClock />
                          </div>
                          <div className={styles.activityContent}>
                            <div className={styles.activityHeader}>
                              <span className={styles.activityAction}>Program Updated</span>
                              <span className={styles.activityDate}>
                                {formatDateTime(programData.updated_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Updated By Information - Only show if edited_by_name exists */}
                        <div className={styles.activityItem}>
                          <div className={styles.activityIcon}>
                            <FaUser />
                          </div>
                          <div className={styles.activityContent}>
                            <div className={styles.activityHeader}>
                              <span className={styles.activityAction}>Updated by</span>
                            </div>
                            <div className={styles.activityDetails}>
                              <div className={styles.activityDetailRow}>
                                <span className={styles.activityDetailValue}>
                                  {programData.edited_by_name.trim()}
                                  {programData.edited_by_role && 
                                   typeof programData.edited_by_role === 'string' &&
                                   programData.edited_by_role.trim() !== '' && (
                                    <span className={styles.activityRole}> ({programData.edited_by_role.trim()})</span>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  }
                  return null;
                })()}

                {/* No activity message */}
                {!programData.created_at && !programData.updated_at && (
                  <div className={styles.noActivity}>
                    <FaHistory className={styles.noActivityIcon} />
                    <p>No activity history available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.closeModalButton}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProgramDetailsModal
