'use client';

import { useState, useRef } from 'react'
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import AboutMissionVision from './components/AboutMissionVision';
import AboutMore from './components/AboutMore';
import AboutOrg from './components/AboutOrg';
import OfficerSection from '../components/OfficerSection';

let hasVisited = false

export default function AboutPage() {
  const [loading, setLoading] = useState(!hasVisited)
  const timerRef = useRef(null)

  if (!hasVisited && typeof window !== 'undefined') {
    hasVisited = true
    timerRef.current = setTimeout(() => {
      setLoading(false)
    }, 1000)
  }

  if (loading) return <Loader small />

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