'use client'

import { createPortal } from 'react-dom'
import styles from './StarPreviewOverlay.module.css'

export default function StarPreviewOverlay({ highlight, isVisible }) {
  // Overlay position is fixed via CSS (left: 1000px, top: 130px)

  if (!highlight || !isVisible || typeof document === 'undefined' || !document.body) {
    return null
  }

  const overlayContent = (
    <div
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}
    >
      {/* Preview Label */}
      <div className={styles.previewLabel}>
        Preview
      </div>

      {/* Content Container */}
      <div className={styles.content}>
        {/* Highlight Title */}
        <div className={styles.titleSection}>
          <h3 className={styles.title}>
            {highlight.title || 'Featured Highlight'}
          </h3>
        </div>

        {/* Impact Level Indicator (optional visual cue) */}
        {highlight.impact_level && (
          <div className={styles.impactIndicator}>
            <span className={`${styles.impactValue} ${styles[`impact${highlight.impact_level.charAt(0).toUpperCase() + highlight.impact_level.slice(1)}`]}`}>
              {highlight.impact_level === 'high' ? 'High Impact' : highlight.impact_level === 'average' ? 'Average Impact' : 'Small Impact'}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(overlayContent, document.body)
}
