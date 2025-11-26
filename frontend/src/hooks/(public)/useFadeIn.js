'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for fade-in animations when elements enter the viewport
 * @param {Object} options - Configuration options
 * @param {number} options.threshold - Intersection threshold (0-1), default: 0.1
 * @param {string} options.rootMargin - Root margin for intersection observer, default: '0px 0px -50px 0px'
 * @param {boolean} options.triggerOnce - Whether to trigger animation only once, default: true
 * @returns {Object} - { ref: ref to attach to element, isVisible: boolean indicating visibility }
 */
export function useFadeIn(options = {}) {
  const {
    threshold = 0.1,
    rootMargin = '0px 0px -50px 0px',
    triggerOnce = true
  } = options;

  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef(null);
  const hasAnimated = useRef(false);
  const observerRef = useRef(null);
  const isVisibleRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If already animated and triggerOnce is true, don't observe again
    if (hasAnimated.current && triggerOnce) return;

    // Reset visibility ref for this effect run
    isVisibleRef.current = false;

    // Helper function to check if element is in view
    const checkInitialState = () => {
      if (hasAnimated.current) return false;
      
      if (!element || !element.getBoundingClientRect) return false;
      
      const rect = element.getBoundingClientRect();
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
      
      // Parse rootMargin to account for it in the check
      const marginBottom = rootMargin.includes('-') 
        ? parseInt(rootMargin.match(/-?\d+px/g)?.[2] || '0') 
        : 0;
      
      // Check if element is in viewport (accounting for rootMargin)
      const isInView = (
        rect.top < viewportHeight + marginBottom &&
        rect.bottom > 0 &&
        rect.left < viewportWidth &&
        rect.right > 0 &&
        rect.width > 0 &&
        rect.height > 0
      );
      
      if (isInView) {
        setIsVisible(true);
        isVisibleRef.current = true;
        if (triggerOnce) {
          hasAnimated.current = true;
          // Unobserve if triggerOnce is true
          if (observerRef.current) {
            observerRef.current.unobserve(element);
          }
        }
        return true;
      }
      return false;
    };

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            isVisibleRef.current = true;
            if (triggerOnce) {
              hasAnimated.current = true;
              if (observerRef.current) {
                observerRef.current.unobserve(entry.target);
              }
            }
          } else if (!triggerOnce) {
            setIsVisible(false);
            isVisibleRef.current = false;
          }
        });
      },
      {
        threshold,
        rootMargin
      }
    );

    observerRef.current.observe(element);

    // Check immediately if element is already in viewport
    // Use requestAnimationFrame to ensure DOM is ready, then check
    requestAnimationFrame(() => {
      // Double-check with a small delay to ensure layout is complete
      setTimeout(() => {
        checkInitialState();
      }, 0);
    });

    // Fallback: Check again after a small delay to ensure layout is complete
    // This handles cases where IntersectionObserver doesn't fire immediately
    const timeoutId = setTimeout(() => {
      checkInitialState();
    }, 100);

    // Additional fallback: Check after a longer delay to catch any edge cases
    const longTimeoutId = setTimeout(() => {
      if (!hasAnimated.current) {
        checkInitialState();
      }
    }, 500);

    // Final fallback: Force visibility after a reasonable delay to ensure content is always shown
    // This prevents the element from staying invisible if all checks fail
    const forceVisibleTimeoutId = setTimeout(() => {
      if (!hasAnimated.current && !isVisibleRef.current) {
        setIsVisible(true);
        isVisibleRef.current = true;
        hasAnimated.current = true;
        if (observerRef.current && element) {
          observerRef.current.unobserve(element);
        }
      }
    }, 1500);

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(longTimeoutId);
      clearTimeout(forceVisibleTimeoutId);
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
      }
      observerRef.current = null;
    };
  }, [threshold, rootMargin, triggerOnce]);

  return { ref: elementRef, isVisible };
}

export default useFadeIn;

