import styles from './OrgBanner.module.css';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useState } from 'react';
import { usePublicOrganizations } from '../../../hooks/usePublicData';

export default function OrgBanner() {
  const cardWidth = 140;
  const [orgStart, setOrgStart] = useState(0);
  const { organizations, isLoading: loading, error } = usePublicOrganizations();
  
  // Calculate dynamic visible count based on available organizations
  const maxVisibleCount = 7;
  const orgVisibleCount = Math.min(organizations.length, maxVisibleCount);
  const needsCarousel = organizations.length > maxVisibleCount;

  if (loading) {
    return (
      <section className={styles.orgSection}>
        <h2 className={styles.orgHeading}>Loading Organizations...</h2>
        <div className={styles.loadingWrapper}>
          <div className={styles.loader}></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.orgSection}>
        <h2 className={styles.orgHeading}>Error Loading Organizations</h2>
        <div className={styles.errorWrapper}>
          <p>Failed to load organizations: {error?.message || String(error)}</p>
          <button onClick={() => window.location.reload()} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.orgSection}>
      <h2 className={styles.orgHeading}>
        Total of <span>{organizations.length}</span> Organizations
      </h2>
      {organizations.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No organizations found.</p>
        </div>
      ) : (
        <div className={styles.orgCarouselWrapper}>
          {needsCarousel && (
            <button
              className={styles.orgNavBtn}
              onClick={() => orgStart > 0 && setOrgStart(orgStart - 1)}
              disabled={orgStart === 0}
            >
              <FaChevronLeft />
            </button>
          )}

          <div 
            className={styles.orgSliderWrapper}
            style={{ 
              width: needsCarousel 
                ? `calc((140px + 2px) * ${orgVisibleCount} - 2px)` 
                : 'auto',
              justifyContent: needsCarousel ? 'flex-start' : 'center'
            }}
          >
            <div
              className={styles.orgSliderTrack}
              style={{ 
                transform: needsCarousel 
                  ? `translateX(-${orgStart * (cardWidth + 2)}px)` 
                  : 'none',
                justifyContent: needsCarousel ? 'flex-start' : 'center'
              }}
            >
              {organizations.map((org, i) => (
                <div className={styles.orgItem} key={org.id || i}>
                  <Image 
                    src={org.logo} 
                    alt={org.name} 
                    width={100} 
                    height={100}
                    onError={(e) => {
                      e.target.src = '/defaults/default.png'; // Fallback image
                    }}
                  />
                  <p>{org.acronym}</p>
                </div>
              ))}
            </div>
          </div>

          {needsCarousel && (
            <button
              className={styles.orgNavBtn}
              onClick={() =>
                orgStart < organizations.length - orgVisibleCount &&
                setOrgStart(orgStart + 1)
              }
              disabled={orgStart >= organizations.length - orgVisibleCount}
            >
              <FaChevronRight />
            </button>
          )}
        </div>
      )}
    </section>
  );
}