'use client';

import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import styles from './LoadingOverlay.module.css';

export default function LoadingOverlay({ nextTheme }) {
  if (!nextTheme) return null;

  return (
    <div className={`${styles.loadingOverlay} ${nextTheme === 'rainy' ? styles.loadingRainy : styles.loadingSunny}`}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingIconContainer}>
          {nextTheme === 'rainy' ? (
            <>
              <IoRainyOutline className={styles.loadingIcon} aria-hidden="true" />
              <div className={styles.loadingSparkles}>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className={styles.sparkle} style={{ '--delay': `${i * 0.1}s` }}></div>
                ))}
              </div>
            </>
          ) : (
            <>
              <FiSun className={styles.loadingIcon} aria-hidden="true" />
              <div className={styles.loadingRays}>
                {[...Array(8)].map((_, i) => (
                  <div key={i} className={styles.ray} style={{ '--rotation': `${i * 45}deg` }}></div>
                ))}
              </div>
            </>
          )}
        </div>
        <p className={styles.loadingText}>
          {nextTheme === 'rainy' ? 'Bringing the rain...' : 'Bringing the sunshine...'}
        </p>
        <div className={styles.loadingDots}>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    </div>
  );
}

