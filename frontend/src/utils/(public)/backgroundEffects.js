/**
 * Background Effects Utilities
 * Functions for generating rain drops and stars data
 */

import {
  RAIN_DROPS_COUNT_NORMAL,
  RAIN_DROPS_COUNT_REDUCED,
  STARS_COUNT_NORMAL,
  STARS_COUNT_REDUCED,
  RAIN_DROP_MIN_DELAY,
  RAIN_DROP_MAX_DELAY,
  RAIN_DROP_MIN_DURATION,
  RAIN_DROP_MAX_DURATION,
  RAIN_DROP_MIN_SPEED,
  RAIN_DROP_MAX_SPEED,
  RAIN_DROP_MIN_SIZE,
  RAIN_DROP_MAX_SIZE,
  RAIN_DROP_HEIGHT_BASE,
  RAIN_DROP_HEIGHT_MULTIPLIER,
  STAR_MIN_SIZE,
  STAR_MAX_SIZE,
  STAR_MIN_OPACITY,
  STAR_MAX_OPACITY,
} from '@/app/(public)/faithree/constants';

/**
 * Generate rain drops data with variety
 * @param {boolean} prefersReducedMotion - Whether user prefers reduced motion
 * @returns {Array} Array of rain drop objects
 */
export function generateRainDrops(prefersReducedMotion = false) {
  const count = prefersReducedMotion ? RAIN_DROPS_COUNT_REDUCED : RAIN_DROPS_COUNT_NORMAL;
  
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: RAIN_DROP_MIN_DELAY + Math.random() * (RAIN_DROP_MAX_DELAY - RAIN_DROP_MIN_DELAY),
    duration: RAIN_DROP_MIN_DURATION + Math.random() * (RAIN_DROP_MAX_DURATION - RAIN_DROP_MIN_DURATION),
    speed: RAIN_DROP_MIN_SPEED + Math.random() * (RAIN_DROP_MAX_SPEED - RAIN_DROP_MIN_SPEED),
    size: RAIN_DROP_MIN_SIZE + Math.random() * (RAIN_DROP_MAX_SIZE - RAIN_DROP_MIN_SIZE),
  }));
}

/**
 * Generate stars data for rainy mode background
 * @param {boolean} prefersReducedMotion - Whether user prefers reduced motion
 * @returns {Array} Array of star objects
 */
export function generateStars(prefersReducedMotion = false) {
  const count = prefersReducedMotion ? STARS_COUNT_REDUCED : STARS_COUNT_NORMAL;
  
  return Array.from({ length: count }).map((_, i) => ({
    id: i,
    left: Math.random() * 100,
    top: Math.random() * 100,
    size: STAR_MIN_SIZE + Math.random() * (STAR_MAX_SIZE - STAR_MIN_SIZE),
    opacity: STAR_MIN_OPACITY + Math.random() * (STAR_MAX_OPACITY - STAR_MIN_OPACITY),
  }));
}
