'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { FiSun } from "react-icons/fi";
import { IoRainyOutline } from "react-icons/io5";
import { LuMousePointerClick } from "react-icons/lu";
import styles from './faithree.module.css';
import { TreeModel, LoadingOverlay, PageLoadingOverlay, WelcomeSection, Filters } from './components';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

import { API_BASE_URL } from '@/config/api';

function FAITHreePage() {
  const [showWelcome, setShowWelcome] = useState(true); // Show welcome section initially
  const [theme, setTheme] = useState('morning'); // 'morning' or 'rainy'
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [nextTheme, setNextTheme] = useState(null);
  const [featuredHighlights, setFeaturedHighlights] = useState([]);
  const [isInstructionOpen, setIsInstructionOpen] = useState(false); // Mobile instruction toggle
  const [isModelLoading, setIsModelLoading] = useState(true); // Track 3D model loading
  const [selectedOrganization, setSelectedOrganization] = useState(null); // Filter: organization
  const [selectedYear, setSelectedYear] = useState(null); // Filter: year

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
        
        const response = await fetch(`${API_BASE_URL || ''}/api/highlights/public/featured`, {
          credentials: 'include', // CRITICAL: Include httpOnly cookies
          headers: {
            'Content-Type': 'application/json',
          },
          // Add timeout to prevent hanging requests
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch featured highlights: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        const highlights = data.highlights || [];
        
        // API already returns highlights in order (by display_order)
        // No limit - can feature unlimited highlights
        setFeaturedHighlights(highlights);
      } catch (error) {
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


  // Extract unique organizations from featured highlights
  const uniqueOrganizations = useMemo(() => {
    const orgMap = new Map();
    featuredHighlights.forEach(highlight => {
      if (highlight.organization_id && highlight.organization_name && highlight.organization_acronym) {
        const orgId = highlight.organization_id;
        if (!orgMap.has(orgId)) {
          orgMap.set(orgId, {
            id: orgId,
            name: highlight.organization_name,
            acronym: highlight.organization_acronym,
            logo: highlight.organization_logo || null
          });
        }
      }
    });
    return Array.from(orgMap.values()).sort((a, b) => 
      a.acronym.localeCompare(b.acronym)
    );
  }, [featuredHighlights]);

  // Extract unique years from featured highlights
  const uniqueYears = useMemo(() => {
    const yearSet = new Set();
    featuredHighlights.forEach(highlight => {
      if (highlight.year) {
        yearSet.add(highlight.year);
      }
    });
    return Array.from(yearSet);
  }, [featuredHighlights]);

  // Filter featured highlights based on selected organization and year
  const filteredHighlights = useMemo(() => {
    return featuredHighlights.filter(highlight => {
      const orgMatch = selectedOrganization === null || highlight.organization_id === selectedOrganization;
      const yearMatch = selectedYear === null || highlight.year === selectedYear;
      return orgMatch && yearMatch;
    });
  }, [featuredHighlights, selectedOrganization, selectedYear]);

  // Split filtered highlights into chunks of 12 for multiple trees
  const highlightChunks = useMemo(() => {
    const chunks = [];
    const chunkSize = 12;
    for (let i = 0; i < filteredHighlights.length; i += chunkSize) {
      chunks.push(filteredHighlights.slice(i, i + chunkSize));
    }
    // If no highlights, still create one empty chunk to show at least one tree
    if (chunks.length === 0) {
      chunks.push([]);
    }
    return chunks;
  }, [filteredHighlights]);

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

  // Handle continue from welcome section
  const handleContinue = useCallback(() => {
    setShowWelcome(false);
  }, []);

  // Handle organization filter change
  const handleOrganizationChange = useCallback((orgId) => {
    setSelectedOrganization(orgId);
  }, []);

  // Handle year filter change
  const handleYearChange = useCallback((year) => {
    setSelectedYear(year);
  }, []);

  return (
    <>
      {/* Welcome Section */}
      {showWelcome && (
        <WelcomeSection 
          onContinue={handleContinue}
        />
      )}

      {/* Page Loading Overlay - Shows while 3D models are loading */}
      {!showWelcome && <PageLoadingOverlay isLoading={isModelLoading} />}
      
      {/* Full-screen FAITHree Environment */}
      {!showWelcome && (
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
                    allFeaturedHighlights={filteredHighlights}
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

        {/* Filters */}
        <Filters
          organizations={uniqueOrganizations}
          years={uniqueYears}
          selectedOrganization={selectedOrganization}
          selectedYear={selectedYear}
          onOrganizationChange={handleOrganizationChange}
          onYearChange={handleYearChange}
          theme={theme}
        />
        </div>
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FAITHreePage);