'use client';

import { useState } from 'react';
import Image from 'next/image';
import { LuMousePointerClick } from "react-icons/lu";
import OrganizationSelection from '../OrganizationSelection/OrganizationSelection';
import styles from './WelcomeSection.module.css';

// Constants
const ANIMATION_TIMING = {
  FADE_OUT_DURATION: 500, // milliseconds
};

// Message data configuration
const MESSAGES = [
  {
    id: 0,
    variant: 'intro',
    isDark: true,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
    text: (
      <>
        Welcome to <strong>FAITHree</strong>, an interactive visualization of success stories 
        and highlights from our community extension programs.
      </>
    ),
  },
  {
    id: 1,
    variant: 'concept',
    isDark: false,
    icon: (
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
      </svg>
    ),
    text: (
      <>
        Just as a tree bears fruit, our programs produce meaningful success stories. 
        Each star represents a highlight—showing the real impact we make in our communities.
      </>
    ),
  },
  {
    id: 2,
    variant: 'action',
    isDark: false,
    icon: <LuMousePointerClick aria-hidden="true" />,
    text: (
      <>
        Click on the stars to discover inspiring stories and see how our programs are 
        making a difference.
      </>
    ),
  },
];

// MessageCarousel Component
function MessageCarousel({ currentMessageIndex, onMessageChange, isFadingOut, styles: carouselStyles }) {
  // Map variant to CSS class name
  const getMessageVariantClass = (variant) => {
    const variantMap = {
      intro: carouselStyles.messageIntro,
      concept: carouselStyles.messageConcept,
      action: carouselStyles.messageAction,
    };
    return variantMap[variant] || '';
  };

  return (
    <div className={`${carouselStyles.messageContainer} ${isFadingOut ? carouselStyles.fadeOut : ''}`}>
      <div className={carouselStyles.messageCarousel}>
        {MESSAGES.map((message) => (
          <div
            key={message.id}
            className={`${carouselStyles.messageCard} ${message.isDark ? carouselStyles.messageCardDark : ''} ${currentMessageIndex === message.id ? carouselStyles.messageCardActive : carouselStyles.messageCardInactive}`}
          >
            <div className={`${carouselStyles.messageIcon} ${message.isDark ? carouselStyles.messageIconDark : ''}`}>
              {message.icon}
            </div>
            <p className={`${carouselStyles.message} ${getMessageVariantClass(message.variant)}`}>
              {message.text}
            </p>
          </div>
        ))}
      </div>
      
      {/* Message indicators/dots */}
      <div className={carouselStyles.messageIndicators}>
        {MESSAGES.map((_, index) => (
          <button
            key={index}
            className={`${carouselStyles.messageIndicator} ${currentMessageIndex === index ? carouselStyles.messageIndicatorActive : ''}`}
            onClick={() => onMessageChange(index)}
            aria-label={`Go to message ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

// WelcomeMode Component
function WelcomeMode({ isFadingOut, currentMessageIndex, onMessageChange, onContinue }) {
  return (
    <div className={styles.welcomeContainer}>
      <div className={styles.content}>
        {/* txt1 as overlay - doesn't affect layout */}
        <div className={`${styles.textSvg1} ${isFadingOut ? styles.fadeOut : ''}`}>
          <Image 
            src="/assets/backgrounds/welcome-faithree/txt1.svg" 
            alt="FAITHree" 
            width={900}
            height={320}
            priority
          />
        </div>
        
        {/* Message container - centered vertically */}
        <MessageCarousel
          currentMessageIndex={currentMessageIndex}
          onMessageChange={onMessageChange}
          isFadingOut={isFadingOut}
          styles={styles}
        />

        {/* Continue button - positioned at bottom */}
        <button
          className={`${styles.continueButton} ${isFadingOut ? styles.fadeOut : ''}`}
          onClick={onContinue}
          aria-label="Continue to organization selection"
        >
          <span>Continue to Tree</span>
        </button>
      </div>
    </div>
  );
}

// Main WelcomeSection Component
function WelcomeSection({ 
  onContinue, 
  organizations = [], 
  selectedOrganization = null,
  onOrganizationSelect 
}) {
  const [welcomeMode, setWelcomeMode] = useState('welcome'); // 'welcome' | 'organization'
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

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
    }, ANIMATION_TIMING.FADE_OUT_DURATION);
  };

  // Render appropriate mode
  if (welcomeMode === 'welcome') {
    return (
      <WelcomeMode
        isFadingOut={isFadingOut}
        currentMessageIndex={currentMessageIndex}
        onMessageChange={setCurrentMessageIndex}
        onContinue={handleWelcomeContinue}
      />
    );
  }

  return (
    <OrganizationSelection
      organizations={organizations}
      selectedOrganization={selectedOrganization}
      onOrganizationChange={handleOrganizationChange}
    />
  );
}

export default WelcomeSection;
