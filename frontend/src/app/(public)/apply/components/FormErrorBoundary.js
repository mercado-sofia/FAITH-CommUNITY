"use client";

import { Component } from "react";
import logger from "../../../../utils/logger";

class FormErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });

    // Log the error
    logger.componentError(
      `FormErrorBoundary - ${this.props.componentName || 'Unknown Component'}`,
      error,
      {
        componentName: this.props.componentName,
        errorInfo: errorInfo,
        formSection: this.props.formSection
      }
    );
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          border: '2px solid #fee2e2',
          borderRadius: '0.5rem',
          backgroundColor: '#fef2f2',
          margin: '1rem 0'
        }}>
          <div style={{
            textAlign: 'center',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem'
            }}>⚠️</div>
            <h3 style={{
              color: '#dc2626',
              marginBottom: '0.5rem',
              fontSize: '1.25rem'
            }}>Something went wrong</h3>
            <p style={{
              color: '#6b7280',
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}>
              We encountered an error while loading the {this.props.componentName || 'form section'}.
              Please try refreshing the page or contact support if the problem persists.
            </p>
            
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button 
                onClick={this.handleRetry}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#1a685b',
                  color: 'white'
                }}
                type="button"
              >
                Try Again
              </button>
              
              <button 
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.375rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#6b7280',
                  color: 'white'
                }}
                type="button"
              >
                Refresh Page
              </button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details style={{
                marginTop: '1.5rem',
                textAlign: 'left'
              }}>
                <summary style={{
                  cursor: 'pointer',
                  color: '#6b7280',
                  fontWeight: '600',
                  marginBottom: '0.5rem'
                }}>Error Details (Development)</summary>
                <pre style={{
                  backgroundColor: '#1f2937',
                  color: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>{this.state.error.toString()}</pre>
                <pre style={{
                  backgroundColor: '#1f2937',
                  color: '#f9fafb',
                  padding: '1rem',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem',
                  overflowX: 'auto',
                  whiteSpace: 'pre-wrap'
                }}>{this.state.errorInfo.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;
