'use client';

import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import styles from './faithree.module.css';
import { TreeModel, PageLoadingOverlay, WelcomeSection, Filters, ImpactLevelShowcase, TreeNavigation } from './components';
import { useFaithreeData } from '@/hooks/(public)/useFaithreeData';
import { useFiltering } from '@/hooks/(public)/useFiltering';
import { useTheme } from '@/hooks/(public)/useTheme';
import { useTreeNavigation } from '@/hooks/(public)/useTreeNavigation';
import { generateRainDrops, generateStars } from '@/utils/(public)/backgroundEffects';
import {
  LOADING_DELAY,
  MODEL_LOAD_DELAY,
  BACKGROUND_PRELOAD_TIMEOUT,
  SELECT_BACKGROUND_PATH,
  TREE_BACKGROUND_PATH,
  SELECT_BACKGROUND_PATH_MOBILE,
  TREE_BACKGROUND_PATH_MOBILE,
  CHUNK_SIZE,
  RAIN_DROP_HEIGHT_BASE,
  RAIN_DROP_HEIGHT_MULTIPLIER,
} from './constants';

// Check for reduced motion preference
const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches 
  : false;

function FAITHreePage() {
  // UI State
  const [showWelcome, setShowWelcome] = useState(true); // Show welcome section initially
  const [isInitialView, setIsInitialView] = useState(true); // Track if no organization has been selected yet
  const [isModelLoading, setIsModelLoading] = useState(true); // Track 3D model loading
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false); // Track background SVG loading

  // Data fetching
  const { allOrganizations, featuredHighlights } = useFaithreeData();

  // Filtering and chunking
  const {
    selectedOrganization,
    selectedYear,
    showAllYears,
    uniqueYears,
    filteredHighlights,
    highlightChunks,
    handleOrganizationChange: handleFilterOrganizationChange,
    handleYearChange: handleFilterYearChange,
  } = useFiltering(featuredHighlights);

  // Theme management
  const handleThemeChange = useCallback((newTheme, oldTheme) => {
    // When theme changes, reset loading state to show overlay during model reload
    if (selectedOrganization !== null && filteredHighlights.length > 0) {
      setIsModelLoading(true);
    }
  }, [selectedOrganization, filteredHighlights.length]);

  const theme = useTheme(isInitialView, filteredHighlights.length, handleThemeChange);

  // Tree navigation
  const {
    currentTreeIndex,
    currentTreeHighlights,
    handleTreeSelect: handleNavTreeSelect,
    handlePreviousTree: handleNavPreviousTree,
    handleNextTree: handleNavNextTree,
  } = useTreeNavigation(highlightChunks);

  // Generate rain drops data once with more variety
  const rainDrops = useMemo(() => {
    return generateRainDrops(prefersReducedMotion);
  }, []);

  // Generate stars data for rainy mode background
  const stars = useMemo(() => {
    return generateStars(prefersReducedMotion);
  }, []);

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

  // Reset loading when filtered highlights change
  useEffect(() => {
    // If no organization is selected, don't show loading
    if (selectedOrganization === null) {
      setIsModelLoading(false);
      return;
    }
    
    // Set loading to true immediately when filters change
    // This ensures the overlay is shown before the TreeModel starts rendering
    setIsModelLoading(true);
    
    // If no highlights, set loading to false immediately (no tree to render)
    if (filteredHighlights.length === 0) {
      setIsModelLoading(false);
    }
  }, [filteredHighlights, selectedOrganization]);

  // Handle tree load - add small delay to ensure tree is fully rendered
  const handleTreeLoad = useCallback(() => {
    // Add a delay to ensure the tree model is fully rendered and visible
    // This prevents the black cube from showing before the tree is ready
    setTimeout(() => {
      setIsModelLoading(false);
    }, MODEL_LOAD_DELAY);
  }, []);

  // Handle continue from welcome section - preload background SVG
  const handleContinue = useCallback(() => {
    setIsBackgroundLoading(true);
    
    // Preload both desktop and mobile versions of select and tree background SVGs
    const selectBgImage = new Image();
    const treeBgImage = new Image();
    const selectBgImageMobile = new Image();
    const treeBgImageMobile = new Image();
    
    let selectLoaded = false;
    let treeLoaded = false;
    let selectMobileLoaded = false;
    let treeMobileLoaded = false;
    
    const checkAllLoaded = () => {
      if (selectLoaded && treeLoaded && selectMobileLoaded && treeMobileLoaded) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setIsBackgroundLoading(false);
          setShowWelcome(false);
        }, LOADING_DELAY);
      }
    };
    
    selectBgImage.onload = () => {
      selectLoaded = true;
      checkAllLoaded();
    };
    selectBgImage.onerror = () => {
      selectLoaded = true; // Mark as loaded even on error to not block
      checkAllLoaded();
    };
    
    treeBgImage.onload = () => {
      treeLoaded = true;
      checkAllLoaded();
    };
    treeBgImage.onerror = () => {
      treeLoaded = true; // Mark as loaded even on error to not block
      checkAllLoaded();
    };
    
    selectBgImageMobile.onload = () => {
      selectMobileLoaded = true;
      checkAllLoaded();
    };
    selectBgImageMobile.onerror = () => {
      selectMobileLoaded = true; // Mark as loaded even on error to not block
      checkAllLoaded();
    };
    
    treeBgImageMobile.onload = () => {
      treeMobileLoaded = true;
      checkAllLoaded();
    };
    treeBgImageMobile.onerror = () => {
      treeMobileLoaded = true; // Mark as loaded even on error to not block
      checkAllLoaded();
    };
    
    // Load all background images (desktop and mobile versions)
    selectBgImage.src = SELECT_BACKGROUND_PATH;
    treeBgImage.src = TREE_BACKGROUND_PATH;
    selectBgImageMobile.src = SELECT_BACKGROUND_PATH_MOBILE;
    treeBgImageMobile.src = TREE_BACKGROUND_PATH_MOBILE;
    
    // Fallback timeout in case images don't load
    setTimeout(() => {
      if (!selectLoaded || !treeLoaded || !selectMobileLoaded || !treeMobileLoaded) {
        setIsBackgroundLoading(false);
        setShowWelcome(false);
      }
    }, BACKGROUND_PRELOAD_TIMEOUT);
  }, []);

  // Handle organization filter change
  const handleOrganizationChange = useCallback((orgId) => {
    handleFilterOrganizationChange(orgId);
    // Mark that initial view is complete when organization is selected
    if (isInitialView) {
      setIsInitialView(false);
    }
  }, [isInitialView, handleFilterOrganizationChange]);

  // Handle tree navigation with loading state
  const handleTreeSelect = useCallback((treeIndex) => {
    const shouldShowLoading = handleNavTreeSelect(treeIndex);
    if (shouldShowLoading) {
      setIsModelLoading(true);
    }
  }, [handleNavTreeSelect]);

  const handlePreviousTree = useCallback(() => {
    const shouldShowLoading = handleNavPreviousTree();
    if (shouldShowLoading) {
      setIsModelLoading(true);
    }
  }, [handleNavPreviousTree]);

  const handleNextTree = useCallback(() => {
    const shouldShowLoading = handleNavNextTree();
    if (shouldShowLoading) {
      setIsModelLoading(true);
    }
  }, [handleNavNextTree]);

  return (
    <>
      {/* Welcome Section */}
      {showWelcome && (
        <WelcomeSection 
          onContinue={handleContinue}
        />
      )}

      {/* Background Loading Overlay - Shows while SVG background is loading after continue */}
      {isBackgroundLoading && <PageLoadingOverlay isLoading={true} />}

      {/* Page Loading Overlay - Shows while 3D models are loading (only when organization is selected) */}
      {!showWelcome && !isBackgroundLoading && selectedOrganization !== null && <PageLoadingOverlay isLoading={isModelLoading} />}
      
      {/* Full-screen FAITHree Environment */}
      {!showWelcome && !isBackgroundLoading && (
        <div 
          className={styles.faithreeContainer}
          aria-label="FAITHree interactive environment"
        >
        {/* Eco-themed background */}
        <div className={`${styles.ecoBackground} ${isInitialView ? styles.ecoBackgroundSelect : styles.ecoBackgroundTree}`}>
          {/* Sky with clouds */}
          <div 
            className={`${styles.sky} ${styles[`sky${theme.charAt(0).toUpperCase() + theme.slice(1)}`]}`}
            style={{
              transition: prefersReducedMotion ? 'none' : 'background 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
            }}
          >
            {/* Stars for rainy theme background */}
            {theme === 'rainy' && (
              <div className={styles.starsContainer}>
                {stars.map((star) => (
                  <div 
                    key={star.id}
                    className={styles.star}
                    style={{
                      left: `${star.left}%`,
                      top: `${star.top}%`,
                      width: `${star.size}px`,
                      height: `${star.size}px`,
                      opacity: star.opacity
                    }}
                    aria-hidden="true"
                  ></div>
                ))}
              </div>
            )}
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
                      height: `${RAIN_DROP_HEIGHT_BASE + drop.size * RAIN_DROP_HEIGHT_MULTIPLIER}px`,
                      '--speed': drop.speed
                    }}
                    aria-hidden="true"
                  ></div>
                ))}
              </div>
            )}
          </div>
          
          {/* Rolling hills - SVG paths - Hidden in rainy mode */}
          {theme !== 'rainy' && (
            <div className={styles.hills}>
              <svg className={styles.hillsSvg} viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                  {/* Sunny theme gradient */}
                  <linearGradient id="sunnyGroundGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#aefb82" stopOpacity="1" />
                    <stop offset="50%" stopColor="#84e090" stopOpacity="1" />
                    <stop offset="100%" stopColor="#4bc788" stopOpacity="1" />
                  </linearGradient>
                </defs>
                {/* Back hill layer - deepest green */}
                <path
                  d="M0,50 L0,38 C8,35 16,32 24,34 C32,32 40,30 48,32 C56,30 64,28 72,30 C80,28 88,26 96,28 C98,27 100,28 100,30 L100,50 Z"
                  fill="url(#sunnyGroundGradient)"
                  opacity="0.9"
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
                {/* Middle hill layer - medium green */}
                <path
                  d="M0,50 L0,32 C6,29 14,26 22,28 C30,26 38,24 46,26 C54,24 62,22 70,24 C78,22 86,20 94,22 C97,21 100,22 100,24 L100,50 Z"
                  fill="url(#sunnyGroundGradient)"
                  opacity="0.95"
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
                {/* Front hill layer - lightest green */}
                <path
                  d="M0,50 L0,26 C10,23 20,20 30,22 C40,20 50,18 60,20 C70,18 80,16 90,18 C95,17 100,18 100,20 L100,50 Z"
                  fill="url(#sunnyGroundGradient)"
                  opacity="1"
                  style={{
                    transition: prefersReducedMotion ? 'none' : 'fill 0.6s ease, opacity 0.6s ease'
                  }}
                />
              </svg>
            </div>
          )}
        </div>
        
        {/* 3D Tree Model - Shows current tree with up to 12 highlights */}
        {/* Only show tree model when an organization is selected and not in initial view */}
        {!isInitialView && (
          <div className={styles.floatingGround}>
            <div className={styles.treesContainer}>
              {selectedOrganization !== null ? (
                <div className={styles.tree3D}>
                  <TreeModel 
                    theme={theme} 
                    treePosition={[0, -1.8, 0]} 
                    chunkHighlights={currentTreeHighlights}
                    allFeaturedHighlights={filteredHighlights}
                    chunkStartIndex={currentTreeIndex * CHUNK_SIZE}
                    // chunkHighlights: current tree's highlights (max 12)
                    // allFeaturedHighlights: all filtered highlights (for StarModal to find correct highlight)
                    // chunkStartIndex: starting index of current chunk in allFeaturedHighlights (for StarModal)
                    onLoad={handleTreeLoad}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* Centered Organization Filter - Initial View */}
        {isInitialView && (
          <Filters
            organizations={allOrganizations}
            years={uniqueYears}
            selectedOrganization={selectedOrganization}
            selectedYear={selectedYear}
            showAllYears={showAllYears}
            onOrganizationChange={handleOrganizationChange}
            onYearChange={handleFilterYearChange}
            theme={theme}
            isCentered={true}
          />
        )}

        {/* Left Sidebar - Filters and Impact Level Showcase */}
        {!isInitialView && (
          <div className={styles.leftSidebar}>
            <Filters
              organizations={allOrganizations}
              years={uniqueYears}
              selectedOrganization={selectedOrganization}
              selectedYear={selectedYear}
              showAllYears={showAllYears}
              onOrganizationChange={handleOrganizationChange}
              onYearChange={handleFilterYearChange}
              theme={theme}
              isCentered={false}
            />
            <ImpactLevelShowcase theme={theme} />
          </div>
        )}

        {/* Right Sidebar - Navigation */}
        <div className={styles.rightSidebar}>
          <TreeNavigation
            currentIndex={currentTreeIndex}
            totalTrees={highlightChunks.length}
            onPrevious={handlePreviousTree}
            onNext={handleNextTree}
            theme={theme}
            totalHighlights={filteredHighlights.length}
          />
        </div>
        </div>
      )}
    </>
  );
}

// Memoize the component to prevent unnecessary re-renders
export default memo(FAITHreePage);