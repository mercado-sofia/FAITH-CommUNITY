'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePublicPrograms } from '../../../../../../hooks/usePublicData';
import { getProgramImageUrl } from '../../../../../../utils/uploadPaths';
import styles from '../../org.module.css';

export default function FeaturedProjects({ orgID }) {
  const router = useRouter();

  // Fetch programs for this organization
  const { programs, isLoading, error } = usePublicPrograms(orgID);

  // Filter programs to only show approved ones and limit to 6
  const approvedPrograms = programs
    .filter(program => 
      program.status === 'Upcoming' || program.status === 'Active' || program.status === 'Completed'
    )
    .slice(0, 6);

  const handleButtonClick = (programId) => {
    router.push(`/programs/${programId}`);
  };

  const handleExploreAll = () => {
    router.push('/programs');
  };

  // Get year from program date
  const getProgramYear = (program) => {
    if (program.event_start_date) {
      return new Date(program.event_start_date).getFullYear();
    }
    if (program.created_at) {
      return new Date(program.created_at).getFullYear();
    }
    return new Date().getFullYear();
  };

  // Get image URL for program
  const getProgramImage = (program) => {
    if (program.image) {
      return getProgramImageUrl(program.image);
    }
    return '/sample/sample2.jpg'; // Default image
  };

  if (isLoading) {
    return (
      <section className={styles.programsShowcaseSection}>
        <div className={styles.programsShowcaseContent}>
          <p className={styles.subheading}>Together, We Made These Happen</p>
          <h2 className={styles.heading}>Featured Projects</h2>
          <div className={styles.programsShowcaseLoading}>
            <p>Loading programs...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error || approvedPrograms.length === 0) {
    return (
      <section className={styles.programsShowcaseSection}>
        <div className={styles.programsShowcaseContent}>
          <p className={styles.subheading}>Together, We Made These Happen</p>
          <h2 className={styles.heading}>Featured Projects</h2>
          <div className={styles.programsShowcaseEmpty}>
            <p>No programs available at the moment.</p>
          </div>
          <button 
            className={styles.exploreAllButton}
            onClick={handleExploreAll}
          >
            EXPLORE ALL PROGRAMS
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.programsShowcaseSection}>
      <div className={styles.programsShowcaseContent}>
        <p className={styles.subheading}>Together, We Made These Happen</p>
        <h2 className={styles.heading}>Featured Projects</h2>
        
        <div className={styles.programsGridContainer}>
          <div className={styles.programsGrid}>
              {approvedPrograms.map((program) => {
                const isUpcoming = program.status === 'Upcoming';
                const isCompleted = program.status === 'Completed';
                const isActive = program.status === 'Active';
                
                const getActionButtonText = () => {
                  if (isUpcoming) return 'Apply Now';
                  return 'Learn More';
                };
                
                const getStatusText = () => {
                  if (isUpcoming) return 'Learn More';
                  if (isCompleted) return 'Completed';
                  if (isActive) return 'Active';
                  return 'Learn More';
                };
                
                const getActionButtonClass = () => {
                  if (isUpcoming) return styles.programActionButton;
                  return `${styles.programActionButton} ${styles.learnMore}`;
                };

                return (
                  <div 
                    key={program.id} 
                    className={styles.programCard}
                  >
                    <div className={styles.programImageContainer}>
                      <Image
                        src={getProgramImage(program)}
                        alt={program.title}
                        width={350}
                        height={250}
                        className={styles.programImage}
                      />
                    </div>
                    <div className={styles.programOverlay}>
                      <h4 className={styles.programTitle}>{program.title}</h4>
                      <div className={styles.programBottomSection}>
                        <button 
                          className={getActionButtonClass()}
                          onClick={() => handleButtonClick(program.id)}
                        >
                          {getActionButtonText()}
                        </button>
                        {isUpcoming ? (
                          <span 
                            className={`${styles.programStatusText} ${styles.statusOrange} ${styles.clickableText}`}
                            onClick={() => handleButtonClick(program.id)}
                          >
                            {getStatusText()}
                          </span>
                        ) : (
                          <span 
                            className={`${styles.programStatusText} ${styles.statusGreen}`}
                          >
                            {getStatusText()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* Explore All Programs Button */}
        <button 
          className={styles.exploreAllButton}
          onClick={handleExploreAll}
        >
          EXPLORE ALL PROGRAMS
        </button>
      </div>
    </section>
  );
}