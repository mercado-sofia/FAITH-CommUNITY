'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import VolunteerForm from './components/VolunteerForm';

let hasVisitedApply = false;
let isFirstVisitApply = true;

export default function ApplyPage() {
  const [loading, setLoading] = useState(!hasVisitedApply);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const timerRef = useRef(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get program ID from URL parameters
    const programId = searchParams.get('program');
    if (programId) {
      setSelectedProgramId(programId);
    }
  }, [searchParams]);

  if (!hasVisitedApply && typeof window !== 'undefined') {
    hasVisitedApply = true;
    const delay = isFirstVisitApply ? 2000 : 1000; // Extra delay only for first visit
    timerRef.current = setTimeout(() => {
      setLoading(false);
      isFirstVisitApply = false; // Mark as no longer first visit
    }, delay);
  }

  if (loading) {
    return <Loader small centered />;
  }

  return (
    <>
      <PageBanner
        title="Apply Now"
        backgroundImage="/sample/sample2.jpg"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { label: "Apply" },
        ]}
      />

      <section aria-labelledby="apply-heading" style={{ padding: "2rem 1rem", background: "#fff" }}>
        <style jsx>{`
          @media (min-width: 768px) {
            section {
              padding: 4rem 2rem !important;
            }
            h2 {
              font-size: 2rem !important;
            }
          }
        `}</style>
        <div style={{ maxWidth: "1200px", margin: "0 auto", width: "100%" }}>
          <div style={{ textAlign: "center" }}>
            <h2 id="apply-heading" style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Volunteer Application
            </h2>
            <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "#15803d", marginBottom: "2rem" }}>
              Join our community of volunteers and make a difference today!
            </p>
          </div>

          <VolunteerForm 
            selectedProgramId={selectedProgramId}
          />
        </div>
      </section>
    </>
  );
}