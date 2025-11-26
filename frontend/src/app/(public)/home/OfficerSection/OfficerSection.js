'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import styles from './OfficerSection.module.css';
import { usePublicHeadsFaces } from '@/hooks/(public)/usePublicData';
import Loader from '../../../../components/ui/Loader/Loader';
import { useFadeIn } from '@/hooks/(public)/useFadeIn';

export default function OfficerSection() {
  const { headsFacesData, isLoading } = usePublicHeadsFaces();
  const { ref: cardRef, isVisible: isCardVisible } = useFadeIn({ rootMargin: '0px 0px -100px 0px' });
  const [forceVisible, setForceVisible] = useState(false);

  // headsFacesData is now a single head object or null
  const primaryAdviser = headsFacesData;

  // Fallback: Force visibility after data loads and a reasonable delay
  // This ensures the card appears even if IntersectionObserver doesn't trigger
  // This is especially important on the homepage where the section might be below the fold
  // The useFadeIn hook has its own fallback (1500ms), but this provides an additional safety net
  useEffect(() => {
    // Reset forceVisible when card becomes visible through normal fade-in
    if (isCardVisible && forceVisible) {
      setForceVisible(false);
      return;
    }

    // Only set timeout if data is loaded, adviser exists, card is not visible, and not already forced
    if (!isLoading && primaryAdviser && !isCardVisible && !forceVisible) {
      // Wait for the useFadeIn hook's fallback (1500ms) plus a bit more
      const timeoutId = setTimeout(() => {
        // Force visibility if IntersectionObserver hasn't triggered yet
        setForceVisible(true);
      }, 2500); // Wait 2.5 seconds after data loads

      return () => clearTimeout(timeoutId);
    }
  }, [isLoading, primaryAdviser, isCardVisible, forceVisible]);

  // Show loading state
  if (isLoading) {
    return (
      <section className={styles.officerSection}>
        <div className={styles.officerHeading}>
          <p className={styles.officerSubtitle}>Community Extension Committee</p>
          <h2 className={styles.officerTitle}>Meet Our Adviser</h2>
        </div>
        <div className={styles.loaderContainer}>
          <Loader small />
        </div>
      </section>
    );
  }


  // Don't render if no adviser data
  if (!primaryAdviser) {
    return null;
  }

  return (
    <section className={styles.officerSection}>
      <div className={styles.officerHeading}>
        <p className={styles.officerSubtitle}>Community Extension Committee</p>
        <h2 className={styles.officerTitle}>Meet Our Adviser</h2>
      </div>

      <div className={styles.portfolioContainer}>
        <div ref={cardRef} className={`${styles.portfolioCard} ${(isCardVisible || forceVisible) ? styles.fadeIn : ''}`}>
          {/* Main content */}
          <div className={styles.portfolioContent}>
            {/* Left side - Text content */}
            <div className={styles.textContent}>
              <div className={styles.nameRoleWrapper}>
                <div className={styles.greeting}>
                  <h1 className={styles.adviserName}>{primaryAdviser.name}</h1>
                </div>
                
                <div className={styles.roleContainer}>
                  <span className={styles.roleText}>{primaryAdviser.position}</span>
                </div>
              </div>

              {primaryAdviser.description && (
                <p className={styles.description}>
                  {primaryAdviser.description}
                </p>
              )}

            </div>

            {/* Right side - Image */}
            <div className={styles.imageContainer}>
              <div className={styles.imageWrapper}>
                <Image
                  src={primaryAdviser.image_url || "/defaults/default-profile.png"}
                  alt={primaryAdviser.name}
                  fill
                  className={styles.adviserImage}
                  sizes="450px"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}