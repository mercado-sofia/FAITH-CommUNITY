'use client'

import { createPortal } from 'react-dom'
import Image from 'next/image'
import { getOrganizationImageUrl, isUnavailableImage } from '@/utils/shared/uploadPaths'
import { UnavailableImagePlaceholder } from '@/components'
import styles from './StarPreviewOverlay.module.css'

export default function StarPreviewOverlay({ highlight, starId, position, isVisible }) {
  // Overlay is fixed in top right corner

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
      <div className={styles.content}>
        {/* Preview Label with Star Number */}
        <div className={styles.previewLabel}>
          Preview {starId && <span className={styles.starNumber}>Star {starId}</span>}
        </div>
        
        {/* Organization Logo and Name */}
        <div className={styles.orgSection}>
          {hasValidLogo ? (
            <div className={styles.logoContainer}>
              <Image
                src={orgLogoUrl}
                alt={`${highlight.organization_name || 'Organization'} logo`}
                width={40}
                height={40}
                className={styles.logo}
                onError={(e) => {
                  e.target.style.display = 'none'
                }}
              />
            </div>
          ) : (
            <div className={styles.logoContainer}>
              <UnavailableImagePlaceholder
                width="40px"
                height="40px"
                text="Logo"
                className={styles.logoPlaceholder}
              />
            </div>
          )}
          <div className={styles.orgInfo}>
            <div className={styles.orgName}>
              {highlight.organization_name || 'Organization'}
            </div>
            {highlight.organization_acronym && (
              <div className={styles.orgAcronym}>
                {highlight.organization_acronym}
              </div>
            )}
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
            <span className={styles.impactLabel}>Impact:</span>
            <span className={`${styles.impactValue} ${styles[`impact${highlight.impact_level.charAt(0).toUpperCase() + highlight.impact_level.slice(1)}`]}`}>
              {highlight.impact_level === 'high' ? 'High' : highlight.impact_level === 'average' ? 'Average' : 'Low'}
            </span>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(overlayContent, document.body)
}
