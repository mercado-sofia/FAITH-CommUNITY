import styles from './styles/aboutOrg.module.css';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useState, useEffect } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8080';

export default function AboutOrg() {
  const cardWidth = 140;
  const orgVisibleCount = 7;
  const [orgStart, setOrgStart] = useState(0);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch organizations from API
  const fetchOrganizations = async () => {
    try {
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/organizations`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }
      
      const result = await response.json();
      
      if (result.success) {
        setOrganizations(result.data || []);
      } else {
        throw new Error(result.message || 'Failed to fetch organizations');
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError(error.message);
      // Fallback to empty array on error
      setOrganizations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

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
          <button onClick={fetchOrganizations} className={styles.retryButton}>
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
                    src={org.logo} 
                    alt={org.name} 
                    width={100} 
                    height={100}
                    onError={(e) => {
                      e.target.src = '/logo/default_org_logo.png'; // Fallback image
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