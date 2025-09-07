// Development tools for debugging and monitoring
import logger from './logger';

// Only expose in development
if (process.env.NODE_ENV === 'development') {
  // Expose logger to window for debugging
  if (typeof window !== 'undefined') {
    window.__FAITH_LOGGER__ = {
      logger,
      getLogs: () => logger.getStoredLogs(),
      clearLogs: () => logger.clearStoredLogs(),
      testError: () => logger.error('Test error from dev tools'),
      testWarning: () => logger.warn('Test warning from dev tools'),
      testInfo: () => logger.info('Test info from dev tools'),
      testUserInteraction: () => logger.userInteraction('test_click', { test: true })
    };

    // Add a visual indicator for development mode
    const devIndicator = document.createElement('div');
    devIndicator.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      background: #ff6b6b;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      z-index: 9999;
      cursor: pointer;
    `;
    devIndicator.textContent = 'DEV MODE';
    devIndicator.title = 'Click to open logger tools';
    devIndicator.onclick = () => {
      // FAITH Logger Tools available
    };
    document.body.appendChild(devIndicator);

    // Log that dev tools are loaded
    logger.info('Development tools loaded', {
      loggerAvailable: !!window.__FAITH_LOGGER__,
      timestamp: new Date().toISOString()
    });
  }
}

// Export development utilities
export const devTools = {
  // Test logging functions
  testLogging: () => {
    logger.info('Testing info logging');
    logger.warn('Testing warning logging');
    logger.error('Testing error logging', new Error('Test error'));
    logger.debug('Testing debug logging');
    logger.userInteraction('test_interaction', { test: true });
  },

  // Get current environment info
  getEnvironmentInfo: () => ({
    nodeEnv: process.env.NODE_ENV,
    apiUrl: process.env.NEXT_PUBLIC_API_URL,
    timestamp: new Date().toISOString(),
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server-side',
    url: typeof window !== 'undefined' ? window.location.href : 'server-side'
  }),

  // Clear all stored logs
  clearAllLogs: () => {
    logger.clearStoredLogs();
    // All stored logs cleared
  },

  // Export logs for debugging
  exportLogs: () => {
    const logs = logger.getStoredLogs();
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `faith-logs-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
    
    return logs;
  }
};

// Auto-clear logs on page unload in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Keep only the last 10 logs for debugging
    const logs = logger.getStoredLogs();
    if (logs.length > 10) {
      const recentLogs = logs.slice(-10);
      localStorage.setItem('error_logs', JSON.stringify(recentLogs));
    }
  });
}
