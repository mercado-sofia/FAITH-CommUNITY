"use client"

import Loader from '../../components/Loader';
import { HeroSection, AboutSection, ImpactSection, NewsSection, BannerSection, OfficerSection, OrgAdviserSection } from './home';
import { usePublicPageLoader } from './hooks/usePublicPageLoader';

export default function PublicHomePage() {
  // Use centralized page loader hook
  const { loading, pageReady } = usePublicPageLoader('home');


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