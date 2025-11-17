'use client';

import { useEffect, useState } from 'react';
import styles from './PageLoadingOverlay.module.css';

export default function PageLoadingOverlay({ isLoading }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);

  useEffect(() => {
    if (!isLoading && isVisible) {
      // Start fade out animation
      setIsAnimatingOut(true);
      // Hide after animation completes
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [isLoading, isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`${styles.pageLoadingOverlay} ${isAnimatingOut ? styles.fadeOut : ''}`}>
      <div className={styles.loadingContent}>
        {/* Simple creative loading spinner - circular dots */}
        <div className={styles.loaderContainer}>
          <div className={styles.loader}>
            {[...Array(8)].map((_, i) => (
              <div 
                key={i} 
                className={styles.loaderCircle}
                style={{ '--index': i }}
              ></div>
            ))}
          </div>
        </div>

        {/* Loading text */}
        <div className={styles.loadingTextContainer}>
          <h2 className={styles.loadingTitle}>Loading FAITHree</h2>
          <p className={styles.loadingSubtitle}>Preparing your experience...</p>
        </div>
      </div>
    </div>
  );
}

