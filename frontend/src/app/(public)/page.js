"use client"

import { useEffect } from 'react';
import Loader from '../../components/Loader';
import { HeroSection, AboutSection, ImpactSection, NewsSection, BannerSection, OfficerSection, OrgAdviserSection } from './home';
import { useGetPublicFeaturedProjectsQuery, programsApi } from '../../rtk/(public)/programsApi';
import { usePublicPageLoader } from './hooks/usePublicPageLoader';

export default function PublicHomePage() {
  // Use centralized page loader hook
  const { loading, pageReady } = usePublicPageLoader('home');

  // Preload featured projects data
  useEffect(() => {
    // Prefetch the data when the page loads
    programsApi.util.prefetch('getPublicFeaturedProjects', undefined, { force: true });
  }, []);


  if (loading || !pageReady) {
    return <Loader small centered />;
  }

  return (
    <>
      <HeroSection />
      <AboutSection />
      <ImpactSection />
      <NewsSection />
      <BannerSection />
      <OfficerSection />
      <OrgAdviserSection />
    </>
  )
}