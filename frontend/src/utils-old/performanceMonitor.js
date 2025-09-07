import logger from './logger';

/**
 * Performance monitoring utility for tracking page load times and navigation performance
 */

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      pageLoads: {},
      navigationTimes: {},
      resourceLoads: {},
    };
    this.isEnabled = process.env.NODE_ENV === 'development';
  }

  /**
   * Start monitoring page load performance
   */
  startPageLoadTimer(pageName) {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    this.metrics.pageLoads[pageName] = {
      startTime,
      status: 'loading',
    };
    
    logger.debug(`Starting page load timer for: ${pageName}`);
  }

  /**
   * End page load timer and record metrics
   */
  endPageLoadTimer(pageName) {
    if (!this.isEnabled || !this.metrics.pageLoads[pageName]) return;
    
    const endTime = performance.now();
    const loadTime = endTime - this.metrics.pageLoads[pageName].startTime;
    
    this.metrics.pageLoads[pageName] = {
      ...this.metrics.pageLoads[pageName],
      endTime,
      loadTime,
      status: 'loaded',
    };
    
    logger.debug(`Page loaded: ${pageName} in ${loadTime.toFixed(2)}ms`);
    
    // Send to analytics if available
    this.sendToAnalytics('page_load', {
      page: pageName,
      loadTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Monitor navigation performance
   */
  startNavigationTimer(fromPage, toPage) {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    const navigationKey = `${fromPage}_to_${toPage}`;
    
    this.metrics.navigationTimes[navigationKey] = {
      startTime,
      fromPage,
      toPage,
      status: 'navigating',
    };
    
    logger.debug(`Navigation started: ${fromPage} → ${toPage}`);
  }

  /**
   * End navigation timer
   */
  endNavigationTimer(fromPage, toPage) {
    if (!this.isEnabled) return;
    
    const endTime = performance.now();
    const navigationKey = `${fromPage}_to_${toPage}`;
    
    if (!this.metrics.navigationTimes[navigationKey]) return;
    
    const navigationTime = endTime - this.metrics.navigationTimes[navigationKey].startTime;
    
    this.metrics.navigationTimes[navigationKey] = {
      ...this.metrics.navigationTimes[navigationKey],
      endTime,
      navigationTime,
      status: 'completed',
    };
    
    logger.debug(`Navigation completed: ${fromPage} → ${toPage} in ${navigationTime.toFixed(2)}ms`);
    
    // Send to analytics if available
    this.sendToAnalytics('navigation', {
      fromPage,
      toPage,
      navigationTime,
      timestamp: Date.now(),
    });
  }

  /**
   * Monitor resource loading performance
   */
  monitorResourceLoad(resourceUrl, resourceType = 'image') {
    if (!this.isEnabled) return;
    
    const startTime = performance.now();
    const resourceKey = `${resourceType}_${resourceUrl}`;
    
    this.metrics.resourceLoads[resourceKey] = {
      startTime,
      url: resourceUrl,
      type: resourceType,
      status: 'loading',
    };
    
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      
      this.metrics.resourceLoads[resourceKey] = {
        ...this.metrics.resourceLoads[resourceKey],
        endTime,
        loadTime,
        status: 'loaded',
      };
      
      logger.debug(`Resource loaded: ${resourceUrl} in ${loadTime.toFixed(2)}ms`);
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      totalPages: Object.keys(this.metrics.pageLoads).length,
      totalNavigations: Object.keys(this.metrics.navigationTimes).length,
      totalResources: Object.keys(this.metrics.resourceLoads).length,
      averagePageLoadTime: 0,
      averageNavigationTime: 0,
      averageResourceLoadTime: 0,
    };

    // Calculate average page load times
    const pageLoadTimes = Object.values(this.metrics.pageLoads)
      .filter(page => page.loadTime)
      .map(page => page.loadTime);
    
    if (pageLoadTimes.length > 0) {
      summary.averagePageLoadTime = pageLoadTimes.reduce((a, b) => a + b, 0) / pageLoadTimes.length;
    }

    // Calculate average navigation times
    const navigationTimes = Object.values(this.metrics.navigationTimes)
      .filter(nav => nav.navigationTime)
      .map(nav => nav.navigationTime);
    
    if (navigationTimes.length > 0) {
      summary.averageNavigationTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length;
    }

    // Calculate average resource load times
    const resourceLoadTimes = Object.values(this.metrics.resourceLoads)
      .filter(resource => resource.loadTime)
      .map(resource => resource.loadTime);
    
    if (resourceLoadTimes.length > 0) {
      summary.averageResourceLoadTime = resourceLoadTimes.reduce((a, b) => a + b, 0) / resourceLoadTimes.length;
    }

    return summary;
  }

  /**
   * Send metrics to analytics (placeholder for future implementation)
   */
  sendToAnalytics(eventType, data) {
    // This can be connected to Google Analytics, Mixpanel, or other analytics services
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventType, data);
    }
  }

  /**
   * Export metrics for debugging
   */
  exportMetrics() {
    return {
      ...this.metrics,
      summary: this.getPerformanceSummary(),
      timestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = {
      pageLoads: {},
      navigationTimes: {},
      resourceLoads: {},
    };
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
