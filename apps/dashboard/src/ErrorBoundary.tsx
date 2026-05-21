import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. Defaults to a centered error card. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches unexpected render-time exceptions anywhere in the subtree and
 * prevents the whole page from going blank.
 *
 * Usage in main.tsx:
 *   <ErrorBoundary><App /></ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    // In production, send this to your observability platform (Sentry, Datadog, etc.)
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div className="error-boundary-fallback" role="alert">
        <div className="error-boundary-card">
          <h2>Something went wrong</h2>
          <p>
            An unexpected error occurred in the application. Please try refreshing
            the page. If the problem persists, contact support.
          </p>
          <div className="error-boundary-actions">
            <button type="button" className="primary-button" onClick={this.handleReset}>
              Try again
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
