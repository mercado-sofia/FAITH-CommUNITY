"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProgramPreview.module.css';
import { FaUsers, FaCalendarAlt } from 'react-icons/fa';
import { formatProgramDates } from '@/utils/dateUtils';
import { getOrganizationImageUrl } from '@/utils/uploadPaths';

export default function ProgramPreview({ selectedProgram, isLoading }) {
  const [imageError, setImageError] = useState(false);

  // Reset image error when program changes
  useEffect(() => {
    setImageError(false);
  }, [selectedProgram]);

  if (isLoading) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.loadingState}>
          <div className={styles.loadingSkeleton}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonContent}>
              <div className={styles.skeletonTitle}></div>
              <div className={styles.skeletonDescription}></div>
              <div className={styles.skeletonDate}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!selectedProgram) {
    return (
      <div className={styles.previewContainer}>
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>
            <FaUsers />
          </div>
          <h3 className={styles.emptyTitle}>Select a Program</h3>
          <p className={styles.emptyDescription}>
            Choose a program from the dropdown to see details and apply
          </p>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.previewContainer}>
      <div className={styles.programCard}>
        {/* Program Image */}
        <div className={styles.imageContainer}>
          {selectedProgram.image && !imageError ? (
            <Image
              src={selectedProgram.image}
              alt={selectedProgram.name || selectedProgram.title}
              fill
              className={styles.programImage}
              onError={() => setImageError(true)}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 400px, 450px"
            />
          ) : (
            <div className={styles.placeholderImage}>
              <FaUsers className={styles.placeholderIcon} />
            </div>
          )}
          <div className={styles.imageOverlay}>
            <span className={styles.programType}>Volunteer Program</span>
          </div>
        </div>

        {/* Program Content */}
        <div className={styles.programContent}>
          <div className={styles.programHeader}>
            <Link href={`/programs/${selectedProgram.slug || selectedProgram.id}`} className={styles.programTitleLink}>
              <h3 className={styles.programTitle}>{selectedProgram.name || selectedProgram.title}</h3>
            </Link>
            <Link href={`/programs/org/${selectedProgram.orgAcronym || selectedProgram.orgID}`} className={styles.organizationLink}>
              {selectedProgram.orgLogo ? (
                <Image
                  src={getOrganizationImageUrl(selectedProgram.orgLogo)}
                  alt={`${selectedProgram.orgName || 'Organization'} logo`}
                  width={24}
                  height={24}
                  className={styles.organizationIcon}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={styles.organizationIconFallback} style={{ display: selectedProgram.orgLogo ? 'none' : 'flex' }}>
                <span className={styles.fallbackText}>
                  {selectedProgram.orgName ? selectedProgram.orgName.charAt(0).toUpperCase() : 'O'}
                </span>
              </div>
              <span className={styles.organizationName}>{selectedProgram.orgName || 'Organization'}</span>
            </Link>
          </div>

          {/* Program Description */}
          <div className={styles.descriptionSection}>
            <h4 className={styles.sectionTitle}>About This Program</h4>
            <p className={styles.programDescription}>
              {selectedProgram.description || 'No description available for this program.'}
            </p>
          </div>

          {/* Event Date */}
          <div className={styles.detailItem}>
            <FaCalendarAlt className={styles.detailIcon} />
            <div className={styles.detailContent}>
              <span className={styles.detailLabel}>Event Date</span>
              <span className={styles.detailValue}>
                {formatProgramDates(selectedProgram)}
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div className={styles.ctaSection}>
            <div className={styles.ctaCard}>
              <p className={styles.ctaText}>
                Ready to make a difference? Complete the application form to join this program.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}