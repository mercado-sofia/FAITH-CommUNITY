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
  const sectionRef = useRef(null);

  // Fetch featured projects from API
  const { 
    data: featuredProjects = [], 
    isLoading 
  } = useGetPublicFeaturedProjectsQuery();

  // Carousel configuration - memoized to prevent recalculation
  const carouselConfig = useMemo(() => {
    if (typeof window === 'undefined') {
      return { cardWidth: 370, gap: 18 }; // Default for SSR
    }
    
    const width = window.innerWidth;
    
    if (width < 768) {
      return {
        cardWidth: 250,
        gap: 10
      };
    } else if (width < 1024) {
      return {
        cardWidth: 290,
        gap: 14
      };
    } else {
      return {
        cardWidth: 370,
        gap: 18
      };
    }
  }, []);

  // Reset index on resize - debounced to prevent excessive calls
  const debouncedResize = useMemo(() => 
    debounce(() => setCurrentIndex(0), 150), 
    []
  );



  // Memoize data transformation to prevent unnecessary recalculations
  const dataToDisplay = useMemo(() => {
    return featuredProjects.map(project => {
      // Use the optimized date processing utility
      const { displayDate, status, dateColor, CalendarIcon } = processProjectDates(project);

      return {
        image: project.image ? 
          getFeaturedProjectImageUrl(project.image)
          : '/samples/sample1.jpg',
        title: project.title || 'Featured Project',
        date: displayDate,
        description: project.description || 'An amazing project making a difference in the community.',
        organization: project.orgAcronym || 'FAITH',
        orgColor: project.orgColor,
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

  // Carousel calculations
  const slideSize = 3;
  const maxIndex = dataToDisplay.length <= slideSize ? 0 : dataToDisplay.length - slideSize;
  const shouldCenter = dataToDisplay.length < 3;

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
    
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    
    window.addEventListener('resize', debouncedResize);
    window.addEventListener('keydown', handleKey);
    
    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('keydown', handleKey);
    };
  }, [handleNext, handlePrev, debouncedResize]);

  // Calculate translateX for carousel sliding
  const translateX = useMemo(() => {
    if (dataToDisplay.length <= slideSize) {
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
              transform: `translateX(-${translateX}px)`,
              gap: `${carouselConfig.gap}px`
            }}
          >
            {dataToDisplay.map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                className={styles.carouselCard}
                style={{ 
                  width: `${carouselConfig.cardWidth}px`,
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
                    className={`${styles.cardBadge} ${!card.orgColor || card.orgColor === '#ffffff' ? styles.cardBadgeTransparent : ''}`}
                    style={{ 
                      backgroundColor: card.orgColor && card.orgColor !== '#ffffff' ? 
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