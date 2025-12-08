'use client';

import Image from 'next/image';
import styles from './ImpactLevelShowcase.module.css';

function ImpactLevelShowcase({ theme = 'morning', hideHeader = false }) {

  return (
    <div className={`${styles.showcaseWrapper} ${styles[`showcase${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
      {/* Container - always visible */}
      <div className={`${styles.showcaseContainer} ${styles[`showcase${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
        {!hideHeader && (
          <div className={styles.showcaseHeader}>
            <span className={styles.showcaseTitle}>Impact Level</span>
          </div>
        )}
        
        <div className={styles.showcaseContent}>
          {/* High Impact */}
          <div className={styles.impactLevelItem}>
            <div className={`${styles.starContainer} ${styles.starHigh}`}>
              <Image 
                src="/assets/icons/high.svg" 
                alt="High Impact" 
                width={48} 
                height={48}
                className={styles.starIcon}
              />
            </div>
            <div className={styles.impactLabel}>
              <span className={styles.impactLevelName}>High Impact</span>
              <span className={styles.impactDescription}>Glowing star</span>
            </div>
          </div>

          {/* Average Impact */}
          <div className={styles.impactLevelItem}>
            <div className={`${styles.starContainer} ${styles.starAverage}`}>
              <Image 
                src="/assets/icons/average.svg" 
                alt="Average Impact" 
                width={48} 
                height={48}
                className={styles.starIcon}
              />
            </div>
            <div className={styles.impactLabel}>
              <span className={styles.impactLevelName}>Average Impact</span>
              <span className={styles.impactDescription}>Brighter star</span>
            </div>
          </div>

          {/* Small Impact */}
          <div className={styles.impactLevelItem}>
            <div className={`${styles.starContainer} ${styles.starSmall}`}>
              <Image 
                src="/assets/icons/small.svg" 
                alt="Small Impact" 
                width={48} 
                height={48}
                className={styles.starIcon}
              />
            </div>
            <div className={styles.impactLabel}>
              <span className={styles.impactLevelName}>Small Impact</span>
              <span className={styles.impactDescription}>Normal star</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ImpactLevelShowcase;