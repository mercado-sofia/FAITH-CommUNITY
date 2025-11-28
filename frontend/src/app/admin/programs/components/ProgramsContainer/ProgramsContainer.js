import { ProgramCard } from '../index';
import styles from './ProgramsContainer.module.css';

const ProgramsContainer = ({
  filteredPrograms,
  onViewDetails,
  onEdit,
  onDelete,
  onMarkCompleted,
  onMarkActive,
  onOptOut,
  onShowSuccessModal,
  onToggleVolunteerAcceptance,
  onArchive,
  onUnarchive,
  emptyStateTitle = 'No programs found',
  emptyStateText = 'No programs match your current filters. Try adjusting your search criteria.'
}) => {
  if ((filteredPrograms?.length || 0) === 0) {
    return (
      <div className={styles.programsSection}>
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>{emptyStateTitle}</div>
          <div className={styles.emptyText}>{emptyStateText}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.programsSection}>
      <div className={styles.programsGrid}>
        {(filteredPrograms || []).map((program) => (
          <ProgramCard
            key={program?.id || Math.random()}
            program={program}
            onViewDetails={() => onViewDetails(program)}
            onEdit={() => onEdit(program)}
            onDelete={() => onDelete(program)}
            onMarkCompleted={() => onMarkCompleted(program)}
            onMarkActive={() => onMarkActive(program)}
            onOptOut={onOptOut}
            onShowSuccessModal={onShowSuccessModal}
            onToggleVolunteerAcceptance={onToggleVolunteerAcceptance}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        ))}
      </div>
    </div>
  );
};

export default ProgramsContainer;
