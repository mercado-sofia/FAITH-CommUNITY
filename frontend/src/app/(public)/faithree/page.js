'use client';

import { useState } from 'react';
import styles from './faithree.module.css';
import { Highlights } from './sections';

export default function FAITHreePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);

  const toggleContent = () => {
    setIsContentVisible(!isContentVisible);
  };

  return (
    <div className={styles.faithreeContainer}>
      {/* Eco-themed background */}
      <div className={styles.ecoBackground}>
        {/* Sky with clouds */}
        <div className={styles.sky}>
          <div className={styles.cloud} style={{ '--delay': '0s', '--duration': '20s' }}></div>
          <div className={styles.cloud} style={{ '--delay': '5s', '--duration': '25s' }}></div>
          <div className={styles.cloud} style={{ '--delay': '10s', '--duration': '30s' }}></div>
        </div>
        
        {/* Rolling hills - SVG paths */}
        <div className={styles.hills}>
          <svg className={styles.hillsSvg} viewBox="0 0 100 50" preserveAspectRatio="none">
            
            {/* Back hill layer - deepest green */}
            <path
              d="M0,50 L0,38 C8,35 16,32 24,34 C32,32 40,30 48,32 C56,30 64,28 72,30 C80,28 88,26 96,28 C98,27 100,28 100,30 L100,50 Z"
              fill="#7CB342"
              opacity="0.9"
            />
            {/* Middle hill layer - medium green */}
            <path
              d="M0,50 L0,32 C6,29 14,26 22,28 C30,26 38,24 46,26 C54,24 62,22 70,24 C78,22 86,20 94,22 C97,21 100,22 100,24 L100,50 Z"
              fill="#8BC34A"
              opacity="0.95"
            />
            {/* Front hill layer - lightest green */}
            <path
              d="M0,50 L0,26 C10,23 20,20 30,22 C40,20 50,18 60,20 C70,18 80,16 90,18 C95,17 100,18 100,20 L100,50 Z"
              fill="#A5D6A7"
              opacity="1"
            />
          </svg>
        </div>
      </div>
      
      {/* Toggle Button */}
      <div className={styles.toggleButtonContainer}>
        <button 
          className={styles.toggleButton}
          onClick={toggleContent}
        >
          <div className={styles.buttonIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <span>FAITHree Stories Highlights</span>
          <div className={`${styles.chevron} ${isContentVisible ? styles.chevronUp : styles.chevronDown}`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
      
      {/* Sliding Modal Container */}
      <div className={`${styles.modalContainer} ${isContentVisible ? styles.modalOpen : styles.modalClosed}`}>
        <div className={styles.modalContent}>
          <Highlights onClose={toggleContent} />
        </div>
      </div>
    </div>
  );
}