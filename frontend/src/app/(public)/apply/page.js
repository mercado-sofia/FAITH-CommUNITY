'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Loader from '../../../components/ui/Loader/Loader';
import { PageBanner } from '../components';
import SimplifiedVolunteerForm from './VolunteerApplication/VolunteerForm';
import ProgramPreview from './ProgramPreview/ProgramPreview';
import ApplicationSteps from './ApplicationSteps/ApplicationSteps';
import { usePublicPageLoader } from '../hooks/usePublicPageLoader';
import { useApplyFormPersistence } from '../hooks/useApplyFormPersistence';
import styles from './apply.module.css';

export default function ApplyPage() {
  const [selectedProgramId, setSelectedProgramId] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const searchParams = useSearchParams();
  
  // Use persistence hook for selected program
  const [selectedProgram, setSelectedProgram, clearSelectedProgram] = useApplyFormPersistence(
    'apply_selected_program',
    null
  );
  
  // Use centralized page loader hook
  const { loading: pageLoading, pageReady } = usePublicPageLoader('apply');

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
    
    const token = localStorage.getItem('userToken');
    const storedUserData = localStorage.getItem('userData');
    
    if (token && storedUserData) {
      try {
        JSON.parse(storedUserData);
        setIsLoggedIn(true);
      } catch (error) {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        setShowLoginModal(true);
      }
    } else {
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
        // Error dispatching login modal event - reset state
        // Only reset if there was an error
        setShowLoginModal(false);
      }
    }
  }, [showLoginModal]);

  if (pageLoading || !pageReady) {
    return <Loader small centered />;
  }


  return (
    <>
      <PageBanner
        title="Apply Now"
        backgroundImage="/samples/sample2.jpg"
        breadcrumbs={[
          { href: "/", label: "Home" },
          { label: "Apply" },
        ]}
      />

      <section aria-labelledby="apply-heading" className={styles.applySection}>
        <div className={styles.applyContainer}>
          {isLoggedIn ? (
            <div className={styles.twoPanelLayout}>
              {/* Left Panel - Form */}
              <div className={styles.leftPanel}>
                <SimplifiedVolunteerForm 
                  selectedProgramId={selectedProgramId}
                  onProgramSelect={setSelectedProgram}
                  onFormReset={clearSelectedProgram}
                />
              </div>

              {/* Right Panel - Program Preview */}
              <div className={styles.rightPanel}>
                <ProgramPreview 
                  selectedProgram={selectedProgram}
                  isLoading={false}
                />
              </div>
            </div>
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

      <ApplicationSteps />
    </>
  );
}