'use client';

import Loader from '../../../components/ui/Loader';
import { PageBanner } from '../components';
import { MissionAndVision, AboutMore, OrgBanner } from './Sections';
import OfficerSection from '../home/OfficerSection/OfficerSection';
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';

export default function AboutPage() {
  // Use centralized page loader hook
  const { loading, pageReady } = usePublicPageLoader('about');


  if (loading || !pageReady) {
    return <Loader small centered />;
  }

  return (
    <>
      <PageBanner
        title="About Us"
        backgroundImage="/samples/sample8.jpg"
        breadcrumbs={[
          { href: '/', label: 'Home' },
          { label: 'About Us' },
        ]}
      />
      
      <MissionAndVision />
      <AboutMore />
      <OrgBanner />
      <OfficerSection />
    </>
  );
}