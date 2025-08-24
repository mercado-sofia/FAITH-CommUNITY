'use client';

import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Loader from '../../../components/Loader';
import PageBanner from '../components/PageBanner';
import SimplifiedVolunteerForm from './components/VolunteerForm';
import styles from './apply.module.css';

export default function ApplyPage() {
  const [loading, setLoading] = useState(true);
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
    if (typeof window === 'undefined') return;
    
    console.log('Checking user authentication...');
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    console.log('Token exists:', !!token);
    console.log('User data exists:', !!storedUserData);
    
    if (token && storedUserData) {
      try {
        const user = JSON.parse(storedUserData);
        console.log('Parsed user data:', user);
        setUserData(user);
        setIsLoggedIn(true);
        console.log('User is now logged in');
      } catch (error) {
        console.error('Error parsing user data:', error);
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        setShowLoginModal(true);
      }
    } else {
      console.log('No token or user data, showing login modal');
      // Show login modal for non-authenticated users
      setShowLoginModal(true);
    }
  }, []);

  // Show login modal when needed
  useEffect(() => {
    if (showLoginModal && typeof window !== 'undefined') {
      try {
        // Dispatch the event to show the login modal
        window.dispatchEvent(new CustomEvent('showLoginModal'));
        // Don't immediately set showLoginModal to false - let the modal handle its own state
        // The modal will close itself when the user takes action
      } catch (error) {
        console.error('Error dispatching login modal event:', error);
        // Only reset if there was an error
        setShowLoginModal(false);
      }
    }
  }, [showLoginModal]);

  // Handle loading state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Simple loading delay
      timerRef.current = setTimeout(() => {
        setLoading(false);
      }, 1000);

      // Fallback timeout to ensure loading never gets stuck
      const fallbackTimeout = setTimeout(() => {
        setLoading(false);
      }, 3000);

      // Cleanup function to clear both timeouts
      return () => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        clearTimeout(fallbackTimeout);
      };
    }
  }, []); // Only run once on mount

  if (loading) {
    return <Loader small centered />;
  }

  console.log('Render state:', { loading, isLoggedIn, showLoginModal, userData: !!userData });

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
