'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import SimplifiedVolunteerForm from './components/VolunteerForm';
import styles from './apply.module.css';

let hasVisitedApply = false;
let isFirstVisitApply = true;

export default function ApplyPage() {
  const [loading, setLoading] = useState(!hasVisitedApply);
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userData, setUserData] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const timerRef = useRef(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get program ID from URL parameters
    const programId = searchParams.get('program');
    if (programId) {
      setSelectedProgramId(programId);
    }
  }, [searchParams]);

  // Check user authentication status
  useEffect(() => {
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        const user = JSON.parse(storedUserData);
        setUserData(user);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
      }
    } else {
      // Show login modal for non-authenticated users
      setShowLoginModal(true);
    }
  }, []);

  // Show login modal when needed
  useEffect(() => {
    if (showLoginModal && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('showLoginModal'));
      setShowLoginModal(false);
    }
  }, [showLoginModal]);

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

      <section aria-labelledby="apply-heading" className={styles.applySection}>
        <div className={styles.applyContainer}>
          <div className={styles.applyHeader}>
            <h2 id="apply-heading" className={styles.applyTitle}>
              Volunteer Application
            </h2>
            <p className={styles.applySubtitle}>
              Join our community of volunteers and make a difference today!
            </p>
          </div>

          {isLoggedIn ? (
            <SimplifiedVolunteerForm 
              selectedProgramId={selectedProgramId}
            />
          ) : (
            <div className={styles.loginPrompt}>
              <h3 className={styles.loginPromptTitle}>
                Please log in or create an account to apply for volunteer programs.
              </h3>
              <button 
                onClick={() => setShowLoginModal(true)}
                className={styles.loginButton}
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}