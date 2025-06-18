'use client'

import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import ImpactSection from './components/ImpactSection'
import BannerSection from './components/BannerSection'
import OfficerSection from './components/OfficerSection'
import OrgAdviserSection from './components/OrgAdviserSection'
import FloatingMessage from './components/FloatingMessage'

export default function PublicHomePage() {
  return (
    <>
      <HeroSection />
      <AboutSection />
      <ImpactSection />
      <BannerSection />
      <OfficerSection />
      <OrgAdviserSection />
      <FloatingMessage />
    </>
  )
}