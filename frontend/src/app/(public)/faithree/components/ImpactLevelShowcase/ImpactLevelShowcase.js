'use client';

import styles from './ImpactLevelShowcase.module.css';

function ImpactLevelShowcase({ theme = 'morning' }) {

  return (
    <div className={`${styles.showcaseWrapper} ${styles[`showcase${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
      {/* Container - always visible */}
      <div className={`${styles.showcaseContainer} ${styles[`showcase${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
        <div className={styles.showcaseHeader}>
          <span className={styles.showcaseTitle}>Impact Level</span>
        </div>
        
        <div className={styles.showcaseContent}>
          {/* High Impact */}
          <div className={styles.impactLevelItem}>
            <div className={styles.starContainer}>
              <span className={`${styles.starEmoji} ${styles.starHigh}`}>⭐</span>
            </div>
            <div className={styles.impactLabel}>
              <span className={styles.impactLevelName}>High Impact</span>
              <span className={styles.impactDescription}>Glowing star</span>
            </div>
          </div>

          {/* Average Impact */}
          <div className={styles.impactLevelItem}>
            <div className={styles.starContainer}>
              <span className={`${styles.starEmoji} ${styles.starAverage}`}>⭐</span>
            </div>
            <div className={styles.impactLabel}>
              <span className={styles.impactLevelName}>Average Impact</span>
              <span className={styles.impactDescription}>Brighter star</span>
            </div>
          </div>

          {/* Small Impact */}
          <div className={styles.impactLevelItem}>
            <div className={styles.starContainer}>
              <span className={`${styles.starEmoji} ${styles.starSmall}`}>⭐</span>
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

