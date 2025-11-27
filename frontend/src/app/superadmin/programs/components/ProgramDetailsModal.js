'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FaTimes, FaTag, FaCalendar, FaEye, FaBuilding, FaHistory, FaInfoCircle, FaClock, FaArchive } from 'react-icons/fa'
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/shared/uploadPaths'
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils'
import { useGetProgramByIdQuery, useArchiveProgramMutation } from '@/rtk/superadmin/programsApi'
import { formatProgramDates, formatDateShort, formatDateTime } from '@/utils/shared/dateUtils'
import DOMPurify from 'dompurify'
import ArchiveConfirmationModal from './ArchiveConfirmationModal'
import styles from './styles/ProgramDetailsModal.module.css'

const ProgramDetailsModal = ({ program, isOpen, onClose, onActionComplete }) => {
  const [activeTab, setActiveTab] = useState('details')
  const scrollPositionRef = useRef(0)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)

  const [archiveProgram] = useArchiveProgramMutation()

  // Reset tab when program changes
  useEffect(() => {
    if (isOpen && program?.id) {
      setActiveTab('details')
    }
  }, [isOpen, program?.id])

  // Fetch complete program details when modal opens
  // Force refetch when program ID changes to ensure correct data
  const { 
    data: fullProgramData,
    isLoading: isLoadingProgram
  } = useGetProgramByIdQuery(program?.id, {
    skip: !isOpen || !program?.id,
    refetchOnMountOrArgChange: true
  })

  // Lock scroll when modal is open
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) {
      return
    }

    if (isOpen) {
      // Find the scrollable container (main.content element in superadmin layout)
      // The superadmin layout uses a .content container with overflow-y: auto
      const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                  document.querySelector('.content') ||
                                  document.documentElement
      
      // Save current scroll position BEFORE locking
      // Use the scrollable container's scroll position, not window.scrollY
      const scrollY = scrollableContainer === document.documentElement 
        ? window.scrollY 
        : scrollableContainer.scrollTop
      
      scrollPositionRef.current = scrollY
      
      // Lock scroll by setting overflow: hidden on the scrollable container
      // Don't use position: fixed on body as it causes scroll reset issues
      if (scrollableContainer !== document.documentElement) {
        // For container scroll, just lock the container
        scrollableContainer.style.overflow = 'hidden'
      } else {
        // For window scroll, lock body
        document.body.style.overflow = 'hidden'
      }
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          const savedScrollY = scrollPositionRef.current
          
          // Find the scrollable container again (in case DOM changed)
          const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                      document.querySelector('.content') ||
                                      document.documentElement
          
          // Restore scroll position FIRST, before restoring overflow
          // This prevents the browser from resetting scroll to 0
          if (scrollableContainer === document.documentElement) {
            // Window scroll
            document.documentElement.scrollTop = savedScrollY
            window.scrollTo(0, savedScrollY)
          } else {
            // Container scroll - restore directly
            scrollableContainer.scrollTop = savedScrollY
          }
          
          // Then restore overflow
          if (scrollableContainer !== document.documentElement) {
            scrollableContainer.style.overflow = ''
          } else {
            document.body.style.overflow = ''
          }
          
          // Double-check scroll position after a brief moment
          // This ensures scroll is maintained even if browser tries to reset it
          setTimeout(() => {
            if (scrollableContainer === document.documentElement) {
              if (window.scrollY !== savedScrollY) {
                window.scrollTo(0, savedScrollY)
              }
            } else {
              if (scrollableContainer.scrollTop !== savedScrollY) {
                scrollableContainer.scrollTop = savedScrollY
              }
            }
          }, 0)
        }
      }
    }
  }, [isOpen])

  if (!isOpen || !program) return null

  // Use fetched data if available and loaded, otherwise fallback to passed program data
  // Always prefer the passed program data initially, then use fetched data when available
  // This ensures we show the correct program immediately, then update with full details
  const programData = (fullProgramData && !isLoadingProgram) ? fullProgramData : program
  
  // Use the new upload path utility
  const imageSource = getProgramImageUrl(programData.image);

  // Handle archive
  const handleArchive = async () => {
    if (!programData) return
    
    setIsArchiving(true)
    try {
      await archiveProgram(programData.id).unwrap()
      setArchiveModalOpen(false)
      onClose()
      if (onActionComplete) {
        onActionComplete()
      }
      // Trigger refresh event
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('programStatusChanged'))
      }
    } catch (error) {
      console.error('Error archiving program:', error)
      // Extract error message from RTK Query error
      // RTK Query errors have the structure: { status, data: { message, error, ... } }
      let errorMessage = 'Failed to archive program. Please try again.'
      
      if (error?.data) {
        // RTK Query error format
        errorMessage = error.data.message || error.data.error || errorMessage
      } else if (error?.message) {
        // Standard error format
        errorMessage = error.message
      } else if (typeof error === 'string') {
        // String error
        errorMessage = error
      }
      
      alert(errorMessage)
    } finally {
      setIsArchiving(false)
    }
  }

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

  // Use program ID as key to force re-render when program changes
  // This ensures the modal shows the correct program data
  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick} key={`modal-${program?.id}-${isOpen}`}>
      <div className={styles.modalContent} key={`content-${program?.id}`}>
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
              Activity
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
                {(() => {
                  // Calculate program status using getProgramStatusByDates to respect manual_status_override
                  // This ensures consistency across all portals (Public, Admin, Superadmin)
                  const programStatus = getProgramStatusByDates(programData);
                  return programStatus ? (
                    <div className={`${styles.statusBadge} ${styles[programStatus]}`}>
                      {programStatus.charAt(0).toUpperCase() + programStatus.slice(1)}
                    </div>
                  ) : null;
                })()}

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
              <div 
                className={styles.description}
                dangerouslySetInnerHTML={{ 
                  __html: programData.description 
                    ? DOMPurify.sanitize(programData.description) 
                    : '<p>No description provided</p>' 
                }} 
              />
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
              <h3 className={styles.activityTrackerTitle}>History</h3>
              
              <div className={styles.activityList}>
                {/* Created Activity */}
                {programData.created_at && (
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
                      {/* Submitted By Information */}
                      <div className={styles.activityDetails}>
                        <div className={styles.activityDetailRow}>
                          <span className={styles.activityDetailLabel}>Submitted by:</span>
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
                          {/* Updated By Information - Only show if edited_by_name exists */}
                          <div className={styles.activityDetails}>
                            <div className={styles.activityDetailRow}>
                              <span className={styles.activityDetailLabel}>Updated by:</span>
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

        {/* Archive Confirmation Modal */}
        <ArchiveConfirmationModal
          isOpen={archiveModalOpen}
          onClose={() => setArchiveModalOpen(false)}
          onConfirm={handleArchive}
          programTitle={programData?.title}
          organizationName={programData?.organization_name}
          isLoading={isArchiving}
        />

        <div className={styles.modalFooter}>
          {programData?.created_at && (
            <div className={styles.footerDate}>
              Date Created: {formatDateShort(programData.created_at)}
            </div>
          )}
           <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
             {/* Show archive button for all programs that are not already archived */}
             {/* This allows archiving regardless of status: Upcoming, Active, Completed, Featured, etc. */}
             {programData && programData.status !== 'archived' && (
               <button
                 onClick={() => setArchiveModalOpen(true)}
                 className={styles.archiveButton}
                 disabled={isArchiving}
               >
                 <FaArchive style={{ marginRight: '0.5rem' }} />
                 Archive
               </button>
             )}
             <button onClick={onClose} className={styles.closeModalButton}>
               Close
             </button>
           </div>
        </div>
      </div>
    </div>
  )
}

export default ProgramDetailsModal
