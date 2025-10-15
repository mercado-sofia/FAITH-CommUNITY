'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import styles from './OrgAdviserSection.module.css';
import { FaChevronLeft, FaChevronRight, FaFacebookF, FaEnvelope, FaPlus } from 'react-icons/fa';
import { usePublicOrganizationAdvisers } from '../../hooks/usePublicData';
import Loader from '../../../../components/ui/Loader/Loader';

export default function OrgAdviserSection() {
  const { organizationAdvisers, isLoading } = usePublicOrganizationAdvisers();
  const [startIndex, setStartIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(4);
  const [cardWidth, setCardWidth] = useState(240);
  const [cardGap, setCardGap] = useState(24);

  // Responsive config
  useEffect(() => {
    const updateResponsiveValues = () => {
      const width = window.innerWidth;

      if (width < 640) {
        setCardWidth(220);
        setCardGap(16);
        setVisibleCount(1);
      } else if (width < 964) {
        setCardWidth(240);
        setCardGap(20);
        setVisibleCount(2);
      } else if (width < 1160) {
        setCardWidth(240);
        setCardGap(24);
        setVisibleCount(3);
      } else {
        setCardWidth(240);
        setCardGap(24);
        setVisibleCount(4);
      }
    };

    updateResponsiveValues();
    window.addEventListener('resize', updateResponsiveValues);
    return () => window.removeEventListener('resize', updateResponsiveValues);
  }, []);

  // Navigation handlers using useCallback - move 1 card at a time
  const handlePrev = useCallback(() => {
    setStartIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleNext = useCallback(() => {
    setStartIndex((prev) =>
      Math.min(prev + 1, organizationAdvisers.length - visibleCount)
    );
  }, [visibleCount, organizationAdvisers.length]);

  // Determine if navigation should be shown (5+ cards)
  const shouldShowNavigation = organizationAdvisers.length >= 5;

  // Reset startIndex when navigation state changes
  useEffect(() => {
    setStartIndex(0);
  }, [shouldShowNavigation]);

  // Keyboard nav effect (only when navigation is shown)
  useEffect(() => {
    if (!shouldShowNavigation) return;
    
    const handleKey = (e) => {
      if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleNext, handlePrev, shouldShowNavigation]);

  const translateX = startIndex * (cardWidth + cardGap);

  // Show loading state
  if (isLoading) {
    return (
      <section className={styles.orgAdviserSection}>
        <div className={styles.orgAdviserHeading}>
          <h2 className={styles.orgAdviserTitle}>Meet Our Organization Advisers</h2>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
          <Loader small />
        </div>
      </section>
    );
  }


  // Hide section if no advisers data
  if (!organizationAdvisers || organizationAdvisers.length === 0) {
    return null;
  }

  return (
    <section className={styles.orgAdviserSection}>
      <div className={styles.orgAdviserHeading}>
        <h2 className={styles.orgAdviserTitle}>Meet Our Organization Advisers</h2>
      </div>

      <div className={`${styles.orgAdviserCarousel} ${shouldShowNavigation ? styles.withNavigation : styles.withoutNavigation}`}>
        {shouldShowNavigation && (
          <button
            className={styles.orgAdviserNavBtn}
            onClick={handlePrev}
            disabled={startIndex === 0}
            aria-label="Scroll Left"
          >
            <FaChevronLeft />
          </button>
        )}

        <div className={`${styles.orgAdviserSliderWrapper} ${shouldShowNavigation ? styles.withNavigation : styles.withoutNavigation}`}>
          <div
            className={styles.orgAdviserSliderTrack}
            style={{ 
              transform: shouldShowNavigation ? `translateX(-${translateX}px)` : 'none',
              justifyContent: shouldShowNavigation ? 'flex-start' : 'center'
            }}
          >
            {organizationAdvisers.map((adviser) => (
              <div className={styles.orgAdviserCard} key={adviser.id}>
                <div className={styles.orgAdviserPhotoWrapper}>
                  <Image
                    src={adviser.photo || '/defaults/default-profile.png'}
                    alt={adviser.name}
                    className={styles.orgAdviserImage}
                    fill
                    sizes="(max-width: 640px) 220px, 240px"
                    onError={(e) => {
                      e.target.src = '/defaults/default-profile.png';
                    }}
                  />
                  <div className={styles.orgAdviserOverlay}>
                    {adviser.facebook && adviser.facebook.startsWith('http') && (
                      <a
                        href={adviser.facebook}
                        target="_blank"
                        rel="noreferrer noopener"
                        className={styles.orgAdviserIcon}
                      >
                        <FaFacebookF />
                      </a>
                    )}
                    <button className={`${styles.orgAdviserIcon} ${styles.orgAdviserMainIcon}`}>
                      <FaPlus />
                    </button>
                    {adviser.email && (
                      <a href={`mailto:${adviser.email}`} className={styles.orgAdviserIcon}>
                        <FaEnvelope />
                      </a>
                    )}
                  </div>
                </div>
                <p className={styles.orgAdviserName}>{adviser.name}</p>
                <p className={styles.orgAdviserRole}>{adviser.role}</p>
                {adviser.organization_name && (
                  <p className={styles.orgAdviserOrg}>{adviser.organization_name}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {shouldShowNavigation && (
          <button
            className={styles.orgAdviserNavBtn}
            onClick={handleNext}
            disabled={startIndex >= organizationAdvisers.length - visibleCount}
            aria-label="Scroll Right"
          >
            <FaChevronRight />
          </button>
        )}
      </div>
    </section>
  );
}