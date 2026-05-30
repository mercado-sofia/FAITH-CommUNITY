'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePublicPrograms } from '@/hooks/(public)/usePublicData';
import { resolveDisplayImageUrl, isUnavailableImage } from '@/utils/shared/uploadPaths';
import { getProgramStatusByDates } from '@/utils/shared/programStatusUtils';
import styles from './FeaturedProjects.module.css';

export default function FeaturedProjects({ orgID }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check user authentication status
  useEffect(() => {
    // Check for window to avoid SSR errors
    if (typeof window === 'undefined') return;
    
    const checkAuth = async () => {
      // Check authentication using the auth service instead of localStorage
      try {
        const { getCurrentUser } = await import('@/utils/shared/authService');
        const user = await getCurrentUser();
        if (user) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        // User is not authenticated
        setIsLoggedIn(false);
      }
    };
    
    checkAuth();
  }, []);

  // Fetch programs for this organization
  const { programs, isLoading, error } = usePublicPrograms(orgID);


  // Filter programs to only show approved ones and limit to 6
  const approvedPrograms = programs
    .filter(program => {
      const calculatedStatus = getProgramStatusByDates(program);
      return calculatedStatus === 'Upcoming' || calculatedStatus === 'Active' || calculatedStatus === 'Completed';
    })
    .slice(0, 6);

  const handleButtonClick = (program, isApplyButton = false) => {
    const calculatedStatus = getProgramStatusByDates(program);
    // If it's an "Apply Now" button for an upcoming program
    if (isApplyButton && calculatedStatus === 'Upcoming') {
      // Check if program accepts volunteers
      // Handle both boolean and numeric values (0/1 from database)
      const acceptsVolunteers = program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0';
      
      if (!acceptsVolunteers) {
        // Program doesn't accept volunteers, just navigate to details
        router.push(`/programs/${program.slug || program.id}`);
        return;
      }
      
      // Always navigate to /apply page (with program parameter)
      router.push(`/apply?program=${program.id}`);
      // Show modal if not logged in
      if (!isLoggedIn && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('showLoginModal'));
      }
    } else {
      // Default behavior - navigate to program details
      router.push(`/programs/${program.slug || program.id}`);
    }
  };

  const handleExploreAll = () => {
    router.push('/programs');
  };


  // Get image URL for program — prefer local sample assets from fallback data
  const getProgramImage = (program) => {
    const fallback = '/samples/sample2.jpg';
    if (!program.image) return fallback;
    const resolved = resolveDisplayImageUrl(program.image, { kind: 'program', fallback });
    return isUnavailableImage(resolved) ? fallback : resolved;
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
        <div>
          <p className={styles.subheading}>Together, We Made These Happen</p>
          <h2 className={styles.heading}>Featured Projects</h2>
        </div>
        
        <div className={styles.programsGridContainer}>
          <div className={styles.programsGrid}>
              {approvedPrograms.map((program, index) => {
                const calculatedStatus = getProgramStatusByDates(program);
                const isUpcoming = calculatedStatus === 'Upcoming';
                const isCompleted = calculatedStatus === 'Completed';
                const isActive = calculatedStatus === 'Active';
                
                const getActionButtonText = () => {
                  if (isUpcoming) {
                    // Check if program accepts volunteers
                    // Handle both boolean and numeric values (0/1 from database)
                    const acceptsVolunteers = program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0';
                    return acceptsVolunteers ? 'Apply Now' : 'Learn More';
                  }
                  return 'Learn More';
                };
                
                const getStatusText = () => {
                  if (isUpcoming) return 'Learn More';
                  if (isCompleted) return 'Completed';
                  if (isActive) return 'Active';
                  return 'Learn More';
                };
                
                const getActionButtonClass = () => {
                  if (isUpcoming && program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0') return styles.programActionButton;
                  return `${styles.programActionButton} ${styles.learnMore}`;
                };

                return (
                  <div 
                    key={program.id} 
                    className={`${styles.programCard} ${index === 0 && approvedPrograms.length > 3 ? styles.featured : ''}`}
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
                          onClick={() => handleButtonClick(program, isUpcoming && program.accepts_volunteers !== false && program.accepts_volunteers !== 0 && program.accepts_volunteers !== '0')}
                        >
                          {getActionButtonText()}
                        </button>
                        {isUpcoming ? (
                          <span 
                            className={`${styles.programStatusText} ${styles.statusOrange} ${styles.clickableText}`}
                            onClick={() => handleButtonClick(program, false)}
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