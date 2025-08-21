'use client';

import { useState, useEffect, useRef } from 'react';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import AboutMissionVision from './components/AboutMissionVision';
import AboutMore from './components/AboutMore';
import AboutOrg from './components/AboutOrg';
import OfficerSection from '../home/OfficerSection';

let hasVisitedAbout = false;
let isFirstVisitAbout = true;

export default function AboutPage() {
  const [loading, setLoading] = useState(!hasVisitedAbout);
  const [pageReady, setPageReady] = useState(false);
  const timerRef = useRef(null);
  const pageReadyTimerRef = useRef(null);

  useEffect(() => {
    if (!hasVisitedAbout && typeof window !== 'undefined') {
      hasVisitedAbout = true;
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, 500); // Base timeout for initial loading
    } else {
      setLoading(false);
    }

    return () => clearTimeout(timerRef.current);
  }, []);

  // Add extra 1 second delay only for first visits after initial loading
  useEffect(() => {
    if (!loading) {
      const extraDelay = isFirstVisitAbout ? 1000 : 0; // Extra delay only for first visit
      
      pageReadyTimerRef.current = setTimeout(() => {
        setPageReady(true);
        isFirstVisitAbout = false; // Mark as no longer first visit
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
      <PageBanner
        title="About Us"
        backgroundImage="/sample/sample8.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'About Us' },
        ]}
      />
      
      <AboutMissionVision />
      <AboutMore />
      <AboutOrg />
      <OfficerSection />
    </>
  )
}