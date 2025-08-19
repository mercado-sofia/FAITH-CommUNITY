"use client"

import { useState, useEffect, useRef } from 'react';
import Loader from '../../components/Loader';
import HeroSection from './home/HeroSection'
import AboutSection from './home/AboutSection'
import ImpactSection from './home/ImpactSection'
import NewsSection from './home/NewsSection'
import BannerSection from './home/BannerSection'
import OfficerSection from './components/OfficerSection'
import OrgAdviserSection from './home/OrgAdviserSection'
import { publicFeaturedProjectsApi } from '../../rtk/(public)/featuredProjectsApi';

let hasVisitedHome = false;
let isFirstVisitHome = true;

export default function PublicHomePage() {
  const [loading, setLoading] = useState(!hasVisitedHome);
  const [pageReady, setPageReady] = useState(false);
  const timerRef = useRef(null);
  const pageReadyTimerRef = useRef(null);

  // Preload featured projects data
  useEffect(() => {
    // Prefetch the data when the page loads
    publicFeaturedProjectsApi.util.prefetch('getPublicFeaturedProjects', undefined, { force: true });
  }, []);

  useEffect(() => {
    if (!hasVisitedHome && typeof window !== 'undefined') {
      hasVisitedHome = true;
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, 500);
    } else {
      setLoading(false);
    }

    return () => clearTimeout(timerRef.current);
  }, []);

  // Add extra 1 second delay only for first visits after initial loading
  useEffect(() => {
    if (!loading) {
      const extraDelay = isFirstVisitHome ? 1000 : 0;
      
      pageReadyTimerRef.current = setTimeout(() => {
        setPageReady(true);
        isFirstVisitHome = false;
      }, extraDelay);
    }

    return () => {
      if (pageReadyTimerRef.current) {
        clearTimeout(pageReadyTimerRef.current);
      }
    };
  }, [loading]);

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