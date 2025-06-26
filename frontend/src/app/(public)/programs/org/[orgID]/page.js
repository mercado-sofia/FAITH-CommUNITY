'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Loader from '../../../../../components/Loader';
import BannerSection from '../../../components/PageBanner';
import OrgInfoCard from './components/OrgInfoCard';
import AdvocacyCompetency from './components/AdvocacyCompetency';
import FeaturedProjects from './components/FeaturedProjects';
import OrgHeadsCarousel from './components/OrgHeadsCarousel';
import styles from '../org.module.css';
import orgMockData from './mockOrgs';

let hasVisited = false;

export default function OrgPage() {
  const { orgID } = useParams();
  const [loading, setLoading] = useState(!hasVisited);
  const timerRef = useRef(null);

  const orgData = orgMockData[orgID.toLowerCase()] || {
    name: 'Organization Not Found',
    acronym: orgID.toUpperCase(),
    description: 'No data available for this organization.',
    facebook: '',
    email: '',
    logo: '/logo/faith_community_logo.png',
    advocacies: [],
    competencies: [],
    heads: [],
    featuredProjects: [],
  };

  const imageUrls = [
    orgData.logo,
    ...orgData.heads.map((h) => h.photo || ''),
    ...orgData.featuredProjects.map((p) => p.image || ''),
  ];

  useEffect(() => {
    if (!hasVisited && typeof window !== 'undefined') {
      hasVisited = true;

      const timeoutPromise = new Promise((resolve) => {
        timerRef.current = setTimeout(resolve, 1000);
      });

      const imageLoadPromises = imageUrls.map((src) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.src = src;
          img.onload = img.onerror = resolve;
        });
      });

      Promise.all([timeoutPromise, ...imageLoadPromises]).then(() => {
        setLoading(false);
      });
    }
  }, [orgID]);

  if (loading) return <Loader small />;

  return (
    <>
      <BannerSection
        title="Programs and Services"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { href: '/programs', label: 'Programs and Services' },
          { label: orgID.toUpperCase() },
        ]}
      />

      <OrgInfoCard data={orgData} />
      <AdvocacyCompetency
        acronym={orgData.acronym}
        advocacies={orgData.advocacies}
        competencies={orgData.competencies}
      />
      <FeaturedProjects projects={orgData.featuredProjects} />

      <section className={styles.volunteerBanner}>
        <div className={styles.bannerContent}>
          <p>Support {orgData.acronym}&apos;s Initiatives and Volunteer with Us!</p>
          <button className={styles.joinBtn}>Join as a Volunteer</button>
        </div>
      </section>

      <OrgHeadsCarousel heads={orgData.heads} />
    </>
  );
}