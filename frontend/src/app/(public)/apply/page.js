'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Loader from '../../../components/ui/Loader/Loader';
import { PageBanner } from '../components';
import SimplifiedVolunteerForm from './VolunteerApplication/VolunteerForm';
import ProgramPreview from './ProgramPreview/ProgramPreview';
import ApplicationSteps from './ApplicationSteps/ApplicationSteps';
import { usePublicPageLoader } from '@/hooks/(public)/usePublicPageLoader';
import { useApplyFormPersistence } from '@/hooks/(public)/useApplyFormPersistence';
import styles from './apply.module.css';

export default function ApplyPage() {
  const [selectedProgramId, setSelectedProgramId] = useState(null);
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
        </div>
      </section>

      <ApplicationSteps />
    </>
  );
}