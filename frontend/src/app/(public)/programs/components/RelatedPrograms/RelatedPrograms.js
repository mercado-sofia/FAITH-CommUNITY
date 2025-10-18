'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import styles from './RelatedPrograms.module.css';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import { getProgramStatusByDates } from '@/utils/programStatusUtils';


const getStatusClass = (status) => {
  switch (status) {
    case 'Upcoming':
      return styles.statusUpcoming;
    case 'Active':
      return styles.statusActive;
    case 'Completed':
      return styles.statusCompleted;
    default:
      return styles.statusCompleted;
  }
};

export default function OtherPrograms({ otherPrograms, organizationName, organizationAcronym, organizationId }) {
  const router = useRouter();

  if (!otherPrograms || otherPrograms.length === 0) {
    return null;
  }

  return (
    <div className={styles.otherProgramsContainer}>
      <div className={styles.otherProgramsHeader}>
        <h3 className={styles.otherProgramsTitle}>
          Related Programs from {organizationAcronym || organizationName}
        </h3>
        <span className={styles.programsCount}>
          {otherPrograms.length} {otherPrograms.length === 1 ? 'program' : 'programs'}
        </span>
      </div>
      
      <div className={styles.otherProgramsGrid}>
        {otherPrograms.slice(0, 6).map((otherProgram) => {
          const otherProgramStatus = getProgramStatusByDates(otherProgram);
          return (
            <div 
              key={otherProgram.id} 
              className={styles.otherProgramCard}
              onClick={() => router.push(`/programs/${otherProgram.slug}`)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  router.push(`/programs/${otherProgram.slug}`);
                }
              }}
              aria-label={`View ${otherProgram.title} program details`}
            >
              {otherProgram.image && (
                <div className={styles.otherProgramImageContainer}>
                  <Image
                    src={getProgramImageUrl(otherProgram.image)}
                    alt={otherProgram.title}
                    width={300}
                    height={200}
                    className={styles.otherProgramImage}
                  />
                  <div className={styles.otherProgramOverlay}>
                    <span className={styles.viewDetails}>View Details</span>
                  </div>
                </div>
              )}
              
              <div className={styles.otherProgramContent}>
                <h4 className={styles.otherProgramTitle}>{otherProgram.title}</h4>
                <p className={styles.otherProgramDescription}>
                  {otherProgram.description?.length > 100 
                    ? `${otherProgram.description.substring(0, 100)}...` 
                    : otherProgram.description
                  }
                </p>
                
                <div className={styles.otherProgramMeta}>
                  <span className={`${styles.otherProgramStatusBadge} ${getStatusClass(otherProgramStatus)}`}>
                    {otherProgramStatus}
                  </span>
                  <span className={styles.otherProgramCategory}>{otherProgram.category}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {otherPrograms.length > 6 && (
        <div className={styles.seeAllContainer}>
          <button 
            className={styles.seeAllButton}
            onClick={() => router.push(`/programs/org/${organizationAcronym || organizationId}`)}
          >
            See All Programs
          </button>
        </div>
      )}
    </div>
  );
}
