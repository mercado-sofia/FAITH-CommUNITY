// Production-ready logging service
class Logger {
  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // Info level logging - only in development
  info(message, data = null) {
    if (this.isDevelopment) {
      if (data) {
        console.info(`[INFO] ${message}`, data);
      } else {
        console.info(`[INFO] ${message}`);
      }
    }
  }

  // Warning level logging - always logged
  warn(message, data = null) {
    if (data) {
      console.warn(`[WARN] ${message}`, data);
    } else {
      console.warn(`[WARN] ${message}`);
    }
    
    // In production, you might want to send warnings to a monitoring service
    if (this.isProduction) {
      this.sendToMonitoringService('warn', message, data);
    }
  }

  // Error level logging - always logged and sent to monitoring in production
  error(message, error = null, context = null) {
    const errorData = {
      message,
      error: error?.message || error,
      stack: error?.stack,
      context,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'server-side',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side'
    };

    // In production, only log critical errors to console to reduce noise
    // All errors are still sent to monitoring service
    if (this.isProduction) {
      // Only log to console if it's a critical error (not a handled API error)
      // Critical errors: component errors, server errors (500+), or errors without a type
      const isCritical = !context?.type || 
                        context.type === 'component_error' || 
                        context.type === 'server_error' ||
                        (context.type === 'api_error' && error?.status >= 500);
      
      if (isCritical) {
        console.error(`[ERROR] ${message}`, errorData);
      }
      
      // Always send to monitoring service
      this.sendToMonitoringService('error', message, errorData);
    } else {
      // In development, always log to console
      console.error(`[ERROR] ${message}`, errorData);
    }
  }

  // Debug level logging - only in development
  debug(message, data = null) {
    if (this.isDevelopment) {
      if (data) {
        console.debug(`[DEBUG] ${message}`, data);
      } else {
        console.debug(`[DEBUG] ${message}`);
      }
    }
  }

  // SWR specific error logging
  swrError(endpoint, error, context = null) {
    // Extract error information even if error object is empty or malformed
    let errorInfo = error;
    
    if (error) {
      // Try to extract meaningful information from the error
      errorInfo = {
        message: error.message || error.toString() || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack,
        ...(error.isNetworkError && { isNetworkError: true }),
        ...(error.status && { status: error.status }),
        ...(error.statusText && { statusText: error.statusText }),
        ...(error.originalError && { originalError: error.originalError }),
        // Include any other enumerable properties
        ...Object.keys(error).reduce((acc, key) => {
          if (!['message', 'name', 'stack'].includes(key)) {
            acc[key] = error[key];
          }
          return acc;
        }, {})
      };
    } else {
      errorInfo = { message: 'Empty or undefined error object' };
    }
    
    this.error(`SWR Error for endpoint: ${endpoint}`, errorInfo, {
      ...context,
      type: 'swr_error',
      endpoint
    });
  }

  // API specific error logging
  apiError(endpoint, error, context = null) {
    // Extract error information even if error object is empty or malformed
    let errorInfo = error;
    
    if (error) {
      // Try to extract meaningful information from the error
      errorInfo = {
        message: error.message || error.toString() || 'Unknown error',
        name: error.name || 'Error',
        stack: error.stack,
        ...(error.isNetworkError && { isNetworkError: true }),
        ...(error.status && { status: error.status }),
        ...(error.statusText && { statusText: error.statusText }),
        ...(error.originalError && { originalError: error.originalError }),
        // Include any other enumerable properties
        ...Object.keys(error).reduce((acc, key) => {
          if (!['message', 'name', 'stack'].includes(key)) {
            acc[key] = error[key];
          }
          return acc;
        }, {})
      };
    } else {
      errorInfo = { message: 'Empty or undefined error object' };
    }
    
    this.error(`API Error for endpoint: ${endpoint}`, errorInfo, {
      ...context,
      type: 'api_error',
      endpoint
    });
  }

  // Component error logging
  componentError(componentName, error, context = null) {
    this.error(`Component Error in ${componentName}`, error, {
      ...context,
      type: 'component_error',
      component: componentName
    });
  }

  // User interaction logging (for analytics/monitoring)
  userInteraction(action, data = null) {
    if (this.isDevelopment) {
      this.info(`User Interaction: ${action}`, data);
    }
    
    // In production, send to analytics service
    if (this.isProduction) {
      this.sendToAnalyticsService(action, data);
    }
  }

  // Send to monitoring service (placeholder for production)
  sendToMonitoringService(level, message, data) {
    // TODO: Implement your monitoring service integration
    // Examples: Sentry, LogRocket, DataDog, etc.
    
    // For now, we'll just store in localStorage for debugging
    if (typeof window !== 'undefined') {
      const logs = JSON.parse(localStorage.getItem('error_logs') || '[]');
      logs.push({
        level,
        message,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Keep only last 100 logs
      if (logs.length > 100) {
        logs.splice(0, logs.length - 100);
      }
      
      localStorage.setItem('error_logs', JSON.stringify(logs));
    }
  }

  // Send to analytics service (placeholder for production)
  sendToAnalyticsService(action, data) {
    // TODO: Implement your analytics service integration
    // Examples: Google Analytics, Mixpanel, etc.
  }

  // Get stored error logs (for debugging)
  getStoredLogs() {
    if (typeof window !== 'undefined') {
      return JSON.parse(localStorage.getItem('error_logs') || '[]');
    }
    return [];
  }

  // Clear stored logs
  clearStoredLogs() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('error_logs');
    }
  }
}

// Create singleton instance
const logger = new Logger();

// Export the logger instance
export default logger;

// Export individual methods for convenience
export const { info, warn, error, debug, swrError, apiError, componentError, userInteraction } = logger;
