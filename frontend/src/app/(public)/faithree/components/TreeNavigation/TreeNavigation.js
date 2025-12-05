'use client';

import { FiChevronLeft, FiChevronRight, FiStar, FiClock } from 'react-icons/fi';
import styles from './TreeNavigation.module.css';

function TreeNavigation({ 
  currentIndex = 0, 
  totalTrees = 0, 
  onPrevious, 
  onNext,
  theme = 'morning',
  totalHighlights = 0
}) {
  const CHUNK_SIZE = 12;
  const hasMoreTrees = totalHighlights > CHUNK_SIZE;
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex < totalTrees - 1;
  
  // Calculate remaining highlights
  const currentTreeStart = currentIndex * CHUNK_SIZE;
  const nextTreeHighlights = canGoNext ? Math.min(CHUNK_SIZE, totalHighlights - (currentTreeStart + CHUNK_SIZE)) : 0;

  // Don't show navigation if there's only one tree or no trees
  if (totalTrees <= 1 && !hasMoreTrees) {
    return null;
  }

  return (
    <div className={styles.navigationWrapper}>
      {/* Text indication for more trees - shows when there are more than 12 highlights */}
      {hasMoreTrees && (
        <div 
          className={`${styles.treeIndicator} ${styles[`treeIndicator${theme.charAt(0).toUpperCase() + theme.slice(1)}`]} ${!canGoNext ? styles.treeIndicatorPrevious : ''}`}
        >
          {canGoNext ? (
            <div className={styles.indicatorContent}>
              <FiStar className={styles.indicatorIcon} aria-hidden="true" />
              <div className={styles.indicatorTextWrapper}>
                <span className={styles.indicatorTextMain}>
                  More highlights await
                </span>
                <span className={styles.indicatorTextSub}>
                  {nextTreeHighlights} {nextTreeHighlights === 1 ? 'story' : 'stories'} waiting to be discovered →
                </span>
              </div>
            </div>
          ) : (
            <div className={styles.indicatorContent}>
              <FiClock className={styles.indicatorIcon} aria-hidden="true" />
              <div className={styles.indicatorTextWrapper}>
                <span className={styles.indicatorTextMain}>
                  More highlights behind you
                </span>
                <span className={styles.indicatorTextSub}>
                  ← Explore previous trees
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      {totalTrees > 1 && (
        <div className={styles.navButtonsContainer}>
          <button
            className={`${styles.navButton} ${styles.navButtonPrevious} ${styles[`navButton${theme.charAt(0).toUpperCase() + theme.slice(1)}`]} ${!canGoPrevious ? styles.navButtonDisabled : ''}`}
            onClick={onPrevious}
            disabled={!canGoPrevious}
            aria-label="Previous tree"
            title="Previous tree"
          >
            <FiChevronLeft className={styles.navButtonIcon} aria-hidden="true" />
          </button>

          <button
            className={`${styles.navButton} ${styles.navButtonNext} ${styles[`navButton${theme.charAt(0).toUpperCase() + theme.slice(1)}`]} ${!canGoNext ? styles.navButtonDisabled : ''}`}
            onClick={onNext}
            disabled={!canGoNext}
            aria-label="Next tree"
            title="Next tree"
          >
            <FiChevronRight className={styles.navButtonIcon} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  )
}

export default TreeNavigation