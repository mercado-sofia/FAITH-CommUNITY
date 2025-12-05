'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { getOrganizationImageUrl, isUnavailableImage } from '@/utils/shared/uploadPaths'
import { UnavailableImagePlaceholder } from '@/components'
import styles from './StarPreviewOverlay.module.css'

export default function StarPreviewOverlay({ highlight, starId, position, isVisible }) {
  // Overlay is fixed at bottom center

  if (!highlight || !isVisible || typeof document === 'undefined' || !document.body) {
    return null
  }

  const orgLogoUrl = highlight.organization_logo 
    ? getOrganizationImageUrl(highlight.organization_logo, 'logo')
    : null

  const hasValidLogo = orgLogoUrl && !isUnavailableImage(orgLogoUrl)

  const overlayContent = (
    <div
      className={`${styles.overlay} ${isVisible ? styles.visible : ''}`}
    >
      {/* Preview Label - Outside container, above */}
      <div className={styles.previewLabel}>
        Preview
      </div>
      
      {/* Combined container with org profile and highlight details */}
      <div className={styles.content}>
        {/* Organization Profile - Top section */}
        <div className={styles.orgSection}>
          <div className={styles.orgTabContent}>
            {hasValidLogo ? (
              <div className={styles.logoContainer}>
                <Image
                  src={orgLogoUrl}
                  alt={`${highlight.organization_name || 'Organization'} logo`}
                  width={22}
                  height={22}
                  className={styles.logo}
                  onError={(e) => {
                    e.target.style.display = 'none'
                  }}
                />
              </div>
            ) : (
              <div className={styles.logoContainer}>
                <UnavailableImagePlaceholder
                  width="22px"
                  height="22px"
                  text="Logo"
                  className={styles.logoPlaceholder}
                />
              </div>
            )}
            <div className={styles.orgInfo}>
              <span className={styles.orgName}>
                {highlight.organization_name || 'Organization'}
                {highlight.organization_acronym && (
                  <span className={styles.orgAcronym}> ({highlight.organization_acronym})</span>
                )}
              </span>
            </div>
          </div>
        </div>

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
