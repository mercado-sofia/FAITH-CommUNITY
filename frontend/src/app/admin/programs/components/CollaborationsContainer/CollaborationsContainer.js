import { ProgramCard } from '../index';
import styles from './CollaborationsContainer.module.css';

const CollaborationsContainer = ({
  filteredCollaborations,
  collaborationStatusFilter,
  onViewCollaboration,
  onShowSuccessModal,
  onAcceptCollaboration,
  onDeclineCollaboration,
  onEditProgram
}) => {
  return (
    <div className={styles.programsSection}>
      {/* Collaboration Header */}
      <div className={styles.collaborationHeader}>
        <div className={styles.collaborationHeaderContent}>
          <div>
            <h2 className={styles.collaborationTitle}>Collaboration Requests</h2>
            <p className={styles.collaborationSubtitle}>Manage collaboration requests for your programs</p>
          </div>
        </div>
      </div>

      {(() => {
        return (filteredCollaborations?.length || 0) === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyTitle}>No collaborations found</div>
            <div className={styles.emptyText}>
              {collaborationStatusFilter === 'all' 
                ? 'No collaboration requests match your current filters. Try adjusting your search criteria.'
                : `No ${collaborationStatusFilter} collaboration requests found.`
              }
            </div>
          </div>
        ) : (
          <div className={styles.programsGrid}>
            {filteredCollaborations.map((collaboration) => (
              <ProgramCard
                key={collaboration.program_id}
                program={collaboration}
                isCollaborationCard={true}
                onViewDetails={() => onViewCollaboration(collaboration)}
                onEdit={() => {
                  // Convert collaboration data to program format for editing
                  const programForEdit = {
                    id: collaboration.program_id,
                    title: collaboration.program_title,
                    description: collaboration.program_description,
                    category: collaboration.program_category,
                    image: collaboration.program_image,
                    event_start_date: collaboration.event_start_date,
                    event_end_date: collaboration.event_end_date,
                    status: collaboration.program_status,
                    accepts_volunteers: collaboration.accepts_volunteers,
                    collaborators: collaboration.all_collaborators || []
                  };
                  onEditProgram(programForEdit);
                }}
                onDelete={() => {
                  // Delete functionality not available for collaboration cards
                }}
                onOptOut={() => {
                  // Opt out functionality handled by ProgramCard component
                }}
                onShowSuccessModal={onShowSuccessModal}
                onAcceptCollaboration={onAcceptCollaboration}
                onDeclineCollaboration={onDeclineCollaboration}
              />
            ))}
          </div>
        );
      })()}
    </div>
  );
};

export default CollaborationsContainer;
