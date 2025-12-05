/**
 * FAITHree Constants
 * Centralized configuration values for the FAITHree page
 */

// Filtering constants
export const CHUNK_SIZE = 12; // Number of highlights per tree
export const START_YEAR = 2010; // Starting year for the year filter

// Loading delays (in milliseconds)
export const LOADING_DELAY = 300; // Background preload delay
export const MODEL_LOAD_DELAY = 800; // 3D model load delay
export const BACKGROUND_PRELOAD_TIMEOUT = 2000; // Fallback timeout for background images

// API configuration
export const API_TIMEOUT = 10000; // API request timeout (10 seconds)

// Background effects configuration
export const RAIN_DROPS_COUNT_NORMAL = 80;
export const RAIN_DROPS_COUNT_REDUCED = 20;
export const STARS_COUNT_NORMAL = 20;
export const STARS_COUNT_REDUCED = 8;

// Rain drop properties
export const RAIN_DROP_MIN_DELAY = 0;
export const RAIN_DROP_MAX_DELAY = 2;
export const RAIN_DROP_MIN_DURATION = 0.4;
export const RAIN_DROP_MAX_DURATION = 1.0;
export const RAIN_DROP_MIN_SPEED = 0.3;
export const RAIN_DROP_MAX_SPEED = 0.7;
export const RAIN_DROP_MIN_SIZE = 1;
export const RAIN_DROP_MAX_SIZE = 3;
export const RAIN_DROP_HEIGHT_BASE = 15;
export const RAIN_DROP_HEIGHT_MULTIPLIER = 5;

// Star properties
export const STAR_MIN_SIZE = 2;
export const STAR_MAX_SIZE = 6;
export const STAR_MIN_OPACITY = 0.3;
export const STAR_MAX_OPACITY = 1.0;

// Background image paths
export const TREE_BACKGROUND_PATH = '/assets/backgrounds/welcome-faithree/treebg.svg';
export const TREE_BACKGROUND_PATH_MOBILE = '/assets/backgrounds/welcome-faithree/treebg_mobile.svg';