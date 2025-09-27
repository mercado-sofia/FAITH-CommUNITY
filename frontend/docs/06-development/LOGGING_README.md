# FAITH CommUNITY - Logging System

## Overview

This document describes the production-ready logging system implemented for the FAITH CommUNITY volunteer management platform.

## Features

### ✅ Production-Ready Logging Service
- **Environment-aware**: Different behavior in development vs production
- **Multiple log levels**: info, warn, error, debug
- **Structured logging**: Rich context with timestamps, URLs, user agents
- **Error tracking**: Automatic error capture and storage
- **Monitoring integration**: Ready for Sentry, LogRocket, DataDog, etc.

### ✅ SWR Integration
- **Automatic error logging**: All SWR errors are automatically logged
- **API error tracking**: Detailed API endpoint error information
- **Retry monitoring**: Track failed requests and retry attempts

### ✅ React Error Boundaries
- **Component error isolation**: Prevents entire app crashes
- **Graceful fallbacks**: User-friendly error messages
- **Error recovery**: Automatic error reporting and recovery options

### ✅ Development Tools
- **Debug utilities**: Easy access to logs during development
- **Visual indicators**: DEV MODE badge for development environment
- **Log export**: Export logs for debugging and analysis

## Usage

### Basic Logging

```javascript
import logger from '../utils/logger';

// Info logging (development only)
logger.info('User logged in', { userId: 123 });

// Warning logging (always logged)
logger.warn('API rate limit approaching', { endpoint: '/api/users' });

// Error logging (always logged + monitoring in production)
logger.error('Failed to fetch user data', error, { userId: 123 });

// Debug logging (development only)
logger.debug('Component state updated', { state: newState });
```

### SWR Error Logging

```javascript
// Automatically handled by SWR hooks
const { data, error, isLoading } = useSWR('/api/users', fetcher, {
  onError: (error) => {
    logger.swrError('/api/users', error, { context: 'user-list' });
  }
});
```

### Component Error Logging

```javascript
import ErrorBoundary from '../components/ErrorBoundary';

// Wrap components with error boundary
<ErrorBoundary componentName="UserProfile">
  <UserProfile userId={123} />
</ErrorBoundary>

// Or use HOC
const SafeUserProfile = withErrorBoundary(UserProfile, 'UserProfile');
```

### User Interaction Logging

```javascript
// Track user interactions for analytics
logger.userInteraction('button_click', { 
  button: 'apply_now',
  programId: 456 
});
```

## Development Tools

### Accessing Logs

In development mode, logs are available in the browser console:

```javascript
// Access logger tools
window.__FAITH_LOGGER__.getLogs()     // Get all stored logs
window.__FAITH_LOGGER__.clearLogs()   // Clear stored logs
window.__FAITH_LOGGER__.testError()   // Test error logging
```

### Visual Indicators

- **DEV MODE badge**: Red badge in top-right corner (development only)
- **Click to inspect**: Click the badge to see logger tools in console

### Exporting Logs

```javascript
import { devTools } from '../utils/devTools';

// Export logs as JSON file
devTools.exportLogs();

// Get environment info
devTools.getEnvironmentInfo();
```

## Production Configuration

### Environment Variables

```bash
# Required for production
NODE_ENV=production
NEXT_PUBLIC_API_URL=https://your-production-api.com
```

### Monitoring Service Integration

To integrate with monitoring services like Sentry:

```javascript
// In logger.js - sendToMonitoringService method
sendToMonitoringService(level, message, data) {
  // Sentry integration
  if (window.Sentry) {
    window.Sentry.captureException(new Error(message), {
      level,
      extra: data
    });
  }
  
  // LogRocket integration
  if (window.LogRocket) {
    window.LogRocket.track('Error', {
      level,
      message,
      data
    });
  }
}
```

### Analytics Integration

To integrate with analytics services:

```javascript
// In logger.js - sendToAnalyticsService method
sendToAnalyticsService(action, data) {
  // Google Analytics
  if (window.gtag) {
    window.gtag('event', action, data);
  }
  
  // Mixpanel
  if (window.mixpanel) {
    window.mixpanel.track(action, data);
  }
}
```

## Log Storage

### Development
- Logs stored in `localStorage` for debugging
- Auto-cleared on page unload (keeps last 10 logs)
- Visual indicators and tools available

### Production
- Logs sent to monitoring service (configurable)
- No local storage in production
- Structured error data with full context

## Error Recovery

### Automatic Recovery
- SWR automatic retries with exponential backoff
- Component error boundaries prevent app crashes
- Graceful fallbacks for failed data fetching

### Manual Recovery
- Refresh buttons on error pages
- Retry mechanisms for failed operations
- User-friendly error messages

## Best Practices

### Do's
- ✅ Use appropriate log levels
- ✅ Include relevant context in error logs
- ✅ Wrap critical components with error boundaries
- ✅ Test error scenarios in development

### Don'ts
- ❌ Don't log sensitive information (passwords, tokens)
- ❌ Don't use console.log in production code
- ❌ Don't ignore SWR errors (they're automatically logged)
- ❌ Don't expose internal error details to users

## Monitoring and Alerting

### Error Thresholds
- Monitor error rates by endpoint
- Alert on high error frequencies
- Track user impact of errors

### Performance Monitoring
- Track API response times
- Monitor SWR cache hit rates
- Alert on slow loading times

## Troubleshooting

### Common Issues

1. **Logs not appearing in development**
   - Check if `NODE_ENV=development`
   - Verify dev tools are loaded
   - Check browser console for errors

2. **Production logs not being sent**
   - Verify monitoring service integration
   - Check network connectivity
   - Ensure proper environment variables

3. **Error boundaries not catching errors**
   - Ensure component is wrapped properly
   - Check for async errors (use try-catch)
   - Verify error boundary placement

### Debug Commands

```javascript
// Check logger status
console.log('Logger available:', !!window.__FAITH_LOGGER__);

// Test logging
window.__FAITH_LOGGER__.testError();

// Export logs for analysis
window.__FAITH_LOGGER__.exportLogs();
```

## Future Enhancements

- [ ] Real-time log streaming
- [ ] Advanced error grouping
- [ ] Performance metrics integration
- [ ] User session tracking
- [ ] Automated error reporting
- [ ] Log aggregation and analysis
