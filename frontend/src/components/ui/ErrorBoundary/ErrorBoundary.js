'use client';

import React from 'react';
import { FaExclamationTriangle, FaRedo } from 'react-icons/fa';
import logger from '@/utils/logger';
import styles from './ErrorBoundary.module.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error with more context
    logger.componentError('ErrorBoundary', error, {
      errorInfo,
      componentStack: errorInfo.componentStack,
      location: typeof window !== 'undefined' ? window.location.href : 'server-side',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      timestamp: new Date().toISOString()
    });

    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Report to external error tracking service if available
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: true
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Check if compact mode is requested (for profile and similar components)
      const isCompact = this.props.compact;
      
      if (isCompact) {
        // Compact fallback UI similar to the public ErrorBoundary
        return (
          <div className={this.props.className || styles.compactContainer}>
            <div className={styles.compactContent}>
              <FaExclamationTriangle className={styles.compactIcon} />
              <h3 className={styles.compactTitle}>
                Something went wrong
              </h3>
              <p className={styles.compactMessage}>
                We encountered an unexpected error. Please try refreshing the page.
              </p>
              <button
                onClick={this.handleRetry}
                className={styles.compactButton}
              >
                <FaRedo />
                Try Again
              </button>
            </div>
          </div>
        );
      }

      // Enhanced fallback UI with better error recovery (default mode)
      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <FaExclamationTriangle className={styles.icon} />
            <h2 className={styles.title}>
              Something went wrong
            </h2>
            <p className={styles.message}>
              We&apos;re sorry, but something unexpected happened. This might be a temporary issue.
            </p>
            
            <div className={styles.actions}>
              <button
                onClick={this.handleRetry}
                className={`${styles.button} ${styles.buttonRetry}`}
              >
                <FaRedo />
                Try Again
              </button>
              
              <button
                onClick={this.handleReload}
                className={`${styles.button} ${styles.buttonReload}`}
              >
                Reload Page
              </button>
            </div>

            {this.state.retryCount > 0 && (
              <p className={styles.retryInfo}>
                Retry attempt: {this.state.retryCount}
              </p>
            )}

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className={styles.details}>
                <summary>
                  Error Details (Development)
                </summary>
                <pre className={styles.errorPre}>
                  {this.state.error && this.state.error.toString()}
                  {this.state.errorInfo && this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;