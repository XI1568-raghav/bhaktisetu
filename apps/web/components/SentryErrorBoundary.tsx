'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { captureBrowserException } from '../lib/sentry';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

// Class component is required for React error boundary lifecycle.
// Catches render-tree errors that don't reach Next.js global-error.
export class SentryErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    captureBrowserException(error, {
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
            <p>Something went wrong. Please refresh.</p>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
