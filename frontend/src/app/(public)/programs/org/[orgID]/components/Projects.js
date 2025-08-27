'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { usePublicPrograms } from '../../../../../../hooks/usePublicData';
import { getProgramImageUrl } from '../../../../../../utils/uploadPaths';
import styles from '../../org.module.css';

export default function FeaturedProjects({ orgID }) {
  const router = useRouter();
  const carouselRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  // Fetch programs for this organization
  const { programs, isLoading, error } = usePublicPrograms(orgID);

  // Filter programs to only show approved ones
  const approvedPrograms = programs.filter(program => 
    program.status === 'Upcoming' || program.status === 'Active' || program.status === 'Completed'
  );

  const cardsPerView = 5; // Number of cards visible at once
  const maxIndex = Math.max(0, approvedPrograms.length - cardsPerView);

  // Update arrow visibility based on current index
  useEffect(() => {
    setShowLeftArrow(currentIndex > 0);
    setShowRightArrow(currentIndex < maxIndex);
  }, [currentIndex, maxIndex]);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < maxIndex) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleCardClick = (programId) => {
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
        
        <div className={styles.programsCarouselContainer}>
          {/* Left Navigation Arrow */}
          {showLeftArrow && (
            <button 
              className={styles.carouselArrow} 
              onClick={handlePrevious}
              aria-label="Previous programs"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {/* Programs Carousel */}
          <div className={styles.programsCarousel} ref={carouselRef}>
            <div 
              className={styles.programsCarouselTrack}
              style={{
                transform: `translateX(-${currentIndex * (100 / cardsPerView)}%)`
              }}
            >
              {approvedPrograms.map((program) => (
                <div 
                  key={program.id} 
                  className={styles.programCard}
                  onClick={() => handleCardClick(program.id)}
                >
                  <div className={styles.programImageContainer}>
                    <Image
                      src={getProgramImage(program)}
                      alt={program.title}
                      width={280}
                      height={160}
                      className={styles.programImage}
                    />
                  </div>
                  <div className={styles.programInfo}>
                    <h4 className={styles.programTitle}>{program.title}</h4>
                    <p className={styles.programYear}>{getProgramYear(program)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Navigation Arrow */}
          {showRightArrow && (
            <button 
              className={styles.carouselArrow} 
              onClick={handleNext}
              aria-label="Next programs"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
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