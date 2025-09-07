// SWR Testing and Debugging Utility
import logger from './logger';

/**
 * Test SWR configuration and hooks
 * @param {Object} swrConfig - SWR configuration object
 * @param {Array} hooks - Array of SWR hooks to test
 */
export const testSWRConfiguration = (swrConfig, hooks = []) => {
  logger.info('Testing SWR Configuration', { swrConfig });
  
  // Test basic configuration
  const requiredConfig = ['refreshInterval', 'revalidateOnFocus', 'revalidateOnReconnect'];
  const missingConfig = requiredConfig.filter(key => !(key in swrConfig));
  
  if (missingConfig.length > 0) {
    logger.warn('Missing SWR configuration options', { missing: missingConfig });
  }
  
  // Test hooks
  hooks.forEach((hook, index) => {
    if (hook && typeof hook === 'object') {
      const hasRequiredProps = ['data', 'error', 'isLoading', 'mutate'].every(prop => prop in hook);
      if (!hasRequiredProps) {
        logger.warn(`Hook ${index} missing required properties`, { hook });
      }
    }
  });
};

/**
 * Monitor SWR performance
 * @param {string} hookName - Name of the hook being monitored
 * @param {Function} hook - The SWR hook to monitor
 */
export const monitorSWRHook = (hookName, hook) => {
  const startTime = performance.now();
  
  const { data, error, isLoading, mutate } = hook;
  
  const endTime = performance.now();
  const duration = endTime - startTime;
  
  logger.info(`SWR Hook Performance: ${hookName}`, {
    duration: `${duration.toFixed(2)}ms`,
    hasData: !!data,
    hasError: !!error,
    isLoading,
    dataType: data ? typeof data : 'undefined',
    dataLength: Array.isArray(data) ? data.length : 'N/A'
  });
  
  return { duration, hasData: !!data, hasError: !!error, isLoading };
};

/**
 * Validate SWR data structure
 * @param {any} data - Data to validate
 * @param {string} expectedType - Expected data type
 * @param {string} context - Context for validation
 */
export const validateSWRData = (data, expectedType = 'array', context = '') => {
  const validation = {
    isValid: false,
    type: typeof data,
    isArray: Array.isArray(data),
    length: Array.isArray(data) ? data.length : 'N/A',
    issues: []
  };
  
  if (expectedType === 'array' && !Array.isArray(data)) {
    validation.issues.push('Expected array but got ' + typeof data);
  } else if (expectedType === 'object' && typeof data !== 'object') {
    validation.issues.push('Expected object but got ' + typeof data);
  } else if (expectedType === 'array' && Array.isArray(data)) {
    validation.isValid = true;
  } else if (expectedType === 'object' && typeof data === 'object' && data !== null) {
    validation.isValid = true;
  }
  
  if (validation.issues.length > 0) {
    logger.warn(`SWR Data Validation Failed: ${context}`, validation);
  } else {
    logger.info(`SWR Data Validation Passed: ${context}`, validation);
  }
  
  return validation;
};

/**
 * Debug SWR cache
 * @param {Object} cache - SWR cache object
 */
export const debugSWRCache = (cache) => {
  if (!cache || typeof cache !== 'object') {
    logger.warn('Invalid SWR cache object');
    return;
  }
  
  const cacheInfo = {
    size: Object.keys(cache).length,
    keys: Object.keys(cache).slice(0, 10), // Show first 10 keys
    hasData: Object.values(cache).some(item => item && item.data)
  };
  
  logger.info('SWR Cache Debug Info', cacheInfo);
  
  return cacheInfo;
};

/**
 * Test SWR error handling
 * @param {Error} error - Error to test
 * @param {string} context - Context for the error
 */
export const testSWRErrorHandling = (error, context = '') => {
  const errorInfo = {
    message: error?.message || 'Unknown error',
    name: error?.name || 'Error',
    stack: error?.stack ? error.stack.split('\n').slice(0, 3) : [],
    context,
    timestamp: new Date().toISOString()
  };
  
  logger.error(`SWR Error Test: ${context}`, error, errorInfo);
  
  return errorInfo;
};

/**
 * Performance monitoring for SWR requests
 */
export class SWRPerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.startTime = Date.now();
  }
  
  startRequest(key) {
    this.metrics.set(key, {
      startTime: performance.now(),
      status: 'pending'
    });
  }
  
  endRequest(key, success = true, error = null) {
    const metric = this.metrics.get(key);
    if (metric) {
      metric.endTime = performance.now();
      metric.duration = metric.endTime - metric.startTime;
      metric.status = success ? 'success' : 'error';
      metric.error = error;
    }
  }
  
  getMetrics() {
    const metrics = Array.from(this.metrics.entries()).map(([key, metric]) => ({
      key,
      ...metric
    }));
    
    const summary = {
      totalRequests: metrics.length,
      successfulRequests: metrics.filter(m => m.status === 'success').length,
      failedRequests: metrics.filter(m => m.status === 'error').length,
      averageDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0) / metrics.length,
      totalDuration: metrics.reduce((sum, m) => sum + (m.duration || 0), 0)
    };
    
    logger.info('SWR Performance Summary', summary);
    
    return { metrics, summary };
  }
  
  reset() {
    this.metrics.clear();
    this.startTime = Date.now();
  }
}

// Export a singleton instance
export const swrPerformanceMonitor = new SWRPerformanceMonitor();

/**
 * Debug utility for development
 */
export const debugSWR = {
  testConfiguration: testSWRConfiguration,
  monitorHook: monitorSWRHook,
  validateData: validateSWRData,
  debugCache: debugSWRCache,
  testErrorHandling: testSWRErrorHandling,
  performance: swrPerformanceMonitor
};

// Auto-export for development
if (process.env.NODE_ENV === 'development') {
  window.debugSWR = debugSWR;
}
