'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import styles from './faithree.module.css';
import { Highlights, HeroSection } from './sections';
import { TreeModel } from './components';
import { getFeaturedHighlightsOrdered } from '@/app/superadmin/highlights/components/StarButton';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function FAITHreePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [theme, setTheme] = useState('morning'); // 'morning' or 'rainy'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [featuredHighlights, setFeaturedHighlights] = useState([]);
  const [isLoadingHighlights, setIsLoadingHighlights] = useState(true);

  // Generate rain drops data once with more variety
  const rainDrops = useMemo(() => {
    const count = prefersReducedMotion ? 20 : 80; // Fewer drops if reduced motion
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 0.4 + Math.random() * 0.6,
      speed: 0.3 + Math.random() * 0.4, // Variable speed
      size: 1 + Math.random() * 2 // Variable size
    }));
  }, []);

  const toggleContent = useCallback(() => {
    setIsContentVisible(prev => !prev);
  }, []);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTheme(prev => prev === 'morning' ? 'rainy' : 'morning');
    // Reset transition state after animation completes
    setTimeout(() => setIsTransitioning(false), 600);
  }, [isTransitioning]);

  // Optimized scroll handler with throttling
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollY(window.scrollY || window.pageYOffset || 0);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Calculate parallax offsets for different layers
  const parallaxOffset = useMemo(() => ({
    hills: scrollY * 0.3,
    clouds: scrollY * 0.1,
    ground: scrollY * 0.5
  }), [scrollY]);

  // Fetch featured highlights
  useEffect(() => {
    const fetchFeaturedHighlights = async () => {
      try {
        setIsLoadingHighlights(true);
        
        // Get ordered featured highlight IDs from localStorage
        const featuredIds = getFeaturedHighlightsOrdered();
        
        if (featuredIds.length === 0) {
          setFeaturedHighlights([]);
          setIsLoadingHighlights(false);
          return;
        }
        
        // Fetch all approved highlights from API
        const response = await fetch(`${API_BASE_URL}/api/highlights/public/approved`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch highlights');
        }
        
        const data = await response.json();
        const allHighlights = data.highlights || [];
        
        // Match featured IDs with full highlight data, preserving order
        // Convert both to strings for comparison to handle number/string mismatches
        const orderedFeaturedHighlights = featuredIds
          .map(id => allHighlights.find(h => String(h.id) === String(id)))
          .filter(Boolean) // Remove any undefined values (in case highlight was deleted)
          .slice(0, 8); // Ensure max 8 highlights
        
        setFeaturedHighlights(orderedFeaturedHighlights);
      } catch (error) {
        console.error('Error fetching featured highlights:', error);
        setFeaturedHighlights([]);
      } finally {
        setIsLoadingHighlights(false);
      }
    };

    fetchFeaturedHighlights();

    // Listen for changes to featured highlights
    const handleStarredChange = () => {
      fetchFeaturedHighlights();
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('starredHighlightsChanged', handleStarredChange);
      return () => {
        window.removeEventListener('starredHighlightsChanged', handleStarredChange);
      };
    }
  }, []);

  return (
    <>
      {/* First Section with Floating Ground */}
      <div 
        className={`${styles.faithreeContainer} ${styles[theme]} ${isTransitioning ? styles.transitioning : ''}`}
        aria-label="FAITHree interactive environment"
      >
        {/* Fixed dimension container for background and tree */}
        <div className={styles.sceneContainer}>
          <div className={styles.firstSection}>
            {/* Eco-themed background */}
            <div className={styles.ecoBackground}>
            {/* Sky with clouds */}
            <div 
              className={`${styles.sky} ${styles[`sky${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
              style={{
                transform: `translateY(${parallaxOffset.clouds}px)`,
                transition: prefersReducedMotion ? 'none' : 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
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
                        animationDuration: prefersReducedMotion ? '0.1s' : `${drop.duration}s`,
                        width: `${drop.size}px`,
                        height: `${15 + drop.size * 5}px`,
                        '--speed': drop.speed
                      }}
                      aria-hidden="true"
                    ></div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Rolling hills - SVG paths with parallax */}
            <div 
              className={styles.hills}
              style={{
                transform: `translateY(${parallaxOffset.hills}px)`,
                transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <svg className={styles.hillsSvg} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
                {/* Back hill layer - deepest green */}
                <path
                  d="M0,50 L0,38 C8,35 16,32 24,34 C32,32 40,30 48,32 C56,30 64,28 72,30 C80,28 88,26 96,28 C98,27 100,28 100,30 L100,50 Z"
                  fill={theme === 'rainy' ? "#2E5C3A" : "#7CB342"}
                  opacity={theme === 'rainy' ? "0.7" : "0.9"}
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
                {/* Middle hill layer - medium green */}
                <path
                  d="M0,50 L0,32 C6,29 14,26 22,28 C30,26 38,24 46,26 C54,24 62,22 70,24 C78,22 86,20 94,22 C97,21 100,22 100,24 L100,50 Z"
                  fill={theme === 'rainy' ? "#3D7047" : "#8BC34A"}
                  opacity={theme === 'rainy' ? "0.75" : "0.95"}
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
                {/* Front hill layer - lightest green */}
                <path
                  d="M0,50 L0,26 C10,23 20,20 30,22 C40,20 50,18 60,20 C70,18 80,16 90,18 C95,17 100,18 100,20 L100,50 Z"
                  fill={theme === 'rainy' ? "#4A7C56" : "#A5D6A7"}
                  opacity="1"
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
              </svg>
            </div>
            
            
            {/* 3D Tree Model */}
            <div 
              className={styles.floatingGround}
              style={{
                transform: `translate(-50%, calc(-35% + ${parallaxOffset.ground}px))`,
                transition: prefersReducedMotion ? 'none' : 'transform 0.1s ease-out'
              }}
            >
              <div className={styles.tree3D}>
                <TreeModel 
                  theme={theme} 
                  treePosition={[0, -1.8, 0]} 
                  featuredHighlights={featuredHighlights}
                />
              </div>
            </div>
          </div>
          
          {/* Theme Toggle Button */}
          <div className={styles.themeToggleContainer}>
        <button 
          className={`${styles.themeToggleButton} ${isTransitioning ? styles.disabled : ''}`}
          onClick={toggleTheme}
          disabled={isTransitioning}
          title={`Switch to ${theme === 'morning' ? 'rainy' : 'morning'} theme`}
          aria-label={`Switch to ${theme === 'morning' ? 'rainy' : 'morning'} theme`}
          aria-pressed={theme === 'rainy'}
        >
          {theme === 'morning' ? (
            <>
              <FiSun className={styles.themeIcon} aria-hidden="true" />
              <span>Sunny</span>
            </>
          ) : (
            <>
              <IoRainyOutline className={styles.themeIcon} aria-hidden="true" />
              <span>Rainy</span>
            </>
          )}
        </button>
      </div>
        </div>
        </div>
      
      {/* Toggle Button */}
      <div className={styles.toggleButtonContainer}>
        <button 
          className={styles.toggleButton}
          onClick={toggleContent}
          aria-label={isContentVisible ? 'Close FAITHree Stories Highlights' : 'Open FAITHree Stories Highlights'}
          aria-expanded={isContentVisible}
        >
          <div className={styles.buttonIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
            </svg>
          </div>
          <span>FAITHree Stories Highlights</span>
          <div className={`${styles.chevron} ${isContentVisible ? styles.chevronUp : styles.chevronDown}`}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </button>
      </div>
      
      {/* Sliding Modal Container */}
      <div 
        className={`${styles.modalContainer} ${isContentVisible ? styles.modalOpen : styles.modalClosed}`}
        aria-hidden={!isContentVisible}
        aria-modal={isContentVisible}
      >
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

// Memoize the component to prevent unnecessary re-renders
export default memo(FAITHreePage);