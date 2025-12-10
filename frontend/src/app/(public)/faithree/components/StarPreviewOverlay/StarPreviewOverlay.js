'use client'

import { createPortal } from 'react-dom'
import styles from './StarPreviewOverlay.module.css'

export default function StarPreviewOverlay({ highlight, starId, screenPosition, isVisible }) {
  // Overlay position is dynamically set based on star's screen position

  if (!highlight || !isVisible || !screenPosition || typeof document === 'undefined' || !document.body) {
    return null
  }

  // Calculate position with offset to appear near the star
  const overlayStyle = {
    left: `${screenPosition.x}px`,
    top: `${screenPosition.y}px`,
  }

  const overlayContent = (
    <div
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}
      style={overlayStyle}
    >
      {/* Title Container */}
      <div className={styles.titleContainer}>
        <h3 className={styles.title}>
          {highlight.title || 'Featured Highlight'}
        </h3>
      </div>

      {/* Impact Level Text */}
      {highlight.impact_level && (
        <span className={styles.impactValue}>
          {highlight.impact_level === 'high' ? 'High Impact' : highlight.impact_level === 'average' ? 'Average Impact' : 'Small Impact'}
        </span>
      )}
    </div>
  )

  return createPortal(overlayContent, document.body)
}
