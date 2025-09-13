'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getFeaturedProjectImageUrl } from '@/utils/uploadPaths';
import styles from './ImpactSection.module.css';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { LuCalendarCheck2 } from "react-icons/lu";
import { FiCalendar } from "react-icons/fi";
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
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  // Fetch featured projects from API
  const { 
    data: featuredProjects = [], 
    isLoading, 
    error 
  } = useGetPublicFeaturedProjectsQuery();

  // Carousel configuration
  const getCarouselConfig = useCallback(() => {
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

  // Reset index on resize
  const handleResize = useCallback(() => {
    setCurrentIndex(0);
  }, []);

  // Intersection Observer for better scroll performance
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px 0px'
      }
    );

    const currentSectionRef = sectionRef.current;
    if (currentSectionRef) {
      observer.observe(currentSectionRef);
    }

    return () => {
      if (currentSectionRef) {
        observer.unobserve(currentSectionRef);
      }
    };
  }, []);

  useEffect(() => {
    setIsClient(true);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Memoize data transformation to prevent unnecessary recalculations
  const dataToDisplay = useMemo(() => {
    return featuredProjects.map(project => {
      // Determine the best date to display and program status
      let displayDate = 'Coming Soon';
      let status = 'upcoming';
      let dateColor = '#15803d'; // Default upcoming color
      let CalendarIcon = FiCalendar; // Default upcoming icon
      
      const now = new Date();
      const startDate = project.eventStartDate ? new Date(project.eventStartDate) : null;
      const endDate = project.eventEndDate ? new Date(project.eventEndDate) : null;
      
      // Check for multiple dates first
      if (project.multiple_dates && Array.isArray(project.multiple_dates) && project.multiple_dates.length > 0) {
        // For multiple dates, show the soonest upcoming date
        const upcomingDates = project.multiple_dates
          .map(date => new Date(date))
          .filter(date => date >= now)
          .sort((a, b) => a - b);
        
        if (upcomingDates.length > 0) {
          status = 'upcoming';
          displayDate = upcomingDates[0].toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          dateColor = '#15803d';
          CalendarIcon = FiCalendar;
        } else {
          // All dates are in the past
          status = 'completed';
          const lastDate = project.multiple_dates
            .map(date => new Date(date))
            .sort((a, b) => b - a)[0];
          displayDate = lastDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          dateColor = '#475569';
          CalendarIcon = LuCalendarCheck2;
        }
      } else if (startDate && endDate) {
        // Check if it's a single-day event
        const isSingleDay = startDate.toDateString() === endDate.toDateString();
        
        if (isSingleDay) {
          // Single-day event - show only one date
          if (now > endDate) {
            status = 'completed';
            displayDate = startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
            dateColor = '#475569';
            CalendarIcon = LuCalendarCheck2;
          } else if (now >= startDate && now <= endDate) {
            status = 'active';
            displayDate = 'Currently Active';
            dateColor = '#e77b2d';
            CalendarIcon = FiCalendar;
          } else {
            status = 'upcoming';
            displayDate = startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            });
            dateColor = '#15803d';
            CalendarIcon = FiCalendar;
          }
        } else {
          // Multi-day event - show date range
          if (now > endDate) {
            status = 'completed';
            displayDate = `${startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })} - ${endDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}`;
            dateColor = '#475569';
            CalendarIcon = LuCalendarCheck2;
          } else if (now >= startDate && now <= endDate) {
            status = 'active';
            displayDate = 'Currently Active';
            dateColor = '#e77b2d';
            CalendarIcon = FiCalendar;
          } else {
            status = 'upcoming';
            displayDate = `${startDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })} - ${endDate.toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'short', 
              day: 'numeric' 
            })}`;
            dateColor = '#15803d';
            CalendarIcon = FiCalendar;
          }
        }
      } else if (startDate) {
        // Single start date
        if (now >= startDate) {
          status = 'active';
          displayDate = 'Currently Active';
          dateColor = '#e77b2d';
          CalendarIcon = FiCalendar;
        } else {
          status = 'upcoming';
          displayDate = startDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          dateColor = '#15803d';
          CalendarIcon = FiCalendar;
        }
      } else if (endDate) {
        // Single end date
        if (now > endDate) {
          status = 'completed';
          displayDate = endDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          dateColor = '#475569';
          CalendarIcon = LuCalendarCheck2;
        } else {
          status = 'upcoming';
          displayDate = endDate.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
          });
          dateColor = '#15803d';
          CalendarIcon = FiCalendar;
        }
      }

      return {
        image: project.image ? 
          getFeaturedProjectImageUrl(project.image)
          : '/sample/sample1.jpg',
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
  const carouselConfig = getCarouselConfig();
  const slideSize = 3;
  const maxIndex = dataToDisplay.length <= slideSize ? 0 : dataToDisplay.length - slideSize;

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

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, handlePrev]);

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
  if (error || dataToDisplay.length === 0) {
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

      <div className={styles.carouselContainer}>
        <button
          className={`${styles.navButton} ${styles.navButtonPrev}`}
          onClick={handlePrev}
          disabled={currentIndex === 0}
          aria-label="Previous item"
        >
          <FaChevronLeft />
        </button>

        <div className={styles.carouselWrapper}>
          <div 
            className={styles.carouselTrack}
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
                      loading={isVisible ? 'eager' : 'lazy'}
                    />
                  ) : (
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className={styles.cardImage}
                      sizes={`(max-width: 768px) 280px, (max-width: 1024px) 320px, 400px`}
                      loading={isVisible ? 'eager' : 'lazy'}
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

        <button
          className={`${styles.navButton} ${styles.navButtonNext}`}
          onClick={handleNext}
          disabled={currentIndex >= maxIndex}
          aria-label="Next item"
        >
          <FaChevronRight />
        </button>
      </div>
    </section>
  );
}