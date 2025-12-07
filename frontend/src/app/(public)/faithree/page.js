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
  BACKGROUND_PRELOAD_TIMEOUT,
  TREE_BACKGROUND_PATH,
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
  const [showWelcome, setShowWelcome] = useState(true);
  const [isInitialView, setIsInitialView] = useState(true);
  const [isModelLoading, setIsModelLoading] = useState(false); // Track 3D model and background loading
  const [isTransitioningFromWelcome, setIsTransitioningFromWelcome] = useState(false); // Track transition from welcome screen

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
    // When theme changes, show loading overlay since the 3D tree model needs to reload
    if (selectedOrganization !== null && filteredHighlights.length > 0 && oldTheme) {
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

  // Handle transition from welcome screen - don't trigger loading on filter changes
  useEffect(() => {
    // If no organization is selected, don't show loading
    if (selectedOrganization === null) {
      setIsModelLoading(false);
      return;
    }
    
    // If we're transitioning from welcome screen, don't set loading to true here
    // Loading is already set to true in handleContinue to ensure smooth transition
    if (isTransitioningFromWelcome) {
      setIsTransitioningFromWelcome(false);
      // Don't modify isModelLoading here - it's already set to true in handleContinue
      return;
    }
    
    // If no highlights, set loading to false immediately (no tree to render)
    if (filteredHighlights.length === 0) {
      setIsModelLoading(false);
    }
    // Note: Filter changes no longer trigger loading overlay - only initial load does
  }, [selectedOrganization, selectedYear, isTransitioningFromWelcome, showWelcome, filteredHighlights.length]);

  // Handle tree load - TreeModel waits for actual render completion via requestAnimationFrame
  const handleTreeLoad = useCallback(() => {
    // TreeModel uses requestAnimationFrame to ensure canvas has rendered before calling this
    setIsModelLoading(false);
  }, []);

  // Fallback: Clear loading state if tree model doesn't load within reasonable time
  // This prevents the loading overlay from getting stuck
  useEffect(() => {
    if (!isModelLoading) return;
    
    // Set a maximum timeout for loading (10 seconds)
    const maxLoadingTimeout = 10000;
    const timeoutId = setTimeout(() => {
        // Only clear if we're not on welcome screen and have an organization selected
        if (!showWelcome && selectedOrganization !== null) {
          setIsModelLoading(false);
        }
    }, maxLoadingTimeout);

    return () => clearTimeout(timeoutId);
  }, [isModelLoading, showWelcome, selectedOrganization]);

  // Handle continue from welcome section - called when organization is selected (mode 2 completion)
  // Preload tree background SVG and hide welcome section
  const handleContinue = useCallback(() => {
    setIsTransitioningFromWelcome(true);
    // Set loading to true immediately to show overlay during model loading
    setIsModelLoading(true);
    
    // Show page immediately - don't wait for background images
    setShowWelcome(false);
    
    // Preload both desktop and mobile versions of tree background SVGs (non-blocking)
    const treeBgImage = new Image();
    const treeBgImageMobile = new Image();
    
    // Load tree background images (desktop and mobile versions)
    treeBgImage.src = TREE_BACKGROUND_PATH;
    treeBgImageMobile.src = TREE_BACKGROUND_PATH_MOBILE;
    
    // Fallback timeout in case images don't load (reduced timeout for fallback only)
    setTimeout(() => {
      // Images will load in background, no need to block
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

  // Handle tree navigation - NO loading state (just updates stars, model stays the same)
  const handleTreeSelect = useCallback((treeIndex) => {
    handleNavTreeSelect(treeIndex);
    // Don't show loading - tree model doesn't need to reload, only stars update
  }, [handleNavTreeSelect]);

  const handlePreviousTree = useCallback(() => {
    handleNavPreviousTree();
    // Don't show loading - tree model doesn't need to reload, only stars update
  }, [handleNavPreviousTree]);

  const handleNextTree = useCallback(() => {
    handleNavNextTree();
    // Don't show loading - tree model doesn't need to reload, only stars update
  }, [handleNavNextTree]);

  return (
    <>
      {/* Welcome Section */}
      {showWelcome && (
        <WelcomeSection 
          onContinue={handleContinue}
          organizations={allOrganizations}
          selectedOrganization={selectedOrganization}
          onOrganizationSelect={handleOrganizationChange}
        />
      )}

      {/* Page Loading Overlay - Shows while background and 3D models are loading (only when organization is selected) */}
      {/* Note: Overlay can show during transition from welcome screen to prevent flickering */}
      {selectedOrganization !== null && <PageLoadingOverlay isLoading={isModelLoading} />}
      
      {/* Full-screen FAITHree Environment */}
      {!showWelcome && (
        <div 
          className={styles.faithreeContainer}
          aria-label="FAITHree interactive environment"
        >
        {/* Eco-themed background */}
        {/* Note: isInitialView is always false here since organization is selected in WelcomeSection */}
        <div className={`${styles.ecoBackground} ${styles.ecoBackgroundTree}`}>
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
          
          {/* Rainy Mode Message */}
          {theme === 'rainy' && (
            <div className={styles.rainyMessage}>
              <p>No success stories yet... but the seeds are planted! 🌱</p>
            </div>
          )}
          
          {/* Sunny Mode Success Message */}
          {theme !== 'rainy' && filteredHighlights.length > 0 && selectedOrganization && (() => {
            const selectedOrg = allOrganizations.find(org => org.id === selectedOrganization);
            const orgName = selectedOrg?.acronym || selectedOrg?.name || 'This organization';
            return (
              <div className={styles.sunnyMessage}>
                <p><strong>{orgName}</strong> made <strong>{filteredHighlights.length}</strong> {filteredHighlights.length === 1 ? 'success story' : 'success stories'} so far and counting!</p>
              </div>
            );
          })()}
          
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
                    treePosition={[2.0, -1.8, 0]} 
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

        {/* Bottom White Container - 34% height, in front of tree */}
        {!isInitialView && (
          <div className={styles.bottomGreenContainer}>
            {/* Impact Level Showcase - Mobile only, inside bottom container */}
            <div className={styles.mobileImpactLevelContainer}>
              <ImpactLevelShowcase theme={theme} />
            </div>
          </div>
        )}

        {/* Filters Component - Rendered outside sidebar so toggle button is always visible on mobile */}
        {!isInitialView && (
          <Filters
            organizations={allOrganizations}
            years={uniqueYears}
            selectedOrganization={selectedOrganization}
            selectedYear={selectedYear}
            showAllYears={showAllYears}
            onOrganizationChange={handleOrganizationChange}
            onYearChange={handleFilterYearChange}
            theme={theme}
          />
        )}

        {/* Left Sidebar - Desktop filters and Impact Level Showcase */}
        {!isInitialView && (
          <div className={styles.leftSidebar}>
            {/* Desktop filters - hidden on mobile, shown in sidebar */}
            <div className={styles.desktopFiltersOnly}>
              <Filters
                organizations={allOrganizations}
                years={uniqueYears}
                selectedOrganization={selectedOrganization}
                selectedYear={selectedYear}
                showAllYears={showAllYears}
                onOrganizationChange={handleOrganizationChange}
                onYearChange={handleFilterYearChange}
                theme={theme}
                hideMobileToggle={true}
              />
            </div>
            {/* Impact Level Showcase - Desktop only */}
            <div className={styles.desktopImpactLevelContainer}>
              <ImpactLevelShowcase theme={theme} />
            </div>
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