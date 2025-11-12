'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import styles from './faithree.module.css';
import Highlights from './Highlights/highlights';
import { TreeModel, LoadingOverlay } from './components';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

function FAITHreePage() {
  const [isContentVisible, setIsContentVisible] = useState(false);
  const [selectedOrgId, setSelectedOrgId] = useState(null);
  const [isOrgContentVisible, setIsOrgContentVisible] = useState(false);
  const [theme, setTheme] = useState('morning'); // 'morning' or 'rainy'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextTheme, setNextTheme] = useState(null);
  const [featuredHighlights, setFeaturedHighlights] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);

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
    // Close org content when opening highlights
    if (!isContentVisible) {
      setIsOrgContentVisible(false);
      setSelectedOrgId(null);
    }
  }, [isContentVisible]);

  const toggleOrgContent = useCallback((orgId) => {
    if (selectedOrgId === orgId && isOrgContentVisible) {
      // Close if clicking the same org
      setIsOrgContentVisible(false);
      setSelectedOrgId(null);
    } else {
      // Open new org
      setSelectedOrgId(orgId);
      setIsOrgContentVisible(true);
      // Close highlights when opening org
      setIsContentVisible(false);
    }
  }, [selectedOrgId, isOrgContentVisible]);

  const toggleTheme = useCallback(() => {
    if (isTransitioning) return;
    const newTheme = theme === 'morning' ? 'rainy' : 'morning';
    setNextTheme(newTheme);
    setIsTransitioning(true);
    // Change theme after a short delay to allow loading animation
    setTimeout(() => {
      setTheme(newTheme);
    }, 300);
    // Reset transition state after animation completes
    setTimeout(() => {
      setIsTransitioning(false);
      setNextTheme(null);
    }, 1000);
  }, [isTransitioning, theme]);

  // Prevent page scrolling since everything is full-screen and fixed
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) {
      return;
    }

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Cleanup: restore scroll when component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  // Fetch featured highlights from API
  useEffect(() => {
    const fetchFeaturedHighlights = async () => {
      try {
        // Check if we're in browser environment
        if (typeof window === 'undefined') {
          setFeaturedHighlights([]);
          return;
        }
        
        // Fetch featured highlights from API
        if (!API_BASE_URL) {
          console.error('API_BASE_URL is not set. Please configure NEXT_PUBLIC_API_URL environment variable.');
          setFeaturedHighlights([]);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/highlights/public/featured`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch featured highlights: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
        // API already returns highlights in order (by display_order)
        // Limit to 8 just in case
        const orderedFeaturedHighlights = highlights.slice(0, 8);
        
        console.log('Featured highlights loaded from API:', {
          count: orderedFeaturedHighlights.length,
          highlights: orderedFeaturedHighlights.map(h => ({ id: h.id, title: h.title, displayOrder: h.display_order }))
        });
        
        setFeaturedHighlights(orderedFeaturedHighlights);
      } catch (error) {
        console.error('Error fetching featured highlights:', error);
        setFeaturedHighlights([]);
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

  // Fetch organizations from highlights to get unique orgs
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        setIsLoadingOrgs(true);
        
        if (typeof window === 'undefined' || !API_BASE_URL) {
          setOrganizations([]);
          setIsLoadingOrgs(false);
          return;
        }
        
        // Fetch approved highlights to extract unique organizations
        const response = await fetch(`${API_BASE_URL}/api/highlights/public/approved`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch highlights: ${response.status}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
        console.log('Fetched highlights for org extraction:', highlights.length);
        if (highlights.length > 0) {
          console.log('Sample highlight:', {
            id: highlights[0].id,
            organization_id: highlights[0].organization_id,
            organization_name: highlights[0].organization_name,
            organization_acronym: highlights[0].organization_acronym
          });
        }
        
        // Extract unique organizations
        const orgMap = new Map();
        highlights.forEach(highlight => {
          // Check if we have organization info (need at least name and acronym)
          if (highlight.organization_name && highlight.organization_acronym) {
            // Use organization_id as key if available, otherwise use name+acronym composite
            const orgId = highlight.organization_id;
            const orgKey = orgId || `${highlight.organization_name}_${highlight.organization_acronym}`;
            
            if (!orgMap.has(orgKey)) {
              orgMap.set(orgKey, {
                id: orgId || orgKey, // Use organization_id if available, otherwise use composite key
                name: highlight.organization_name,
                acronym: highlight.organization_acronym,
                logo: highlight.organization_logo || null
              });
            }
          }
        });
        
        const uniqueOrgs = Array.from(orgMap.values()).sort((a, b) => 
          a.acronym.localeCompare(b.acronym)
        );
        
        console.log('Extracted organizations:', uniqueOrgs);
        setOrganizations(uniqueOrgs);
      } catch (error) {
        console.error('Error fetching organizations:', error);
        setOrganizations([]);
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, []);

  return (
    <>
      {/* Full-screen FAITHree Environment */}
      <div 
        className={`${styles.faithreeContainer} ${isTransitioning ? styles.transitioning : ''}`}
        aria-label="FAITHree interactive environment"
      >
        {/* Loading Overlay */}
        {isTransitioning && <LoadingOverlay nextTheme={nextTheme} />}
        
        {/* Eco-themed background */}
        <div className={styles.ecoBackground}>
          {/* Sky with clouds */}
          <div 
            className={`${styles.sky} ${styles[`sky${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
            style={{
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
          
          {/* Rolling hills - SVG paths */}
          <div className={styles.hills}>
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
        </div>
        
        {/* 3D Tree Model */}
        <div className={styles.floatingGround}>
          <div className={styles.tree3D}>
            <TreeModel 
              theme={theme} 
              treePosition={[0, -1.8, 0]} 
              featuredHighlights={featuredHighlights}
            />
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
      
      {/* Toggle Buttons Container */}
      <div className={styles.toggleButtonsContainer}>
        {/* Highlights Toggle Button */}
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

        {/* Organization Toggle Buttons */}
        {!isLoadingOrgs && organizations.length > 0 && (
          <div className={styles.orgTogglesContainer}>
            {organizations.map((org, index) => (
              <div key={org.id || `org-${index}`} className={styles.orgToggleWrapper}>
                <button
                  className={`${styles.orgToggleButton} ${selectedOrgId === org.id && isOrgContentVisible ? styles.orgToggleActive : ''}`}
                  onClick={() => toggleOrgContent(org.id)}
                  onMouseEnter={(e) => {
                    e.currentTarget.setAttribute('data-hover', 'true');
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.setAttribute('data-hover', 'false');
                  }}
                  aria-label={`View highlights from ${org.name}`}
                  aria-expanded={selectedOrgId === org.id && isOrgContentVisible}
                >
                  {org.logo && (
                    <div className={styles.orgToggleLogo}>
                      <Image
                        src={org.logo}
                        alt={org.acronym}
                        width={24}
                        height={24}
                        className={styles.orgLogoImage}
                      />
                    </div>
                  )}
                  <span className={styles.orgToggleAcronym}>{org.acronym}</span>
                  <span className={styles.orgToggleName}>{org.name}</span>
                  <div className={`${styles.chevron} ${selectedOrgId === org.id && isOrgContentVisible ? styles.chevronUp : styles.chevronDown}`}>
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Sliding Modal Container for Highlights */}
      <div 
        className={`${styles.modalContainer} ${isContentVisible ? styles.modalOpen : styles.modalClosed}`}
        aria-hidden={!isContentVisible}
        aria-modal={isContentVisible}
      >
        <div className={styles.modalContent}>
          <Highlights onClose={toggleContent} />
        </div>
      </div>

      {/* Sliding Modal Container for Organization Highlights */}
      <div 
        className={`${styles.modalContainer} ${isOrgContentVisible ? styles.modalOpen : styles.modalClosed}`}
        aria-hidden={!isOrgContentVisible}
        aria-modal={isOrgContentVisible}
      >
        <div className={styles.modalContent}>
          <Highlights 
            onClose={() => {
              setIsOrgContentVisible(false);
              setSelectedOrgId(null);
            }}
            organizationId={selectedOrgId}
          />
        </div>
      </div>
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FAITHreePage);