'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './faithree.module.css';
import { Highlights, HeroSection } from './sections';

export default function FAITHreePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [theme, setTheme] = useState('morning'); // 'morning' or 'rainy'

  // Generate rain drops data once
  const rainDrops = useMemo(() => {
    return Array.from({ length: 50 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.5 + Math.random() * 0.5
    }));
  }, []);

  const toggleContent = () => {
    setIsContentVisible(!isContentVisible);
  };

  const toggleTheme = () => {
    setTheme(theme === 'morning' ? 'rainy' : 'morning');
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY || window.pageYOffset || 0);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* First Section with Floating Ground */}
      <div className={`${styles.faithreeContainer} ${styles[theme]}`}>
        <div className={styles.firstSection}>
          {/* Eco-themed background */}
          <div className={styles.ecoBackground}>
        {/* Sky with clouds */}
        <div className={`${styles.sky} ${styles[`sky${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          {/* Rain drops for rainy theme */}
          {theme === 'rainy' && (
            <div className={styles.rainContainer}>
              {rainDrops.map((drop) => (
                <div 
                  key={drop.id}
                  className={styles.raindrop}
                  style={{
                    left: `${drop.left}%`,
                    animationDelay: `${drop.delay}s`,
                    animationDuration: `${drop.duration}s`
                  }}
                ></div>
              ))}
            </div>
          )}
          
          {/* Clouds - only show in morning theme */}
          {theme === 'morning' && (
            <>
              <div className={styles.cloud} style={{ '--delay': '0s', '--duration': '20s' }}></div>
              <div className={styles.cloud} style={{ '--delay': '5s', '--duration': '25s' }}></div>
              <div className={styles.cloud} style={{ '--delay': '10s', '--duration': '30s' }}></div>
            </>
          )}
        </div>
        
        {/* Rolling hills - SVG paths */}
        <div className={styles.hills}>
          <svg className={styles.hillsSvg} viewBox="0 0 100 50" preserveAspectRatio="none">
            
            {/* Back hill layer - deepest green */}
            <path
              d="M0,50 L0,38 C8,35 16,32 24,34 C32,32 40,30 48,32 C56,30 64,28 72,30 C80,28 88,26 96,28 C98,27 100,28 100,30 L100,50 Z"
              fill={theme === 'rainy' ? "#2E5C3A" : "#7CB342"}
              opacity={theme === 'rainy' ? "0.7" : "0.9"}
            />
            {/* Middle hill layer - medium green */}
            <path
              d="M0,50 L0,32 C6,29 14,26 22,28 C30,26 38,24 46,26 C54,24 62,22 70,24 C78,22 86,20 94,22 C97,21 100,22 100,24 L100,50 Z"
              fill={theme === 'rainy' ? "#3D7047" : "#8BC34A"}
              opacity={theme === 'rainy' ? "0.75" : "0.95"}
            />
            {/* Front hill layer - lightest green */}
            <path
              d="M0,50 L0,26 C10,23 20,20 30,22 C40,20 50,18 60,20 C70,18 80,16 90,18 C95,17 100,18 100,20 L100,50 Z"
              fill={theme === 'rainy' ? "#4A7C56" : "#A5D6A7"}
              opacity="1"
            />
          </svg>
        </div>
        
        {/* Animated butterflies - only show in morning theme */}
        {theme === 'morning' && (
        <div className={styles.butterflyContainer}>
          <div className={styles.butterfly} style={{ '--delay': '0.5s' }}>
            <svg viewBox="0 0 100 80" className={styles.butterflySvg}>
              {/* Left wing */}
              <ellipse cx="35" cy="40" rx="25" ry="35" fill="#FFD700" opacity="0.9" transform="rotate(-45 35 40)"/>
              <ellipse cx="35" cy="40" rx="20" ry="28" fill="#FFA500" opacity="0.7" transform="rotate(-45 35 40)"/>
              
              {/* Right wing */}
              <ellipse cx="65" cy="40" rx="25" ry="35" fill="#FFD700" opacity="0.9" transform="rotate(45 65 40)"/>
              <ellipse cx="65" cy="40" rx="20" ry="28" fill="#FFA500" opacity="0.7" transform="rotate(45 65 40)"/>
              
              {/* Body */}
              <ellipse cx="50" cy="40" rx="3" ry="35" fill="#8B4513"/>
              
              {/* Antennae */}
              <line x1="50" y1="5" x2="45" y2="15" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
              <line x1="50" y1="5" x2="55" y2="15" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="45" cy="15" r="2" fill="#000"/>
              <circle cx="55" cy="15" r="2" fill="#000"/>
            </svg>
          </div>
          <div className={styles.butterfly} style={{ '--delay': '1s' }}>
            <svg viewBox="0 0 100 80" className={styles.butterflySvg}>
              {/* Left wing */}
              <ellipse cx="35" cy="40" rx="25" ry="35" fill="#FF69B4" opacity="0.9" transform="rotate(-45 35 40)"/>
              <ellipse cx="35" cy="40" rx="20" ry="28" fill="#FF1493" opacity="0.7" transform="rotate(-45 35 40)"/>
              
              {/* Right wing */}
              <ellipse cx="65" cy="40" rx="25" ry="35" fill="#FF69B4" opacity="0.9" transform="rotate(45 65 40)"/>
              <ellipse cx="65" cy="40" rx="20" ry="28" fill="#FF1493" opacity="0.7" transform="rotate(45 65 40)"/>
              
              {/* Body */}
              <ellipse cx="50" cy="40" rx="3" ry="35" fill="#8B4513"/>
              
              {/* Antennae */}
              <line x1="50" y1="5" x2="45" y2="15" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
              <line x1="50" y1="5" x2="55" y2="15" stroke="#8B4513" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="45" cy="15" r="2" fill="#000"/>
              <circle cx="55" cy="15" r="2" fill="#000"/>
            </svg>
          </div>
        </div>
        )}
        
        {/* Floating ground with tree */}
        <div 
          className={styles.floatingGround}
          style={{
            transform: `translate(-50%, calc(-50% + ${scrollY}px))`
          }}
        >
          <div className={styles.groundPlatform}>
            <svg className={styles.groundSvg} viewBox="0 0 200 60" preserveAspectRatio="none">
              {/* Ground/grass platform */}
              <ellipse cx="100" cy="50" rx="80" ry="10" fill="#4CAF50" opacity="0.9"/>
              <ellipse cx="100" cy="50" rx="70" ry="8" fill="#66BB6A" opacity="0.8"/>
              
              {/* Grass texture */}
              <path d="M 20 50 Q 25 45 30 50 T 40 50 T 50 50 T 60 50 T 70 50 T 80 50 T 90 50 T 100 50 T 110 50 T 120 50 T 130 50 T 140 50 T 150 50 T 160 50 T 170 50 T 180 50" 
                    stroke="#2E7D32" strokeWidth="1" fill="none" opacity="0.6"/>
            </svg>
            
            {/* Tree in center */}
            <div className={styles.tree}>
              <svg className={styles.treeSvg} viewBox="0 0 120 150">
                {/* Tree trunk */}
                <rect x="55" y="80" width="10" height="70" fill="#8B4513" rx="2"/>
                <rect x="57" y="80" width="6" height="70" fill="#A0522D" rx="1" opacity="0.7"/>
                
                {/* Tree crown/foliage */}
                <circle cx="60" cy="60" r="25" fill="#2E7D32"/>
                <circle cx="60" cy="50" r="22" fill="#4CAF50"/>
                <circle cx="60" cy="45" r="20" fill="#66BB6A"/>
                <circle cx="50" cy="55" r="18" fill="#4CAF50"/>
                <circle cx="70" cy="55" r="18" fill="#4CAF50"/>
                <circle cx="60" cy="35" r="15" fill="#66BB6A"/>
              </svg>
            </div>
          </div>
        </div>
        </div>
        </div>
      
      {/* Theme Toggle Button */}
      <div className={styles.themeToggleContainer}>
        <button 
          className={styles.themeToggleButton}
          onClick={toggleTheme}
          title={`Switch to ${theme === 'morning' ? 'rainy' : 'morning'} theme`}
        >
          {theme === 'morning' ? (
            <svg className={styles.themeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 8 6 8 10C8 13.31 10.69 16 14 16C14 16 18 12 18 8C18 4.69 15.31 2 12 2Z" fill="currentColor"/>
              <path d="M12 6V2M12 22V18M6 12H2M22 12H18M19.07 19.07L16.24 16.24M19.07 4.93L16.24 7.76M4.93 19.07L7.76 16.24M4.93 4.93L7.76 7.76" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg className={styles.themeIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C12 2 16 6 16 10C16 13.31 13.31 16 10 16C10 16 6 12 6 8C6 4.69 8.69 2 12 2Z" fill="currentColor" opacity="0.3"/>
              <path d="M12 2C16.97 2 21 6.03 21 11C21 15.97 16.97 20 12 20C7.03 20 3 15.97 3 11C3 6.03 7.03 2 12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M8 8L16 16M16 8L8 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          )}
          <span>{theme === 'morning' ? 'Rainy' : 'Morning'}</span>
        </button>
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
      
      {/* Hero Section */}
      <HeroSection />
    </>
  );
}