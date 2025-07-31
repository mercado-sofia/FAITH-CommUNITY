'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Loader from '../../../../../components/Loader';
import BannerSection from '../../../components/PageBanner';
import OrgInfoCard from './components/OrgInfoCard';
import AdvocacyCompetency from './components/AdvocacyCompetency';
import FeaturedProjects from './components/FeaturedProjects';
import OrgHeadsCarousel from './components/OrgHeadsCarousel';
import { usePublicOrganizationData } from '../../../../../hooks/usePublicData';
import styles from '../org.module.css';

let hasVisited = false;

export default function OrgPage() {
  const { orgID } = useParams();
  const [imageLoading, setImageLoading] = useState(true);
  const timerRef = useRef(null);

  // Use SWR hook for data fetching with caching
  const { organizationData, isLoading, error, isEmpty } = usePublicOrganizationData(orgID);

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
    
    const timeoutPromise = new Promise((resolve) => {
      timerRef.current = setTimeout(resolve, 500); // Reduced timeout since data loads faster
    });

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
  }, [organizationData, imageUrls, isLoading]);

  // Show loading state
  if (isLoading || imageLoading) return <Loader small />;

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
        <FeaturedProjects projects={fallbackData.featuredProjects} />

        <section className={styles.volunteerBanner}>
          <div className={styles.bannerContent}>
            <p>Support {fallbackData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
            <button className={styles.joinBtn}>Join as a Volunteer</button>
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
      <FeaturedProjects projects={organizationData.featuredProjects} />

      <section className={styles.volunteerBanner}>
        <div className={styles.bannerContent}>
          <p>Support {organizationData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
          <button className={styles.joinBtn}>Join as a Volunteer</button>
        </div>
      </section>

      <OrgHeadsCarousel heads={organizationData.heads} />
    </>
  );
}