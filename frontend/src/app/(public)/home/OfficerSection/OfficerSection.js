'use client';

import Image from 'next/image';
import styles from './OfficerSection.module.css';
import { usePublicHeadsFaces } from '../../hooks/usePublicData';
import Loader from '../../../../components/ui/Loader/Loader';

export default function OfficerSection() {
  const { headsFacesData, isLoading } = usePublicHeadsFaces();

  // headsFacesData is now a single head object or null
  const primaryAdviser = headsFacesData;

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
        <div className={styles.portfolioCard}>
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