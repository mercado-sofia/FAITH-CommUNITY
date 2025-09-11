import styles from './OrgBanner.module.css';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useState } from 'react';
import { usePublicOrganizations } from '../../../../../hooks/usePublicData';

export default function OrgBanner() {
  const cardWidth = 140;
  const orgVisibleCount = 7;
  const [orgStart, setOrgStart] = useState(0);
  const { organizations, isLoading: loading, error } = usePublicOrganizations();

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
          <p>Failed to load organizations: {error}</p>
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
          <button
            className={styles.orgNavBtn}
            onClick={() => orgStart > 0 && setOrgStart(orgStart - 1)}
            disabled={orgStart === 0}
          >
            <FaChevronLeft />
          </button>

          <div className={styles.orgSliderWrapper}>
            <div
              className={styles.orgSliderTrack}
              style={{ transform: `translateX(-${orgStart * (cardWidth + 2)}px)` }}
            >
              {organizations.map((org, i) => (
                <div className={styles.orgItem} key={org.id || i}>
                  <Image 
                    src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}${org.logo}`} 
                    alt={org.name} 
                    width={100} 
                    height={100}
                    onError={(e) => {
                      e.target.src = '/default.png'; // Fallback image
                    }}
                  />
                  <p>{org.acronym}</p>
                </div>
              ))}
            </div>
          </div>

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
        </div>
      )}
    </section>
  );
}