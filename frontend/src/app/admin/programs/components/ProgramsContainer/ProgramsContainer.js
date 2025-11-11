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
  onToggleVolunteerAcceptance
}) => {
  if ((filteredPrograms?.length || 0) === 0) {
    return (
      <div className={styles.programsSection}>
        <div className={styles.emptyState}>
          <div className={styles.emptyTitle}>No programs found</div>
          <div className={styles.emptyText}>No programs match your current filters. Try adjusting your search criteria.</div>
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
          />
        ))}
      </div>
    </div>
  );
};

export default ProgramsContainer;
