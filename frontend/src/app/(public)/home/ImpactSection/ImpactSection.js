'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getFeaturedProjectImageUrl } from '@/utils/uploadPaths';
import { processProjectDates } from '../../utils/dateProcessing';
import { debounce } from '../../utils/debounce';
import styles from './ImpactSection.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useGetPublicFeaturedProjectsQuery } from '@/rtk/(public)/programsApi';

// Component for truncated description
const TruncatedDescription = ({ description, maxChars = 150 }) => {
  if (!description) return null;
  
  const truncatedText = description.length <= maxChars 
    ? description 
    : description.slice(0, maxChars) + '...';
  
  return (
    <p className={styles.impactdesc}>
      {truncatedText}
    </p>
  );
};

export default function ImpactSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0);
  const sectionRef = useRef(null);

  // Fetch featured projects from API
  const { 
    data: featuredProjects = [], 
    isLoading 
  } = useGetPublicFeaturedProjectsQuery();

  // Carousel configuration - recalculates when window width changes
  const carouselConfig = useMemo(() => {
    if (typeof window === 'undefined' || windowWidth === 0) {
      return { cardWidth: 450, gap: 22, slideSize: 3 }; // Default for SSR
    }
    
    const width = windowWidth;
    
    if (width < 768) {
      return {
        cardWidth: 350, // Fallback, but CSS handles actual width
        gap: 0,
        slideSize: 1, // Show 1 card at a time on mobile
        usePercentage: true // Flag to use percentage width on mobile
      };
    } else if (width < 1024) {
      return {
        cardWidth: 380,
        gap: 18,
        slideSize: 2 // Show 2 cards on tablet
      };
    } else {
      return {
        cardWidth: 400,
        gap: 20,
        slideSize: 3 // Show 3 cards on desktop
      };
    }
  }, [windowWidth]);

  // Handle window resize - debounced to prevent excessive calls
  const handleResize = useMemo(() => 
    debounce(() => {
      setWindowWidth(window.innerWidth);
      setCurrentIndex(0);
    }, 150), 
    []
  );



  // Memoize data transformation to prevent unnecessary recalculations
  const dataToDisplay = useMemo(() => {
    return featuredProjects.map(project => {
      // Use the optimized date processing utility
      const { displayDate, status, dateColor, CalendarIcon } = processProjectDates(project);

      // Handle organization display for collaborations
      let organizationDisplay = project.orgAcronym || 'FAITH';
      let orgColor = project.orgColor;
      let isCollaborative = false;
      
      if (project.is_collaborative && project.collaborators && project.collaborators.length > 0) {
        // Create collaboration display text
        // Now collaborators array includes both primary and collaborator organizations
        const allOrgAcronyms = project.collaborators.map(collab => collab.organization_acronym).filter(Boolean);
        if (allOrgAcronyms.length > 1) {
          // Multiple organizations involved
          organizationDisplay = allOrgAcronyms.join(' & ');
          isCollaborative = true;
          // Use a special collaboration color instead of org color
          orgColor = '#2D5A87'; // Professional blue color for collaborations
        } else if (allOrgAcronyms.length === 1) {
          // Only one organization (shouldn't happen for collaborative, but handle gracefully)
          organizationDisplay = allOrgAcronyms[0];
        }
      }

      return {
        image: project.image ? 
          getFeaturedProjectImageUrl(project.image)
          : '/samples/sample1.jpg',
        title: project.title || 'Featured Project',
        date: displayDate,
        description: project.description || 'An amazing project making a difference in the community.',
        organization: organizationDisplay,
        orgColor: orgColor,
        isCollaborative: isCollaborative,
        collaborators: project.collaborators || [],
        status,
        dateColor,
        CalendarIcon,
        slug: project.slug || project.id
      };
    });
  }, [featuredProjects]);

  // Reset carousel when data changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [dataToDisplay.length]);

  // Carousel calculations - use dynamic slideSize from config
  const slideSize = carouselConfig.slideSize;
  const maxIndex = dataToDisplay.length <= slideSize ? 0 : dataToDisplay.length - slideSize;
  const shouldCenter = dataToDisplay.length < slideSize;

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev <= 0) {
        return maxIndex; // Loop to the last position
      }
      return prev - 1;
    });
  }, [maxIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => {
      if (prev >= maxIndex) {
        return 0; // Loop back to the beginning
      }
      return prev + 1;
    });
  }, [maxIndex]);

  // Combined effect for better performance
  useEffect(() => {
    setIsClient(true);
    
    // Set initial window width
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth);
    }
    
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    
    window.addEventListener('resize', handleResize);
    window.addEventListener('keydown', handleKey);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKey);
    };
  }, [handleNext, handlePrev, handleResize]);

  // Calculate translateX for carousel sliding
  const translateX = useMemo(() => {
    if (dataToDisplay.length <= slideSize) {
      return 0;
    }
    
    // For mobile single card display, don't translate - let CSS centering handle it
    if (carouselConfig.slideSize === 1) {
      return 0;
    }
    
    const itemWidth = carouselConfig.cardWidth + carouselConfig.gap;
    return currentIndex * itemWidth;
  }, [currentIndex, carouselConfig, dataToDisplay.length, slideSize]);


  if (!isClient || isLoading) {
    return (
      <section ref={sectionRef} className={styles.impactSection}>
        <div className={styles.loaderWrapper}>
          <div className={styles.loader}></div>
        </div>
      </section>
    );
  }

  // If there are no featured projects, don't render the section
  if (dataToDisplay.length === 0) {
    return null;
  }

  return (
    <section ref={sectionRef} className={styles.impactSection}>
      <div className={styles.impactHeading}>
        <p className={styles.subtitle}>Extension Programs</p>
        <h2 className={styles.impactTitle}>
          See The Impact: How do you want to make a difference?
        </h2>
      </div>

      <div className={`${styles.carouselContainer} ${shouldCenter ? styles.centeredContainer : ''}`}>
        {!shouldCenter && (
          <button
            className={`${styles.navButton} ${styles.navButtonPrev}`}
            onClick={handlePrev}
            disabled={currentIndex === 0}
            aria-label="Previous item"
          >
            <FaChevronLeft />
          </button>
        )}

        <div className={styles.carouselWrapper}>
          <div 
            className={`${styles.carouselTrack} ${shouldCenter ? styles.centeredTrack : ''}`}
            style={{ 
              transform: carouselConfig.slideSize === 1 ? 'none' : `translateX(-${translateX}px)`,
              gap: `${carouselConfig.gap}px`
            }}
          >
            {dataToDisplay
              .filter((card, index) => {
                // For mobile single card display, only show the current card
                if (carouselConfig.slideSize === 1) {
                  return index === currentIndex;
                }
                // For multi-card display, show all cards
                return true;
              })
              .map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                className={styles.carouselCard}
                style={{ 
                  width: carouselConfig.usePercentage 
                    ? '100%' // Use CSS for width on mobile via calc()
                    : `${carouselConfig.cardWidth}px`,
                  flexShrink: 0
                }}
              >
                <div className={styles.cardImageContainer}>
                  {card.image && card.image.startsWith('data:') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image}
                      alt={card.title}
                      className={styles.cardImage}
                      loading="lazy"
                    />
                  ) : (
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className={styles.cardImage}
                      sizes={`(max-width: 768px) 280px, (max-width: 1024px) 320px, 400px`}
                      loading={index < 2 ? "eager" : "lazy"}
                      priority={index < 2}
                    />
                  )}
                  <div
                    className={`${styles.cardBadge} ${
                      card.isCollaborative 
                        ? styles.cardBadgeCollaborative 
                        : (!card.orgColor || card.orgColor === '#ffffff' ? styles.cardBadgeTransparent : '')
                    }`}
                    style={{ 
                      backgroundColor: !card.isCollaborative && card.orgColor && card.orgColor !== '#ffffff' ? 
                        `${card.orgColor}CC` :
                        'transparent' 
                    }}
                  >
                    {card.organization}
                  </div>
                </div>
                <div className={styles.cardContent}>
                  <h3 className={styles.cardTitle}>
                    <Link href={`/programs/${card.slug}`} className={styles.titleLink}>
                      {card.title}
                    </Link>
                  </h3>
                  <p className={styles.cardDate} style={{ color: card.dateColor }}>
                    <card.CalendarIcon className={styles.dateIcon} />
                    {card.date}
                  </p>
                  <TruncatedDescription description={card.description} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {!shouldCenter && (
          <button
            className={`${styles.navButton} ${styles.navButtonNext}`}
            onClick={handleNext}
            disabled={currentIndex >= maxIndex}
            aria-label="Next item"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </section>
  );
}