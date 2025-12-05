'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuMousePointerClick } from "react-icons/lu";
import Filters from '../Filters/Filters';
import styles from './WelcomeSection.module.css';

function WelcomeSection({ 
  onContinue, 
  organizations = [], 
  selectedOrganization = null,
  onOrganizationSelect 
}) {
  const [welcomeMode, setWelcomeMode] = useState('welcome'); // 'welcome' | 'organization'
  const [isFadingOut, setIsFadingOut] = useState(false);

  // Handle organization selection - automatically proceed to tree view
  const handleOrganizationChange = (orgId) => {
    if (onOrganizationSelect) {
      onOrganizationSelect(orgId);
    }
    // Automatically proceed to tree view after organization is selected
    if (onContinue) {
      onContinue();
    }
  };

  // Handle continue button in welcome mode - fade out txt1 then switch to organization selection mode
  const handleWelcomeContinue = () => {
    setIsFadingOut(true);
    // Wait for fade-out animation to complete before switching modes
    setTimeout(() => {
      setWelcomeMode('organization');
      setIsFadingOut(false);
    }, 500); // Match fadeOut duration
  };

  // Mode 1: Welcome screen with txt1.svg
  if (welcomeMode === 'welcome') {
    return (
      <div className={styles.welcomeContainer}>
        {/* Main content */}
        <div className={styles.content}>
          <div className={`${styles.textSvg1} ${isFadingOut ? styles.fadeOut : ''}`}>
            <Image 
              src="/assets/backgrounds/welcome-faithree/txt1.svg" 
              alt="FAITHree" 
              width={660}
              height={200}
              priority
            />
          </div>
          
          <div className={`${styles.messageContainer} ${isFadingOut ? styles.fadeOut : ''}`}>
            {/* Introduction Message */}
            <div className={`${styles.messageCard} ${styles.messageCardDark}`}>
              <div className={`${styles.messageIcon} ${styles.messageIconDark}`}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <p className={`${styles.message} ${styles.messageIntro}`}>
                Welcome to <strong>FAITHree</strong>, an interactive visualization of success stories 
                and highlights from our community extension programs.
              </p>
            </div>

            {/* Concept Explanation Message */}
            <div className={styles.messageCard}>
              <div className={styles.messageIcon}>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
                </svg>
              </div>
              <p className={`${styles.message} ${styles.messageConcept}`}>
                Just as a tree bears fruit, our programs produce meaningful success stories. 
                Each star represents a highlight—showing the real impact we make in our communities.
              </p>
            </div>

            {/* Call to Action Message */}
            <div className={`${styles.messageCard} ${styles.messageCardMobileHidden}`}>
              <div className={styles.messageIcon}>
                <LuMousePointerClick aria-hidden="true" />
              </div>
              <p className={`${styles.message} ${styles.messageAction}`}>
                Click on the stars to discover inspiring stories and see how our programs are 
                making a difference.
              </p>
            </div>
          </div>

          <button
            className={`${styles.continueButton} ${isFadingOut ? styles.fadeOut : ''}`}
            onClick={handleWelcomeContinue}
            aria-label="Continue to organization selection"
          >
            <span>Continue to Tree</span>
          </button>
        </div>
      </div>
    );
  }

  // Mode 2: Organization selection with txt2.svg
  return (
    <div className={styles.welcomeContainer}>
      {/* Main content */}
      <div className={styles.content}>
        <div className={styles.textSvg2}>
          <Image 
            src="/assets/backgrounds/welcome-faithree/txt2.svg" 
            alt="FAITHree" 
            width={800}
            height={224}
            priority
          />
        </div>
        
        <div className={styles.organizationContainer}>
          <Filters
            organizations={organizations}
            years={[]}
            selectedOrganization={selectedOrganization}
            selectedYear={null}
            showAllYears={false}
            onOrganizationChange={handleOrganizationChange}
            onYearChange={() => {}}
            theme="morning"
            isCentered={true}
            useFlowPosition={true}
          />
        </div>
      </div>
    </div>
  );
}

export default WelcomeSection;

