'use client';

import { useEffect, useState } from 'react';
import styles from './PageLoadingOverlay.module.css';

export default function PageLoadingOverlay({ isLoading }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (isLoading) {
      // Reset state when loading starts (prevents flickering when loading toggles)
      setIsVisible(true);
    } else {
      // Hide immediately when loading stops
      setIsVisible(false);
    }
  }, [isLoading]);

  if (!isVisible) return null;

  return (
    <div className={styles.pageLoadingOverlay}>
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