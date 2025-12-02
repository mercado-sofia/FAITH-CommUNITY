'use client'

import Image from 'next/image'
import { getProgramImageUrl } from '@/utils/shared/uploadPaths'
import { formatProgramDatesForCard } from '@/utils/shared/dateUtils'
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils'
import DOMPurify from 'dompurify'
import StarButton from './StarButton'
import CollaborationBadge from '@/app/admin/programs/components/CollaborationBadge/CollaborationBadge'
import styles from './styles/ProgramCard.module.css'

const ProgramCard = ({ 
  program, 
  onViewDetails, 
  showOrganizationBadge = false, 
  organizationData = null,
  onRestore = null,
  showOrganizationName = true
}) => {
  // Use the new upload path utility
  const imageSource = getProgramImageUrl(program.image)
  
  // Calculate program status using getProgramStatusByDates to respect manual_status_override
  // This ensures consistency across all portals (Public, Admin, Superadmin)
  const programStatus = getProgramStatusByDates(program)

  // Get organization data for badge
  const orgData = organizationData || {
    name: program.organization_name || 'Unknown Organization',
    acronym: program.organization_acronym || 'ORG',
    color: program.organization_color || '#444444'
  }

  return (
    <div className={styles.featuredCard}>
      <div className={styles.cardImageContainer}>
        {imageSource ? (
          <Image 
            src={imageSource}
            alt={program.title}
            className={styles.cardImage}
            width={300}
            height={200}
            onError={(e) => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
        ) : null}
        <div className={styles.imagePlaceholder} style={{ display: imageSource ? 'none' : 'flex' }}>
          <span>No Image</span>
        </div>
        
        {/* Organization Badge - show if requested or if we have org data */}
        {showOrganizationBadge && (
          <div 
            className={styles.orgBadge}
            style={{ backgroundColor: orgData.color }}
          >
            <span className={styles.orgAcronym}>{orgData.acronym}</span>
          </div>
        )}
        
        {/* Star Button - only show if program is not archived */}
        {program.status !== 'archived' && (
          <StarButton 
            programId={program.id} 
            programTitle={program.title}
            programStatus={program.status}
          />
        )}
        
        {/* Archived Badge - show if program is archived, positioned where star icon was */}
        {program.status === 'archived' && (
          <div className={styles.archivedBadge}>
            <span>Archived</span>
          </div>
        )}
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>{program.title}</h3>
        </div>
        {showOrganizationName && (
          <p className={styles.cardOrganization}>{orgData.name}</p>
        )}
        
        {/* Display collaborating organizations (excluding primary organization) */}
        {(() => {
          // Filter out primary organization from collaborators list
          const nonPrimaryCollaborators = program.collaborators?.filter(c => c.role !== 'primary') || [];
          
          // Only show if program is collaborative and has non-primary collaborators
          if (!program.is_collaborative || nonPrimaryCollaborators.length === 0) {
            return null;
          }
          
          return (
            <div className={styles.collaboratorsSection}>
              <div className={styles.collaboratorsLabel}>Collaborating Organizations:</div>
              <div className={styles.collaboratorsList}>
                {nonPrimaryCollaborators.map((collab, index) => (
                  <div key={index} className={styles.collaboratorItem}>
                    <span 
                      className={styles.collaboratorBadge}
                      style={{ backgroundColor: collab.organization_color || '#d1d5db' }}
                    >
                      {collab.organization_acronym || collab.organization_name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
        
        <p className={styles.cardDescription}>
          {(() => {
            if (!program.description) return 'No description provided';
            // Strip HTML tags for card preview
            if (typeof document !== 'undefined') {
              const textContent = document.createElement('div');
              textContent.innerHTML = DOMPurify.sanitize(program.description);
              const plainText = (textContent.textContent || textContent.innerText || '').trim();
              return plainText.length > 120 
                ? `${plainText.substring(0, 120)}...` 
                : plainText;
            }
            return program.description?.length > 120 
            ? `${program.description.substring(0, 120)}...` 
              : program.description || 'No description provided';
          })()}
        </p>
        
        <div className={styles.cardFooter}>
          <div className={styles.statusBadgeContainer}>
            {/* Collaboration Badge - show if program has non-primary collaborators */}
            {(() => {
              // Filter out primary collaborators and check if any remain
              const nonPrimaryCollaborators = program.collaborators?.filter(c => c.role !== 'primary') || [];
              
              // Check if program is marked as collaborative
              // Handle both boolean and numeric values from database
              const isCollaborative = program.is_collaborative === true || 
                                      program.is_collaborative === 1 || 
                                      program.is_collaborative === '1' ||
                                      Boolean(program.is_collaborative);
              
              // Show badge if program is collaborative and has non-primary collaborators
              const shouldShowBadge = isCollaborative && nonPrimaryCollaborators.length > 0;
              
              if (!shouldShowBadge) return null;
              
              // Ensure all collaborators have collaboration_status for the badge component
              const collaboratorsWithStatus = nonPrimaryCollaborators.map(collab => ({
                ...collab,
                collaboration_status: collab.collaboration_status || collab.status || 'accepted'
              }));
              
              // Create program object with only non-primary collaborators for the badge
              const programForBadge = {
                ...program,
                collaborators: collaboratorsWithStatus
              };
              
              return (
                <CollaborationBadge 
                  program={programForBadge}
                  userRole={null} // Superadmin doesn't have a role, show default Collaborative badge
                  isCollaborative={true}
                />
              );
            })()}
            {/* Don't show status badge if program is archived (we show it as a badge on the image instead) */}
            {program.status !== 'archived' && (
              <span className={`${styles.statusBadge} ${styles[programStatus?.toLowerCase()]}`}>
                {programStatus}
              </span>
            )}
          </div>
          <span className={styles.cardDate}>
            {formatProgramDatesForCard(program)}
          </span>
        </div>
        
        {/* View Details Button */}
        <div className={styles.featuredCardFooter}>
          <button 
            className={styles.viewDetailsButton}
            onClick={() => onViewDetails(program)}
          >
            View Details
          </button>
          {/* Restore Button - only show if onRestore handler is provided */}
          {onRestore && (
            <button 
              className={styles.viewDetailsButton}
              onClick={() => onRestore(program)}
              style={{ marginTop: '0.5rem' }}
            >
              Restore
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ProgramCard
