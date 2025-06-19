'use client';

import { useState, useRef } from 'react';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import VolunteerForm from './components/VolunteerForm';

let hasVisitedApply = false;

export default function ApplyPage() {
  const [loading, setLoading] = useState(!hasVisitedApply);
  const timerRef = useRef(null);

  if (!hasVisitedApply && typeof window !== 'undefined') {
    hasVisitedApply = true;
    timerRef.current = setTimeout(() => {
      setLoading(false);
    }, 1000);
  }

  if (loading) {
    return <Loader small />;
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

      <section aria-labelledby="apply-heading" style={{ padding: "4rem 2rem", background: "#fff" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div style={{ textAlign: "center" }}>
            <h2 id="apply-heading" style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "0.5rem" }}>
              Volunteer Application
            </h2>
            <p style={{ fontSize: "0.9rem", fontWeight: "600", color: "#15803d", marginBottom: "2rem" }}>
              Join our community of volunteers and make a difference today!
            </p>
          </div>

          <VolunteerForm />
        </div>
      </section>
    </>
  );
}