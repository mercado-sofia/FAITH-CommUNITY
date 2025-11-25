'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Loader } from '@/components';
import { PageBanner as BannerSection } from '../../../components';
import { OrgInfoCard, AdvocacyCompetency, FeaturedProjects, OrgHeadsCarousel, LatestPosts } from '../../components';
import { usePublicOrganizationData } from '../../../hooks/usePublicData';
import { useAuthState } from '@/hooks/useAuthState';
import { usePublicPageLoader } from '../../../hooks/usePublicPageLoader';
import { useFadeIn } from '../../../hooks/useFadeIn';
import { storeRedirectUrl } from '@/utils/redirectUtils';
import styles from '../org.module.css';

// Volunteer Banner Component with fade-in animation
function VolunteerBannerSection({ acronym, handleVolunteerClick }) {
  const { ref: bannerRef, isVisible: isBannerVisible } = useFadeIn({ rootMargin: '0px 0px -100px 0px' });

  return (
    <section ref={bannerRef} className={`${styles.volunteerBanner} ${isBannerVisible ? styles.fadeIn : ''}`}>
      <div className={styles.bannerContent}>
        <p>Support {acronym}&apos;s Initiatives and Volunteer with Us!</p>
        <Link 
          href="/apply" 
          className={styles.joinBtn}
          onClick={handleVolunteerClick}
        >
          Join as a Volunteer
        </Link>
      </div>
    </section>
  );
}

export default function OrgPage() {
  const { orgID } = useParams();
  const [imageLoading, setImageLoading] = useState(true);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`org-${orgID}`);

  // Use SWR hook for data fetching with caching
  const { organizationData, isLoading, error, isEmpty } = usePublicOrganizationData(orgID);
  
  // Authentication state
  const { isAuthenticated } = useAuthState();

  // Handle volunteer button click - always navigate to /apply, show modal if not authenticated
  const handleVolunteerClick = (e) => {
    if (!isAuthenticated) {
      // Store redirect URL before navigating
      storeRedirectUrl("/apply");
      // Still navigate to /apply page, but show modal
      if (typeof window !== 'undefined') {
        // Use setTimeout to ensure modal shows after navigation
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('showLoginModal', {
            detail: { redirectUrl: "/apply" }
          }));
        }, 100);
      }
      // Don't prevent default - let the Link navigate to /apply
    }
  };

  // Image preloading and loading management
  const imageUrls = useMemo(() => {
    if (!organizationData) return [];
    return [
      organizationData.logo,
      ...organizationData.heads.map((h) => h.photo || ''),
      ...organizationData.featuredProjects.map((p) => p.image || ''),
    ].filter(Boolean);
  }, [organizationData]);

  useEffect(() => {
    if (!organizationData || isLoading) return;
    
    const imageLoadPromises = imageUrls.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = img.onerror = resolve;
      });
    });

    Promise.all(imageLoadPromises).then(() => {
      setImageLoading(false);
    });
  }, [organizationData, imageUrls, isLoading]);

  // Show loading state
  if (pageLoading || !pageReady || isLoading || imageLoading) return <Loader small centered />;

  // Show error state - simple "Org Not Found" message
  if (error || isEmpty) {
    // Check if it's a 404 error (organization not found) or empty response
    const isNotFound = error?.status === 404 || 
                      error?.response?.status === 404 ||
                      (error && !error.isNetworkError && !organizationData) ||
                      isEmpty;
    
    // Show simple "Org Not Found" message for 404 or empty data
    return (
      <div style={{ 
        padding: '40px 20px', 
        textAlign: 'center',
        minHeight: '50vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <p style={{ 
          fontSize: '18px', 
          color: '#333',
          margin: 0,
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          Org Not Found
        </p>
      </div>
    );
  }

  return (
    <>
      <BannerSection
        title="Programs and Services"
        backgroundImage="/samples/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { href: '/programs', label: 'Programs and Services' },
          { label: organizationData.acronym },
        ]}
      />

      <OrgInfoCard data={organizationData} />
      {(organizationData.advocacies?.length > 0 || organizationData.competencies?.length > 0) && (
        <AdvocacyCompetency
          acronym={organizationData.acronym}
          advocacies={organizationData.advocacies}
          competencies={organizationData.competencies}
        />
      )}
      <FeaturedProjects orgID={orgID} />

      <LatestPosts orgID={orgID} />

      <VolunteerBannerSection 
        acronym={organizationData.acronym}
        handleVolunteerClick={handleVolunteerClick}
      />

      {organizationData.heads && organizationData.heads.length > 0 && (
        <OrgHeadsCarousel heads={organizationData.heads} />
      )}
    </>
  );
}