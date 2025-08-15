// Performance Monitoring Utility for CSS and Overall Performance

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cssLoadTime: [],
      renderTime: [],
      layoutShifts: [],
      firstContentfulPaint: null,
      largestContentfulPaint: null,
    };
    
    this.init();
  }

  init() {
    // Monitor CSS performance
    this.monitorCSSPerformance();
    
    // Monitor layout performance
    this.monitorLayoutPerformance();
    
    // Monitor Core Web Vitals
    this.monitorCoreWebVitals();
    
    // Monitor resource loading
    this.monitorResourceLoading();
  }

  // Monitor CSS file loading performance
  monitorCSSPerformance() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.css') || entry.name.includes('.module.css')) {
            this.metrics.cssLoadTime.push({
              name: entry.name,
              duration: entry.duration,
              startTime: entry.startTime,
              transferSize: entry.transferSize,
              decodedBodySize: entry.decodedBodySize,
            });
            
            console.log(`CSS Load: ${entry.name} - ${entry.duration.toFixed(2)}ms`);
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Monitor layout performance and shifts
  monitorLayoutPerformance() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'layout-shift') {
            this.metrics.layoutShifts.push({
              value: entry.value,
              sources: entry.sources,
              startTime: entry.startTime,
            });
            
            console.log(`Layout Shift: ${entry.value.toFixed(3)}`);
          }
        }
      });

      observer.observe({ entryTypes: ['layout-shift'] });
    }
  }

  // Monitor Core Web Vitals
  monitorCoreWebVitals() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          switch (entry.entryType) {
            case 'first-contentful-paint':
              this.metrics.firstContentfulPaint = entry.startTime;
              console.log(`FCP: ${entry.startTime.toFixed(2)}ms`);
              break;
              
            case 'largest-contentful-paint':
              this.metrics.largestContentfulPaint = entry.startTime;
              console.log(`LCP: ${entry.startTime.toFixed(2)}ms`);
              break;
              
            case 'first-input-delay':
              console.log(`FID: ${entry.processingStart - entry.startTime}ms`);
              break;
          }
        }
      });

      observer.observe({ 
        entryTypes: [
          'first-contentful-paint',
          'largest-contentful-paint',
          'first-input-delay'
        ] 
      });
    }
  }

  // Monitor resource loading
  monitorResourceLoading() {
    if (typeof PerformanceObserver !== 'undefined') {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            const resourceType = this.getResourceType(entry.name);
            
            if (resourceType === 'css') {
              this.analyzeCSSResource(entry);
            }
          }
        }
      });

      observer.observe({ entryTypes: ['resource'] });
    }
  }

  // Analyze CSS resource performance
  analyzeCSSResource(entry) {
    const cssMetrics = {
      name: entry.name,
      duration: entry.duration,
      transferSize: entry.transferSize,
      decodedBodySize: entry.decodedBodySize,
      compressionRatio: entry.transferSize > 0 ? 
        (entry.decodedBodySize / entry.transferSize).toFixed(2) : 0,
    };

    console.log('CSS Resource Analysis:', cssMetrics);
    
    // Alert if CSS file is too large
    if (entry.transferSize > 50000) { // 50KB
      console.warn(`Large CSS file detected: ${entry.name} (${(entry.transferSize / 1024).toFixed(2)}KB)`);
    }
    
    // Alert if CSS loading is slow
    if (entry.duration > 1000) { // 1 second
      console.warn(`Slow CSS loading: ${entry.name} (${entry.duration.toFixed(2)}ms)`);
    }
  }

  // Get resource type from URL
  getResourceType(url) {
    if (url.includes('.css') || url.includes('.module.css')) return 'css';
    if (url.includes('.js')) return 'js';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.jpeg') || url.includes('.gif') || url.includes('.webp')) return 'image';
    if (url.includes('.woff') || url.includes('.woff2') || url.includes('.ttf') || url.includes('.otf')) return 'font';
    return 'other';
  }

  // Get performance report
  getReport() {
    const cssLoadTimes = this.metrics.cssLoadTime.map(item => item.duration);
    const avgCSSLoadTime = cssLoadTimes.length > 0 ? 
      cssLoadTimes.reduce((a, b) => a + b, 0) / cssLoadTimes.length : 0;
    
    const totalCSSSize = this.metrics.cssLoadTime.reduce((total, item) => 
      total + (item.transferSize || 0), 0);
    
    const layoutShiftScore = this.metrics.layoutShifts.reduce((score, shift) => 
      score + shift.value, 0);

    return {
      cssPerformance: {
        averageLoadTime: avgCSSLoadTime.toFixed(2) + 'ms',
        totalCSSFiles: this.metrics.cssLoadTime.length,
        totalCSSSize: (totalCSSSize / 1024).toFixed(2) + 'KB',
        slowestCSSFile: Math.max(...cssLoadTimes).toFixed(2) + 'ms',
      },
      coreWebVitals: {
        firstContentfulPaint: this.metrics.firstContentfulPaint ? 
          this.metrics.firstContentfulPaint.toFixed(2) + 'ms' : 'N/A',
        largestContentfulPaint: this.metrics.largestContentfulPaint ? 
          this.metrics.largestContentfulPaint.toFixed(2) + 'ms' : 'N/A',
        cumulativeLayoutShift: layoutShiftScore.toFixed(3),
      },
      recommendations: this.getRecommendations(),
    };
  }

  // Get performance recommendations
  getRecommendations() {
    const recommendations = [];
    
    // CSS size recommendations
    const totalCSSSize = this.metrics.cssLoadTime.reduce((total, item) => 
      total + (item.transferSize || 0), 0);
    
    if (totalCSSSize > 100000) { // 100KB
      recommendations.push('Consider reducing CSS bundle size by removing unused styles');
    }
    
    // CSS load time recommendations
    const avgCSSLoadTime = this.metrics.cssLoadTime.reduce((total, item) => 
      total + item.duration, 0) / this.metrics.cssLoadTime.length;
    
    if (avgCSSLoadTime > 500) { // 500ms
      recommendations.push('CSS files are loading slowly. Consider optimizing or splitting CSS');
    }
    
    // Layout shift recommendations
    const layoutShiftScore = this.metrics.layoutShifts.reduce((score, shift) => 
      score + shift.value, 0);
    
    if (layoutShiftScore > 0.1) {
      recommendations.push('High layout shift detected. Consider reserving space for dynamic content');
    }
    
    return recommendations;
  }

  // Export metrics for external analysis
  exportMetrics() {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      metrics: this.metrics,
      report: this.getReport(),
    };
  }

  // Clear metrics
  clear() {
    this.metrics = {
      cssLoadTime: [],
      renderTime: [],
      layoutShifts: [],
      firstContentfulPaint: null,
      largestContentfulPaint: null,
    };
  }
}

// Create global instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Export class for custom instances
export { PerformanceMonitor };

// Auto-export metrics on page unload (for analytics)
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const metrics = performanceMonitor.exportMetrics();
    
    // Send to analytics service (example)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/performance-metrics', JSON.stringify(metrics));
    }
    
    // Or log to console
    console.log('Performance Metrics:', metrics);
  });
}
