'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ServiceError, executeErrorRecovery } from '@/lib/error-handling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Handle service errors
    if (error instanceof ServiceError) {
      executeErrorRecovery({
        success: false,
        error: error.message,
        code: error.context.service.toUpperCase() + '_ERROR',
        recoverable: error.recoverable,
        retryAfter: error.retryAfter,
        fallbackAction: error.fallbackAction
      }, error.context);
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="mb-6">
              <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold mb-2">Something went wrong</h1>
              <p className="text-gray-400 mb-6">
                We encountered an unexpected error. Don't worry, we're working to fix it.
              </p>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => window.location.reload()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 px-6 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-400 hover:text-white">
                  Error Details (Development)
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-gray-900 p-4 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
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

// Hook for handling async errors
export function useErrorHandler() {
  const handleError = (error: Error, context?: string) => {
    console.error(`Error in ${context || 'unknown context'}:`, error);
    
    if (error instanceof ServiceError) {
      executeErrorRecovery({
        success: false,
        error: error.message,
        code: error.context.service.toUpperCase() + '_ERROR',
        recoverable: error.recoverable,
        retryAfter: error.retryAfter,
        fallbackAction: error.fallbackAction
      }, error.context);
    } else {
      // Handle generic errors
      console.error('Unhandled error:', error);
    }
  };

  return { handleError };
}

// Component for displaying service-specific errors
interface ServiceErrorDisplayProps {
  error: ServiceError;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function ServiceErrorDisplay({ error, onRetry, onDismiss }: ServiceErrorDisplayProps) {
  const getErrorIcon = (service: string) => {
    switch (service) {
      case 'clerk':
        return '🔐';
      case 'stripe':
        return '💳';
      case 'mailerlite':
        return '📧';
      case 'aws':
        return '☁️';
      case 'database':
        return '🗄️';
      default:
        return '⚠️';
    }
  };

  const getErrorColor = (service: string) => {
    switch (service) {
      case 'clerk':
        return 'border-purple-500 bg-purple-50 text-purple-800';
      case 'stripe':
        return 'border-blue-500 bg-blue-50 text-blue-800';
      case 'mailerlite':
        return 'border-green-500 bg-green-50 text-green-800';
      case 'aws':
        return 'border-orange-500 bg-orange-50 text-orange-800';
      case 'database':
        return 'border-red-500 bg-red-50 text-red-800';
      default:
        return 'border-gray-500 bg-gray-50 text-gray-800';
    }
  };

  return (
    <div className={`border-l-4 p-4 mb-4 ${getErrorColor(error.context.service)}`}>
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl">{getErrorIcon(error.context.service)}</span>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium">
            {error.context.service.charAt(0).toUpperCase() + error.context.service.slice(1)} Error
          </h3>
          <p className="mt-1 text-sm">{error.message}</p>
          
          {error.recoverable && (
            <div className="mt-3 flex space-x-3">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm font-medium hover:underline"
                >
                  Try Again
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="text-sm font-medium hover:underline"
                >
                  Dismiss
                </button>
              )}
            </div>
          )}
          
          {error.retryAfter && (
            <p className="mt-2 text-xs opacity-75">
              Retry available in {error.retryAfter} seconds
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
