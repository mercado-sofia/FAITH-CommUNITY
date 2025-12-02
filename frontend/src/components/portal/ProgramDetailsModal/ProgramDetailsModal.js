'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { FaTimes, FaTag, FaCalendar, FaEye, FaBuilding, FaHistory, FaInfoCircle, FaClock, FaUsers, FaExclamationTriangle, FaCheck } from 'react-icons/fa'
import { FiArchive, FiCalendar } from 'react-icons/fi'
import { getProgramImageUrl, getOrganizationImageUrl } from '@/utils/shared/uploadPaths'
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils'
import { hasActiveCollaborations as checkHasActiveCollaborations, getActiveCollaborators, getStatusDisplayText } from '@/utils/shared/collaborationStatusUtils'
import { formatProgramDates, formatDateShort, formatDateTime } from '@/utils/shared/dateUtils'
import DOMPurify from 'dompurify'
import { ConfirmationModal } from '@/components'
import styles from './ProgramDetailsModal.module.css'

// Conditional imports for superadmin features
import { 
  useGetProgramByIdQuery as useSuperadminGetProgramByIdQuery,
  useArchiveProgramMutation as useSuperadminArchiveProgramMutation
} from '@/rtk/superadmin/programsApi'

const ProgramDetailsModal = ({ 
  program, 
  isOpen, 
  onClose, 
  portal = 'admin', // 'superadmin' | 'admin'
  mode = 'view', // 'view' | 'collaboration' (admin only)
  collaboration = null,
  enableDataFetch = false, // Enable RTK Query fetch (superadmin only)
  onActionComplete 
}) => {
  const [activeTab, setActiveTab] = useState('details')
  const scrollPositionRef = useRef(0)
  const [archiveModalOpen, setArchiveModalOpen] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Archive mutation (superadmin only) - always call hook, but only use when portal is superadmin
  const [archiveProgram] = useSuperadminArchiveProgramMutation()

  // Reset tab when program changes
  useEffect(() => {
    if (isOpen && (program?.id || collaboration?.id)) {
      setActiveTab('details')
    }
  }, [isOpen, program?.id, collaboration?.id, mode])

  // Fetch complete program details when modal opens (superadmin only)
  const shouldFetch = portal === 'superadmin' && enableDataFetch && isOpen && program?.id
  const { 
    data: fullProgramData,
    isLoading: isLoadingProgram
  } = useSuperadminGetProgramByIdQuery(program?.id, {
    skip: !shouldFetch,
    refetchOnMountOrArgChange: true
  })

  // Lock scroll when modal is open (superadmin only)
  useEffect(() => {
    if (portal !== 'superadmin' || typeof document === 'undefined' || !document.body) {
      return
    }

    if (isOpen) {
      // Find the scrollable container (main.content element in superadmin layout)
      const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                  document.querySelector('.content') ||
                                  document.documentElement
      
      // Save current scroll position BEFORE locking
      const scrollY = scrollableContainer === document.documentElement 
        ? window.scrollY 
        : scrollableContainer.scrollTop
      
      scrollPositionRef.current = scrollY
      
      // Lock scroll by setting overflow: hidden on the scrollable container
      if (scrollableContainer !== document.documentElement) {
        scrollableContainer.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = 'hidden'
      }
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        if (typeof document !== 'undefined' && typeof window !== 'undefined') {
          const savedScrollY = scrollPositionRef.current
          
          const scrollableContainer = document.querySelector('main[class*="content"]') || 
                                      document.querySelector('.content') ||
                                      document.documentElement
          
          // Restore scroll position FIRST, before restoring overflow
          if (scrollableContainer === document.documentElement) {
            document.documentElement.scrollTop = savedScrollY
            window.scrollTo(0, savedScrollY)
          } else {
            scrollableContainer.scrollTop = savedScrollY
          }
          
          // Then restore overflow
          if (scrollableContainer !== document.documentElement) {
            scrollableContainer.style.overflow = ''
          } else {
            document.body.style.overflow = ''
          }
          
          // Double-check scroll position after a brief moment
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
  }, [isOpen, portal])

  if (!isOpen || (!program && !collaboration)) return null

  // Safety check for collaboration data in collaboration mode
  if (mode === 'collaboration' && !collaboration) {
    return null
  }

  // Use collaboration data if in collaboration mode, otherwise use program data
  // For superadmin, prefer fetched data if available
  let data
  if (mode === 'collaboration') {
    data = collaboration
  } else if (portal === 'superadmin' && fullProgramData && !isLoadingProgram) {
    data = fullProgramData
  } else {
    data = program
  }

  // Handle archive (superadmin only)
  const handleArchive = async () => {
    if (!data || portal !== 'superadmin') return
    
    setIsArchiving(true)
    try {
      await archiveProgram(data.id).unwrap()
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
      let errorMessage = 'Failed to archive program. Please try again.'
      
      if (error?.data) {
        errorMessage = error.data.message || error.data.error || errorMessage
      } else if (error?.message) {
        errorMessage = error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      alert(errorMessage)
    } finally {
      setIsArchiving(false)
    }
  }

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
    }
    return categoryMap[category] || category || 'Uncategorized'
  }

  // Collaboration mode helpers
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return '#fef3c7'
      case 'accepted':
        return '#d1fae5'
      case 'declined':
        return '#fee2e2'
      case 'approved':
        return '#d1fae5'
      default:
        return '#fef3c7'
    }
  }

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'pending':
        return '#92400e'
      case 'accepted':
        return '#065f46'
      case 'declined':
        return '#991b1b'
      case 'approved':
        return '#065f46'
      default:
        return '#92400e'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <FaClock />
      case 'accepted':
        return <FaCheck />
      case 'declined':
        return <FaTimes />
      case 'approved':
        return <FaCheck />
      default:
        return <FaClock />
    }
  }

  const getRequestTypeText = (requestType) => {
    return requestType === 'received' ? 'Collaboration Request Received' : 'Collaboration Request Sent'
  }

  const getRequestTypeColor = (requestType) => {
    return requestType === 'received' ? '#3b82f6' : '#8b5cf6'
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  // Reusable OrgCard rendering function
  const renderOrgCard = (collaborator, index) => {
    const logoUrl = collaborator.organization_logo 
      ? getOrganizationImageUrl(collaborator.organization_logo, 'logo')
      : null
    
    return (
      <div key={collaborator.id || `collab-${index}`} className={styles.orgCard}>
        <div className={styles.orgDetails}>
          <div className={styles.orgLogoContainer}>
            {logoUrl && logoUrl !== 'ORGANIZATION_LOGO_UNAVAILABLE' && collaborator.organization_logo ? (
              <Image
                src={logoUrl}
                alt={`${collaborator.organization_name || 'Organization'} logo`}
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
              {collaborator.organization_name || 'Unknown Organization'} {collaborator.organization_acronym && collaborator.organization_acronym.trim() !== '' && `(${collaborator.organization_acronym})`}
            </div>
            {collaborator.email && (
              <div className={styles.adminEmail}>
                {collaborator.email}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Normalize collaborator data from different sources
  const normalizeCollaborators = (data, mode, portal) => {
    const normalized = []
    
    if (mode === 'collaboration') {
      // Collaboration mode: extract from inviter/invitee fields
      const orgName = data.request_type === 'received' ? data.inviter_org_name : data.invitee_org_name
      const orgAcronym = data.request_type === 'received' ? data.inviter_org_acronym : data.invitee_org_acronym
      const orgLogo = data.request_type === 'received' ? data.inviter_org_logo : data.invitee_org_logo
      const adminEmail = data.request_type === 'received' ? data.inviter_email : data.invitee_email
      
      if (orgName || adminEmail) {
        normalized.push({
          organization_name: orgName || null,
          organization_acronym: orgAcronym || null,
          organization_logo: orgLogo || null,
          email: adminEmail || null
        })
      }
    } else if (portal === 'superadmin' && data.is_collaborative && data.collaborators) {
      // Superadmin: filter out primary and normalize
      const actualCollaborators = data.collaborators.filter(collab => collab.role !== 'primary')
      actualCollaborators.forEach(collab => {
        normalized.push({
          organization_name: collab.organization_name || null,
          organization_acronym: collab.organization_acronym || null,
          organization_logo: collab.organization_logo || null,
          email: collab.admin_email || collab.email || null
        })
      })
    } else if (portal === 'admin' && mode === 'view' && data.collaborators) {
      // Admin view: use validCollaborators
      const hasActiveCollaborations = checkHasActiveCollaborations(data)
      if (hasActiveCollaborations) {
        const validCollaborators = getActiveCollaborators(data.collaborators).filter(collab => 
          collab && 
          typeof collab === 'object' && 
          collab.email && 
          collab.email.trim() !== ''
        )
        validCollaborators.forEach(collaborator => {
          normalized.push({
            organization_name: collaborator.organization_name || null,
            organization_acronym: collaborator.organization_acronym || null,
            organization_logo: collaborator.organization_logo || null,
            email: collaborator.email || null
          })
        })
      }
    }
    
    return normalized
  }

  // Unified collaborator section rendering function
  const renderCollaboratorSection = (normalizedCollaborators, options = {}) => {
    const {
      sectionStyle = 'collaborationSection',
      title = null,
      showIcon = false
    } = options

    if (!normalizedCollaborators || normalizedCollaborators.length === 0) {
      return null
    }

    // Auto-pluralize title if not provided
    const sectionTitle = title || (normalizedCollaborators.length === 1 ? 'Collaborator' : 'Collaborators')

    return (
      <div className={styles[sectionStyle]}>
        <h4 className={styles.sectionTitle}>
          {showIcon && <FaUsers className={styles.sectionIcon} />}
          {sectionTitle}
        </h4>
        <div className={styles.organizationInfo}>
          {normalizedCollaborators.map((collaborator, index) => 
            renderOrgCard(collaborator, index)
          )}
        </div>
      </div>
    )
  }

  // Get image source
  const imageSource = mode === 'collaboration' 
    ? data.program_image 
    : getProgramImageUrl(data.image)

  // Get title
  const title = mode === 'collaboration' ? data.program_title : data.title

  // Get category
  const category = mode === 'collaboration' ? data.program_category : data.category

  // Get description
  const description = mode === 'collaboration' ? data.program_description : data.description

  // Get status
  const programStatus = mode === 'collaboration' 
    ? data.program_status 
    : (portal === 'superadmin' 
      ? getProgramStatusByDates(data) 
      : (checkHasActiveCollaborations(data) ? getStatusDisplayText(data.status) : (data.status?.charAt(0).toUpperCase() + data.status?.slice(1))))

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick} key={`modal-${data?.id || collaboration?.id}-${isOpen}`}>
      <div className={styles.modalContent} key={`content-${data?.id || collaboration?.id}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.titleSection}>
            <h2 className={styles.modalTitle}>Program Details</h2>
            {/* Collaboration-specific header additions */}
            {mode === 'collaboration' && (
              <div className={styles.requestType} style={{ color: getRequestTypeColor(data.request_type) }}>
                {getRequestTypeText(data.request_type)}
              </div>
            )}
          </div>
          <div className={styles.headerActions}>
            {/* Collaboration status badge */}
            {mode === 'collaboration' && (
              <div className={styles.statusBadge} style={{ 
                backgroundColor: getStatusColor(data.status),
                color: getStatusTextColor(data.status)
              }}>
                {getStatusIcon(data.status)}
                <span>{(data.status || 'pending').charAt(0).toUpperCase() + (data.status || 'pending').slice(1)}</span>
              </div>
            )}
            <button 
              className={portal === 'superadmin' ? styles.modalCloseButton : styles.closeButton}
              onClick={onClose}
              aria-label="Close modal"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        <div className={styles.modalBody}>
          {/* Tabs - Only show in view mode */}
          {mode === 'view' && (
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
          )}

          {/* Tab Content - Show details for collaboration mode, or based on activeTab for view mode */}
          {(mode === 'collaboration' || activeTab === 'details') && (
            <div className={styles.contentLayout}>
              {/* Top Section - Image and Program Info Side by Side */}
              <div className={styles.topSection}>
                {/* Left - Program Image */}
                {imageSource ? (
                  <div className={styles.imageSection}>
                    {imageSource === 'IMAGE_UNAVAILABLE' ? (
                      <div className={styles.imagePlaceholder}>
                        <FaExclamationTriangle />
                        <span>Image unavailable</span>
                      </div>
                    ) : (
                      <>
                        <Image
                          src={imageSource}
                          alt={title}
                          className={styles.programImage}
                          width={mode === 'collaboration' ? 600 : 400}
                          height={300}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex'
                            } else {
                              setImageError(true)
                            }
                          }}
                        />
                        {imageError && (
                          <div className={styles.imagePlaceholder}>
                            <FaExclamationTriangle />
                            <span>Image unavailable</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <div className={styles.imageSection}>
                    <div className={styles.imagePlaceholder}>
                      <FaEye />
                      <span>No image available</span>
                    </div>
                  </div>
                )}

                {/* Right - Program Title, Status, Program Details */}
                <div className={styles.programInfoSection}>
                  {/* Category badge (admin only) */}
                  {portal === 'admin' && (mode === 'view' || mode === 'collaboration') && (
                    <div className={styles.categoryBadge}>
                      {getCategoryLabel(category)}
                    </div>
                  )}
                  
                  <h3 className={styles.programTitle}>{title}</h3>
                  
                  {/* Status Badge */}
                  {portal === 'superadmin' && programStatus && (
                    <div className={`${styles.statusBadge} ${styles[programStatus]}`}>
                      {programStatus.charAt(0).toUpperCase() + programStatus.slice(1)}
                    </div>
                  )}

                  {/* Program Details */}
                  <div className={styles.detailsSection}>
                    <div className={styles.detailsGrid}>
                      {portal === 'superadmin' && (
                        <div className={styles.detailItem}>
                          <FaTag className={styles.detailIcon} />
                          <div className={styles.detailContent}>
                            <span className={styles.detailLabel}>Category</span>
                            <span className={styles.detailValue}>
                              {getCategoryLabel(category)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className={styles.detailItem}>
                        {portal === 'superadmin' ? (
                          <FaCalendar className={styles.detailIcon} />
                        ) : (
                          <FiCalendar className={styles.detailIcon} />
                        )}
                        <div className={styles.detailContent}>
                          {portal === 'superadmin' && <span className={styles.detailLabel}>Event Date(s)</span>}
                          <span className={styles.detailValue}>
                            {mode === 'collaboration' ? (
                              data.event_start_date ? formatDateShort(data.event_start_date) : 'N/A'
                            ) : (
                              formatProgramDates(data)
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Program Status - show in admin view and collaboration modes */}
                      {portal === 'admin' && (mode === 'view' || mode === 'collaboration') && data.status && (
                        <div className={styles.detailItem}>
                          <span className={styles.detailLabel}>Program Status:</span>
                          <span className={styles.detailValue}>
                            {programStatus}
                          </span>
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
                    __html: description
                      ? DOMPurify.sanitize(description) 
                      : '<p>No description provided</p>' 
                  }} 
                />
              </div>

              {/* Collaborator Section - Superadmin view mode */}
              {portal === 'superadmin' && mode === 'view' && data.is_collaborative && data.collaborators && data.collaborators.length > 0 && 
                renderCollaboratorSection(
                  normalizeCollaborators(data, mode, portal),
                  { sectionStyle: 'collaboratorSection', title: 'Collaborator' }
                )
              }

              {/* Collaboration Section - Admin view and collaboration modes */}
              {portal === 'admin' && (mode === 'view' || mode === 'collaboration') && (() => {
                // For collaboration mode, show the collaborator organization
                if (mode === 'collaboration') {
                  return renderCollaboratorSection(
                    normalizeCollaborators(data, mode, portal),
                    { sectionStyle: 'collaborationSection', title: 'Collaborator', showIcon: true }
                  )
                }
                
                // For view mode, show active collaborators
                const hasActiveCollaborations = checkHasActiveCollaborations(data)
                
                const hasCollaborators = hasActiveCollaborations &&
                  data.collaborators && data.collaborators.some(collab => 
                    collab && 
                    typeof collab === 'object' && 
                    collab.email && 
                    collab.email.trim() !== ''
                  )

                if (!hasCollaborators) {
                  return null
                }

                return renderCollaboratorSection(
                  normalizeCollaborators(data, mode, portal),
                  { sectionStyle: 'collaborationSection', title: 'Collaborators', showIcon: true }
                )
              })()}

              {/* Timeline - Collaboration mode only */}
              {mode === 'collaboration' && (
                <div className={styles.section}>
                  <h4 className={styles.sectionTitle}>Timeline</h4>
                  <div className={styles.timeline}>
                    <div className={styles.timelineItem}>
                      <div className={styles.timelineIcon}>
                        <FaClock />
                      </div>
                      <div className={styles.timelineContent}>
                        <div className={styles.timelineTitle}>Request Sent</div>
                        <div className={styles.timelineDate}>{formatDateShort(data.invited_at)}</div>
                      </div>
                    </div>
                    
                    {data.responded_at && (
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon} style={{ backgroundColor: getStatusColor(data.status) }}>
                          {getStatusIcon(data.status)}
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTitle}>
                            Request {(data.status || 'pending') === 'accepted' ? 'Accepted' : 'Declined'}
                          </div>
                          <div className={styles.timelineDate}>{formatDateShort(data.responded_at)}</div>
                        </div>
                      </div>
                    )}

                    {!data.is_approved && data.collaboration_status === 'accepted' && (
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon} style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}>
                          <FaClock />
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTitle}>Pending Superadmin Approval</div>
                          <div className={styles.timelineDate}>Awaiting superadmin review</div>
                        </div>
                      </div>
                    )}

                    {data.is_approved && (
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon} style={{ backgroundColor: '#10b981', color: 'white' }}>
                          <FaCheck />
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTitle}>Superadmin Approved</div>
                          <div className={styles.timelineDate}>Program approved and published</div>
                        </div>
                      </div>
                    )}

                    {!data.is_approved && data.collaboration_status === 'declined' && (
                      <div className={styles.timelineItem}>
                        <div className={styles.timelineIcon} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                          <FaTimes />
                        </div>
                        <div className={styles.timelineContent}>
                          <div className={styles.timelineTitle}>Superadmin Rejected</div>
                          <div className={styles.timelineDate}>Program rejected by superadmin</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Information - Collaboration mode only */}
              {mode === 'collaboration' && (data.status === 'pending' || data.status === '' || !data.status) && data.request_type === 'received' && (
                <div className={styles.section}>
                  <div className={styles.actionInfo}>
                    <FaInfoCircle className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <h4>Action Required</h4>
                      <p>
                        You have received a collaboration request for this program. 
                        If you accept, the program will be created once all collaborators accept the collaboration request.
                        If you decline, the program will not be created if no collaborators accept.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'collaboration' && !data.is_approved && data.collaboration_status === 'accepted' && (
                <div className={styles.section}>
                  <div className={styles.actionInfo}>
                    <FaInfoCircle className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <h4>Pending Superadmin Review</h4>
                      <p>
                        This collaborative program has been accepted by all collaborators and has been created successfully. 
                        The program is now live and visible to the public.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'collaboration' && data.is_approved && (
                <div className={styles.section}>
                  <div className={styles.actionInfo}>
                    <FaInfoCircle className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <h4>Program Approved</h4>
                      <p>
                        This collaborative program has been approved by the superadmin and is now published. 
                        All collaborating organizations can now view and manage this program.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'collaboration' && !data.is_approved && data.collaboration_status === 'declined' && (
                <div className={styles.section}>
                  <div className={styles.actionInfo}>
                    <FaInfoCircle className={styles.infoIcon} />
                    <div className={styles.infoContent}>
                      <h4>Program Rejected</h4>
                      <p>
                        This collaborative program has been rejected by the superadmin. 
                        The program will not be published and collaboration on this program has ended.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Additional Images - Show in view and collaboration modes */}
              {(mode === 'view' || mode === 'collaboration') && data.additional_images && data.additional_images.length > 0 && (
                <div className={styles.additionalImagesSection}>
                  <h4 className={styles.sectionTitle}>Additional Images</h4>
                  <div className={styles.additionalImagesGrid}>
                    {data.additional_images.map((imagePath, index) => (
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

          {/* Activity Tracker Tab - Only show in view mode */}
          {mode === 'view' && activeTab === 'activity' && (
            <div className={styles.activityTrackerContent}>
              <h3 className={styles.activityTrackerTitle}>History</h3>
              
              <div className={styles.activityList}>
                {/* Created Activity */}
                {data.created_at && (
                  <div className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      <FaClock />
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityHeader}>
                        <span className={styles.activityAction}>Program Created</span>
                        <span className={styles.activityDate}>
                          {formatDateTime(data.created_at)}
                        </span>
                      </div>
                      {/* Submitted By Information */}
                      {data.submitted_by_name && (
                        <div className={styles.activityDetails}>
                          <div className={styles.activityDetailRow}>
                            <span className={styles.activityDetailLabel}>Submitted by:</span>
                            <span className={styles.activityDetailValue}>
                              {data.submitted_by_name.trim() || 'Not specified'}
                              {data.submitted_by_role && data.submitted_by_role.trim() && (
                                <span className={styles.activityRole}> ({data.submitted_by_role})</span>
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Updated Activity - Only show if program has been updated AND has edited_by data */}
                {(() => {
                  const hasEditedByData = data.edited_by_name && 
                    typeof data.edited_by_name === 'string' &&
                    data.edited_by_name.trim() !== '' &&
                    data.edited_by_name.trim().toLowerCase() !== 'not specified'
                  
                  const hasBeenUpdated = data.updated_at && 
                    data.created_at && 
                    (() => {
                      const updatedTime = new Date(data.updated_at).getTime()
                      const createdTime = new Date(data.created_at).getTime()
                      return (updatedTime - createdTime) >= 1000
                    })()
                  
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
                              {formatDateTime(data.updated_at)}
                            </span>
                          </div>
                          <div className={styles.activityDetails}>
                            <div className={styles.activityDetailRow}>
                              <span className={styles.activityDetailLabel}>Updated by:</span>
                              <span className={styles.activityDetailValue}>
                                {data.edited_by_name.trim()}
                                {data.edited_by_role && 
                                 typeof data.edited_by_role === 'string' &&
                                 data.edited_by_role.trim() !== '' && (
                                  <span className={styles.activityRole}> ({data.edited_by_role.trim()})</span>
                                )}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return null
                })()}

                {/* No activity message */}
                {!data.created_at && !data.updated_at && (
                  <div className={styles.noActivity}>
                    <FaHistory className={styles.noActivityIcon} />
                    <p>No activity history available</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Archive Confirmation Modal - Superadmin only */}
        {portal === 'superadmin' && (
          <ConfirmationModal
            isOpen={archiveModalOpen}
            onCancel={() => setArchiveModalOpen(false)}
            onConfirm={handleArchive}
            itemName={data?.title}
            itemType="program"
            actionType="archive"
            isLoading={isArchiving}
            customMessage={
              data?.organization_name
                ? `Are you sure you want to archive this program? Organization: ${data.organization_name}. This will remove it from the website display.`
                : undefined
            }
          />
        )}

        {/* Modal Footer - Superadmin only */}
        {portal === 'superadmin' && mode === 'view' && (
          <div className={styles.modalFooter}>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {data && data.status !== 'archived' && (
                <button
                  onClick={() => setArchiveModalOpen(true)}
                  className={styles.archiveButton}
                  disabled={isArchiving}
                >
                  <FiArchive />
                  Archive
                </button>
              )}
              <button onClick={onClose} className={styles.closeModalButton}>
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProgramDetailsModal