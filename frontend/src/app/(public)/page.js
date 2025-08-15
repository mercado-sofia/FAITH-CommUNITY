"use client"

import HeroSection from './components/HeroSection'
import AboutSection from './components/AboutSection'
import ImpactSection from './components/ImpactSection'
import NewsSection from './components/NewsSection'
import BannerSection from './components/BannerSection'
import OfficerSection from './components/OfficerSection'
import OrgAdviserSection from './components/OrgAdviserSection'

export default function PublicHomePage() {
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