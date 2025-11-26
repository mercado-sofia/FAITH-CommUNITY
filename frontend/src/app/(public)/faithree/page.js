'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import Image from 'next/image';
import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import { LuMousePointerClick } from "react-icons/lu";
import styles from './faithree.module.css';
// import Highlights from './Highlights/highlights';
import { TreeModel, LoadingOverlay, PageLoadingOverlay } from './components';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

import { API_BASE_URL } from '@/config/api';

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
  const [isInstructionOpen, setIsInstructionOpen] = useState(false); // Mobile instruction toggle
  const [isModelLoading, setIsModelLoading] = useState(true); // Track 3D model loading

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
        
        // Dynamically import API_BASE_URL to ensure it's available
        const { API_BASE_URL: dynamicApiUrl } = await import('@/config/api');
        const baseUrl = dynamicApiUrl || '';
        
        const response = await fetch(`${baseUrl}/api/highlights/public/featured`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('[FAITHree] API response error:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Failed to fetch featured highlights: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
        // API already returns highlights in order (by display_order)
        // No limit - can feature unlimited highlights
        setFeaturedHighlights(highlights);
      } catch (error) {
        // Enhanced error logging
        if (error.name === 'AbortError') {
          console.error('[FAITHree] Request timeout: Featured highlights fetch took too long');
        } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
          console.error('[FAITHree] Network error: Cannot connect to backend API', {
            error: error.message,
            API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'not set',
            suggestion: 'Check if NEXT_PUBLIC_API_URL is set correctly in deployment environment'
          });
        } else {
          console.error('[FAITHree] Error fetching featured highlights:', {
            error: error.message,
            stack: error.stack,
            name: error.name
          });
        }
        // Set empty array on error - stars won't show but page will still load
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
        
        // Note: Empty string is valid in development (uses Next.js rewrites)
        // Only check for undefined/null, not falsy values
        if (typeof window === 'undefined' || (API_BASE_URL === undefined || API_BASE_URL === null)) {
          setOrganizations([]);
          setIsLoadingOrgs(false);
          return;
        }
        
        // Fetch approved highlights to extract unique organizations
        const response = await fetch(`${API_BASE_URL || ''}/api/highlights/public/approved`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch highlights: ${response.status}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
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

  // Split featured highlights into chunks of 12 for multiple trees
  const highlightChunks = useMemo(() => {
    const chunks = [];
    const chunkSize = 12;
    for (let i = 0; i < featuredHighlights.length; i += chunkSize) {
      chunks.push(featuredHighlights.slice(i, i + chunkSize));
    }
    // If no highlights, still create one empty chunk to show at least one tree
    if (chunks.length === 0) {
      chunks.push([]);
    }
    return chunks;
  }, [featuredHighlights]);

  // Track loaded trees
  const [loadedTrees, setLoadedTrees] = useState(new Set());
  
  // Handle individual tree load
  const handleTreeLoad = useCallback((treeIndex) => {
    setLoadedTrees(prev => {
      const newSet = new Set(prev);
      newSet.add(treeIndex);
      // Only set isModelLoading to false when all trees are loaded
      if (newSet.size === highlightChunks.length && highlightChunks.length > 0) {
        setIsModelLoading(false);
      }
      return newSet;
    });
  }, [highlightChunks.length]);
  
  // Reset loaded trees when chunks change
  useEffect(() => {
    setLoadedTrees(new Set());
    // If no chunks or empty chunks, set loading to false immediately
    if (highlightChunks.length === 0 || (highlightChunks.length === 1 && highlightChunks[0].length === 0)) {
      setIsModelLoading(false);
    } else {
      setIsModelLoading(true);
    }
  }, [highlightChunks]);

  return (
    <>
      {/* Page Loading Overlay - Shows while 3D models are loading */}
      <PageLoadingOverlay isLoading={isModelLoading} />
      
      {/* Full-screen FAITHree Environment */}
      <div 
        className={`${styles.faithreeContainer} ${isTransitioning ? styles.transitioning : ''}`}
        aria-label="FAITHree interactive environment"
      >
        {/* Theme Transition Loading Overlay */}
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
              <defs>
                {/* Sunny theme gradient */}
                <linearGradient id="sunnyGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#aefb82" stopOpacity="1" />
                  <stop offset="50%" stopColor="#84e090" stopOpacity="1" />
                  <stop offset="100%" stopColor="#4bc788" stopOpacity="1" />
                </linearGradient>
                {/* Rainy theme gradient */}
                <linearGradient id="rainyGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#32b974" stopOpacity="0.75" />
                  <stop offset="50%" stopColor="#28a063" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#1d8751" stopOpacity="0.65" />
                </linearGradient>
              </defs>
              {/* Back hill layer - deepest green */}
              <path
                d="M0,50 L0,38 C8,35 16,32 24,34 C32,32 40,30 48,32 C56,30 64,28 72,30 C80,28 88,26 96,28 C98,27 100,28 100,30 L100,50 Z"
                fill={theme === 'rainy' ? "url(#rainyGroundGradient)" : "url(#sunnyGroundGradient)"}
                opacity={theme === 'rainy' ? "0.7" : "0.9"}
                style={{
                  transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                }}
              />
              {/* Middle hill layer - medium green */}
              <path
                d="M0,50 L0,32 C6,29 14,26 22,28 C30,26 38,24 46,26 C54,24 62,22 70,24 C78,22 86,20 94,22 C97,21 100,22 100,24 L100,50 Z"
                fill={theme === 'rainy' ? "url(#rainyGroundGradient)" : "url(#sunnyGroundGradient)"}
                opacity={theme === 'rainy' ? "0.75" : "0.95"}
                style={{
                  transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                }}
              />
              {/* Front hill layer - lightest green */}
              <path
                d="M0,50 L0,26 C10,23 20,20 30,22 C40,20 50,18 60,20 C70,18 80,16 90,18 C95,17 100,18 100,20 L100,50 Z"
                fill={theme === 'rainy' ? "url(#rainyGroundGradient)" : "url(#sunnyGroundGradient)"}
                opacity="1"
                style={{
                  transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                }}
              />
            </svg>
          </div>
        </div>
        
        {/* 3D Tree Models - Multiple trees for chunks of 12 highlights */}
        <div className={styles.floatingGround}>
          <div className={styles.treesContainer}>
            {highlightChunks.map((chunk, index) => {
              // Position trees horizontally: tree 1 at x=0, tree 2 at x=8, tree 3 at x=16, etc.
              const treeXOffset = index * 8;
              const chunkOffset = index * 12;
              
              return (
                <div 
                  key={index} 
                  className={styles.tree3D}
                >
                  <TreeModel 
                    theme={theme} 
                    treePosition={[treeXOffset, -1.8, 0]} 
                    chunkHighlights={chunk}
                    chunkOffset={chunkOffset}
                    allFeaturedHighlights={featuredHighlights}
                    onLoad={() => handleTreeLoad(index)}
                  />
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Theme Toggle Button - Desktop */}
        <div className={`${styles.themeToggleContainer} ${styles[`toggleButtons${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
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
          {/* Click Me Button - Beside Theme Toggle (Desktop) */}
          <button
            className={`${styles.instructionToggleButton} ${styles[`toggleButtons${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
            onClick={() => setIsInstructionOpen(!isInstructionOpen)}
            aria-label={isInstructionOpen ? 'Close instructions' : 'Open instructions'}
            aria-expanded={isInstructionOpen}
          >
            <LuMousePointerClick className={styles.instructionToggleIcon} aria-hidden="true" />
            <span className={styles.instructionToggleText}>Click me!</span>
          </button>
        </div>

        {/* Click Me Button - Top Left (Mobile) */}
        <div className={`${styles.instructionToggleContainer} ${styles[`toggleButtons${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
          <button
            className={`${styles.instructionToggleButton} ${styles[`toggleButtons${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
            onClick={() => setIsInstructionOpen(!isInstructionOpen)}
            aria-label={isInstructionOpen ? 'Close instructions' : 'Open instructions'}
            aria-expanded={isInstructionOpen}
          >
            <LuMousePointerClick className={styles.instructionToggleIcon} aria-hidden="true" />
            <span className={styles.instructionToggleText}>Click me!</span>
          </button>
        </div>

        {/* Instructional Text - Right Side */}
        <div className={`${styles.instructionContainer} ${styles[`instruction${theme.charAt(0).toUpperCase() + theme.slice(1)}`]} ${isInstructionOpen ? styles.instructionOpen : ''}`}>
          {/* Instruction Content */}
          <div className={`${styles.instructionContent} ${isInstructionOpen ? styles.instructionContentOpen : ''}`}>
            <div className={styles.instructionIcon}>
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" fill="currentColor"/>
              </svg>
            </div>
            <p className={styles.instructionText}>
              <span className={styles.instructionHighlight}>Click the stars</span> on the tree to discover inspiring success stories from our programs
            </p>
          </div>
        </div>
      </div>
      
      {/* Toggle Buttons Container */}
      <div className={`${styles.toggleButtonsContainer} ${styles[`toggleButtons${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}>
        {/* Highlights Toggle Button */}
        {/* <div className={styles.toggleButtonContainer}>
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
        </div> */}

        {/* Organization Toggle Buttons */}
        {/* {!isLoadingOrgs && organizations.length > 0 && (
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
        )} */}
      </div>
      
      {/* Sliding Modal Container for Highlights */}
      {/* <div 
        className={`${styles.modalContainer} ${isContentVisible ? styles.modalOpen : styles.modalClosed}`}
        aria-hidden={!isContentVisible}
        aria-modal={isContentVisible}
      >
        <div className={styles.modalContent}>
          <Highlights onClose={toggleContent} />
        </div>
      </div> */}

      {/* Sliding Modal Container for Organization Highlights */}
      {/* <div 
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
      </div> */}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FAITHreePage);