'use client';

import { useState, useEffect } from 'react';
import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import styles from './LoadingOverlay.module.css';

export default function LoadingOverlay({ nextTheme }) {
  const [isVisible, setIsVisible] = useState(false);
  const [displayTheme, setDisplayTheme] = useState(null);

  useEffect(() => {
    if (nextTheme) {
      // Show immediately when nextTheme is set
      setDisplayTheme(nextTheme);
      setIsVisible(true);
    } else {
      // Delay hiding by 1 second when nextTheme becomes null
      const timer = setTimeout(() => {
        setIsVisible(false);
        setDisplayTheme(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [nextTheme]);

  if (!isVisible || !displayTheme) return null;

  return (
    <div className={`${styles.loadingOverlay} ${displayTheme === 'rainy' ? styles.loadingRainy : styles.loadingSunny}`}>
      <div className={styles.loadingContent}>
        <div className={styles.loadingIconContainer}>
          {displayTheme === 'rainy' ? (
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
          {displayTheme === 'rainy' ? 'Bringing the rain...' : 'Bringing the sunshine...'}
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

