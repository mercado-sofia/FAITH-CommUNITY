'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Loader from '../../../../../components/Loader';
import BannerSection from '../../../components/PageBanner';
import { OrgInfoCard, AdvocacyCompetency, FeaturedProjects, OrgHeadsCarousel, LatestPosts } from '../../components';
import { usePublicOrganizationData } from '../../../../../hooks/usePublicData';
import { useAuthState } from '../../../../../hooks/useAuthState';
import styles from '../org.module.css';

// Track visited org pages globally
const visitedOrgPages = new Set();

export default function OrgPage() {
  const { orgID } = useParams();
  const [imageLoading, setImageLoading] = useState(true);
  const [pageReady, setPageReady] = useState(false);
  const timerRef = useRef(null);
  const pageReadyTimerRef = useRef(null);

  // Check if this specific org page has been visited before
  const hasVisitedThisOrg = visitedOrgPages.has(orgID);
  const isFirstVisitThisOrg = !hasVisitedThisOrg;

  // Use SWR hook for data fetching with caching
  const { organizationData, isLoading, error, isEmpty } = usePublicOrganizationData(orgID);
  
  // Authentication state
  const { isAuthenticated } = useAuthState();

  // Handle volunteer button click - same logic as Apply Now button
  const handleVolunteerClick = (e) => {
    if (!isAuthenticated) {
      e.preventDefault();
      window.dispatchEvent(new CustomEvent('showLoginModal'));
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
    
    // Only add timeout for first-time visitors to this org
    const timeoutPromise = isFirstVisitThisOrg 
      ? new Promise((resolve) => {
          timerRef.current = setTimeout(resolve, 500);
        })
      : Promise.resolve();

    const imageLoadPromises = imageUrls.map((src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        img.onload = img.onerror = resolve;
      });
    });

    Promise.all([timeoutPromise, ...imageLoadPromises]).then(() => {
      setImageLoading(false);
    });

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [organizationData, imageUrls, isLoading, isFirstVisitThisOrg]);

  // Add extra 1 second delay only for first visits to this specific org
  useEffect(() => {
    if (!isLoading && !imageLoading) {
      const extraDelay = isFirstVisitThisOrg ? 1000 : 0; // Extra delay only for first visit to this org
      
      pageReadyTimerRef.current = setTimeout(() => {
        setPageReady(true);
        // Mark this org page as visited
        visitedOrgPages.add(orgID);
      }, extraDelay);
    }

    return () => {
      if (pageReadyTimerRef.current) {
        clearTimeout(pageReadyTimerRef.current);
      }
    };
  }, [isLoading, imageLoading, isFirstVisitThisOrg, orgID]);

  // Show loading state
  if (isLoading || imageLoading || !pageReady) return <Loader small centered />;

  // Show error state with fallback data
  if (error || isEmpty) {
    const fallbackData = {
      name: 'Organization Not Found',
      acronym: orgID?.toUpperCase() || 'ORG',
      description: 'No data available for this organization.',
      facebook: '',
      email: '',
      logo: '/logo/faith_community_logo.png',
      advocacies: [],
      competencies: [],
      heads: [],
      featuredProjects: [],
    };

    return (
      <>
        <BannerSection
          title="Programs and Services"
          backgroundImage="/sample/sample2.jpg"
          breadcrumbs={[
            { href: '/', label: 'Home' },
            { href: '/programs', label: 'Programs and Services' },
            { label: fallbackData.acronym },
          ]}
        />

        {error && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
            <p>Unable to load organization data. Please try again later.</p>
          </div>
        )}

        <OrgInfoCard data={fallbackData} />
        <AdvocacyCompetency
          acronym={fallbackData.acronym}
          advocacies={fallbackData.advocacies}
          competencies={fallbackData.competencies}
        />
        <FeaturedProjects orgID={orgID} />

        <LatestPosts orgID={orgID} />

        <section className={styles.volunteerBanner}>
          <div className={styles.bannerContent}>
            <p>Support {fallbackData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
            <Link 
              href="/apply" 
              className={styles.joinBtn}
              onClick={handleVolunteerClick}
            >
              Join as a Volunteer
            </Link>
          </div>
        </section>

        <OrgHeadsCarousel heads={fallbackData.heads} />
      </>
    );
  }

  return (
    <>
      <BannerSection
        title="Programs and Services"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { href: '/programs', label: 'Programs and Services' },
          { label: organizationData.acronym },
        ]}
      />

      <OrgInfoCard data={organizationData} />
      <AdvocacyCompetency
        acronym={organizationData.acronym}
        advocacies={organizationData.advocacies}
        competencies={organizationData.competencies}
      />
      <FeaturedProjects orgID={orgID} />

      <LatestPosts orgID={orgID} />

      <section className={styles.volunteerBanner}>
        <div className={styles.bannerContent}>
          <p>Support {organizationData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
          <Link 
            href="/apply" 
            className={styles.joinBtn}
            onClick={handleVolunteerClick}
          >
            Join as a Volunteer
          </Link>
        </div>
      </section>

      <OrgHeadsCarousel heads={organizationData.heads} />
    </>
  );
}