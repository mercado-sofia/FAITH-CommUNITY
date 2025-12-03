'use client';

import { LuMousePointerClick } from "react-icons/lu";
import styles from './WelcomeSection.module.css';

function WelcomeSection({ onContinue }) {
  return (
    <div className={styles.welcomeContainer}>
      {/* Main content */}
      <div className={styles.content}>
        <h1 className={styles.heading}>
          FAITHree
          <span className={styles.subheading}>Growing Impact</span>
        </h1>

        <div className={styles.messageContainer}>
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
          <div className={styles.messageCard}>
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
          className={styles.continueButton}
          onClick={onContinue}
          aria-label="Continue to interactive tree view"
        >
          <span>Continue to Tree</span>
        </button>
      </div>
    </div>
  );
}

export default WelcomeSection;

