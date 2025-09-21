'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { usePublicPrograms } from '../../../hooks/usePublicData';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './FeaturedProjects.module.css';

export default function FeaturedProjects({ orgID }) {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        JSON.parse(storedUserData);
        setIsLoggedIn(true);
      } catch (error) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    }
  }, []);

  // Fetch programs for this organization
  const { programs, isLoading, error } = usePublicPrograms(orgID);

  // Filter programs to only show approved ones and limit to 6
  const approvedPrograms = programs
    .filter(program => 
      program.status === 'Upcoming' || program.status === 'Active' || program.status === 'Completed'
    )
    .slice(0, 6);

  const handleButtonClick = (program, isApplyButton = false) => {
    // If it's an "Apply Now" button for an upcoming program
    if (isApplyButton && program.status === 'Upcoming') {
      if (!isLoggedIn) {
        // Show login modal for non-authenticated users
        window.dispatchEvent(new CustomEvent('showLoginModal'));
      } else {
        // Navigate to apply page with pre-selected program
        router.push(`/apply?program=${program.id}`);
      }
    } else {
      // Default behavior - navigate to program details
      router.push(`/programs/${program.slug || program.id}`);
    }
  };

  const handleExploreAll = () => {
    router.push('/programs');
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
              {approvedPrograms.map((program, index) => {
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
                          onClick={() => handleButtonClick(program, isUpcoming)}
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