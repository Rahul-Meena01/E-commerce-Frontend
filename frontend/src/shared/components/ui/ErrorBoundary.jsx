import React from "react";
import "../../../styles/global.css";
import "../../../styles/ui.css";
import logger from '@/shared/utils/logger';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    logger.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-shell">
          <div className="error-boundary-card">
            <h2 className="error-boundary-title">Something Went Wrong</h2>
            <p className="error-boundary-message">
              We apologize for the inconvenience. An unexpected error occurred
              while loading this page.
            </p>
            <div className="error-boundary-actions">
              <button
                onClick={this.handleReset}
                className="error-boundary-button"
              >
                Reload Page
              </button>
              <a href="/" className="error-boundary-link">
                Go Home
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
