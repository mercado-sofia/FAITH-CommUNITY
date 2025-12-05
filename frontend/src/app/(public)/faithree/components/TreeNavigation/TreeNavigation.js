'use client';

import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import styles from './TreeNavigation.module.css';

function TreeNavigation({ 
  currentIndex = 0, 
  totalTrees = 0, 
  onPrevious, 
  onNext,
  theme = 'morning' 
}) {
  // Don't show navigation if there's only one tree or no trees
  if (totalTrees <= 1) {
    return null
  }

  const canGoPrevious = currentIndex > 0
  const canGoNext = currentIndex < totalTrees - 1

  return (
    <div className={styles.navigationWrapper}>
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
  )
}

export default TreeNavigation