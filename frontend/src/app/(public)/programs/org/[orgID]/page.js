'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Loader from '../../../../../components/Loader';
import BannerSection from '../../../components/PageBanner';
import { OrgInfoCard, AdvocacyCompetency, FeaturedProjects, OrgHeadsCarousel, LatestPosts } from '../../components';
import { usePublicOrganizationData } from '../../../hooks/usePublicData';
import { useAuthState } from '../../../../../hooks/useAuthState';
import { usePublicPageLoader } from '../../../hooks/usePublicPageLoader';
import styles from '../org.module.css';

export default function OrgPage() {
  const { orgID } = useParams();
  const [imageLoading, setImageLoading] = useState(true);
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader(`org-${orgID}`);

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
      {(fallbackData.advocacies?.length > 0 || fallbackData.competencies?.length > 0) && (
        <AdvocacyCompetency
          acronym={fallbackData.acronym}
          advocacies={fallbackData.advocacies}
          competencies={fallbackData.competencies}
        />
      )}
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

        {fallbackData.heads && fallbackData.heads.length > 0 && (
          <OrgHeadsCarousel heads={fallbackData.heads} />
        )}
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
      {(organizationData.advocacies?.length > 0 || organizationData.competencies?.length > 0) && (
        <AdvocacyCompetency
          acronym={organizationData.acronym}
          advocacies={organizationData.advocacies}
          competencies={organizationData.competencies}
        />
      )}
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

      {organizationData.heads && organizationData.heads.length > 0 && (
        <OrgHeadsCarousel heads={organizationData.heads} />
      )}
    </>
  );
}