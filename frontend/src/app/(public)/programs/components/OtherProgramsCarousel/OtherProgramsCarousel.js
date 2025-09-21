'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { getProgramImageUrl } from '@/utils/uploadPaths';
import styles from './OtherProgramsCarousel.module.css';

export default function OtherProgramsCarousel({ programs, organizationName }) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  if (!programs || programs.length === 0) {
    return null;
  }

  const handleProgramClick = (program) => {
    if (program.slug) {
      router.push(`/programs/${program.slug}`);
    }
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : programs.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < programs.length - 1 ? prev + 1 : 0));
  };

  const showNavigation = programs.length > 1;

  return (
    <div className={styles.carouselContainer}>
      <div className={styles.carouselHeader}>
        <h3 className={styles.carouselTitle}>
          Other Programs from {organizationName}
        </h3>
        <div className={styles.carouselInfo}>
          <span className={styles.programsCount}>
            {programs.length} {programs.length === 1 ? 'program' : 'programs'}
          </span>
          {showNavigation && (
            <div className={styles.carouselControls}>
              <button 
                className={styles.controlButton}
                onClick={handlePrev}
                aria-label="Previous programs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,18 9,12 15,6"></polyline>
                </svg>
              </button>
              <button 
                className={styles.controlButton}
                onClick={handleNext}
                aria-label="Next programs"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9,18 15,12 9,6"></polyline>
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className={styles.carouselWrapper}>
        <div 
          className={styles.carouselTrack}
          style={{ 
            transform: `translateX(-${currentIndex * 100}%)`
          }}
        >
          {programs.map((program) => (
            <div key={program.id} className={styles.carouselSlide}>
              <div 
                className={styles.programCard}
                onClick={() => handleProgramClick(program)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleProgramClick(program);
                  }
                }}
                aria-label={`View ${program.title} program details`}
              >
                {program.image && (
                  <div className={styles.programImageContainer}>
                    <Image
                      src={getProgramImageUrl(program.image)}
                      alt={program.title}
                      width={300}
                      height={200}
                      className={styles.programImage}
                    />
                    <div className={styles.programOverlay}>
                      <span className={styles.viewDetails}>View Details</span>
                    </div>
                  </div>
                )}
                
                <div className={styles.programContent}>
                  <h4 className={styles.programTitle}>{program.title}</h4>
                  <p className={styles.programDescription}>
                    {program.description?.length > 120 
                      ? `${program.description.substring(0, 120)}...` 
                      : program.description
                    }
                  </p>
                  
                  <div className={styles.programMeta}>
                    <span className={`${styles.statusBadge} ${styles[`status${program.status}`]}`}>
                      {program.status}
                    </span>
                    <span className={styles.programCategory}>{program.category}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showNavigation && (
        <div className={styles.carouselDots}>
          {programs.map((_, index) => (
            <button
              key={index}
              className={`${styles.dot} ${index === currentIndex ? styles.activeDot : ''}`}
              onClick={() => setCurrentIndex(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
