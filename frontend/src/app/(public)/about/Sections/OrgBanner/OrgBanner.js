import styles from './OrgBanner.module.css';
import Image from 'next/image';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useState, useEffect, useRef } from 'react';
import { usePublicOrganizations } from '@/hooks/(public)/usePublicData';

export default function OrgBanner() {
  const [orgStart, setOrgStart] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isSmallMobile, setIsSmallMobile] = useState(false);
  const { organizations, isLoading: loading, error } = usePublicOrganizations();
  const prevScreenCategory = useRef({ isMobile: false, isSmallMobile: false });
  
  // Check if screen is mobile size and calculate visible count dynamically
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      const newIsMobile = width <= 768;
      const newIsSmallMobile = width <= 480;
      
      // Reset scroll position if screen size category changed significantly
      // (e.g., desktop to mobile or vice versa)
      if (prevScreenCategory.current.isMobile !== newIsMobile || 
          prevScreenCategory.current.isSmallMobile !== newIsSmallMobile) {
        setOrgStart(0);
        prevScreenCategory.current = { isMobile: newIsMobile, isSmallMobile: newIsSmallMobile };
      }
      
      setIsMobile(newIsMobile);
      setIsSmallMobile(newIsSmallMobile);
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  // Calculate dynamic visible count based on screen size
  // For mobile: account for nav buttons (28px each), gaps (0.5rem = 8px), and padding (1rem = 16px each side)
  // Available width = viewport - (padding * 2) - (nav buttons * 2) - (gaps * 2)
  // On mobile (768px): 768 - 32 - 56 - 16 = 664px available (conservative estimate)
  // On small mobile (480px): 480 - 32 - 48 - 16 = 384px available (conservative estimate)
  // Each org item: 120px (mobile) or 100px (small mobile) + 2px gap
  const getMaxVisibleCount = () => {
    if (isSmallMobile) {
      // Small mobile: 100px per org + 2px gap
      // Can fit 2 orgs comfortably: (100 + 2) * 2 = 204px < 384px available
      return 2;
    } else if (isMobile) {
      // Regular mobile: 120px per org + 2px gap  
      // Can fit 3 orgs: (120 + 2) * 3 = 366px < 664px available
      return 3;
    } else {
      // Desktop: 140px per org + 2px gap
      return 7;
    }
  };
  
  const maxVisibleCount = getMaxVisibleCount();
  const orgVisibleCount = Math.min(organizations.length, maxVisibleCount);
  const needsCarousel = organizations.length > maxVisibleCount;
  
  // Get org item width based on screen size
  const getOrgItemWidth = () => {
    if (isSmallMobile) return 100;
    if (isMobile) return 120;
    return 140;
  };
  
  const orgItemWidth = getOrgItemWidth();
  
  // Ensure orgStart doesn't exceed valid bounds when organizations change
  useEffect(() => {
    if (organizations.length > 0 && orgStart > 0) {
      const maxStart = Math.max(0, organizations.length - orgVisibleCount);
      if (orgStart > maxStart) {
        setOrgStart(maxStart);
      }
    }
  }, [organizations.length, orgVisibleCount, orgStart]);

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
                ? `calc((${orgItemWidth}px + 2px) * ${orgVisibleCount} - 2px)` 
                : 'auto',
              justifyContent: needsCarousel ? 'flex-start' : 'center',
              maxWidth: '100%'
            }}
          >
            <div
              className={styles.orgSliderTrack}
              style={{ 
                transform: needsCarousel 
                  ? `translateX(-${orgStart * (orgItemWidth + 2)}px)` 
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