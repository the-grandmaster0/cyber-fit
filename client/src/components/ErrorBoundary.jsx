
import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Update state so the next render shows the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error', error, errorInfo);
    }
  }

  handleTryAgain = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-cyber-black cyber-grid flex items-center justify-center p-6">
          <div className="max-w-md w-full cyber-card bg-cyber-dark p-8 text-center">
            <div className="text-6xl mb-4">💥</div>
            <h2 className="text-xl font-bold text-white mb-2 font-sans">SYSTEM CRASH</h2>
            <p className="text-gray-400 mb-6 font-mono text-sm">
              An unexpected error occurred. Try again or return to the mainframe.
            </p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleTryAgain}
                className="cyber-button px-6 py-2 bg-gradient-to-r from-cyber-purple-600 to-cyber-cyan-600 text-white font-mono text-sm hover:shadow-purple-glow transition-all"
              >
                [ TRY AGAIN ]
              </button>
              <button
                onClick={() => (window.location.href = '/')}
                className="cyber-button px-6 py-2 border-2 border-cyber-purple-500 text-cyber-purple-200 font-mono text-sm hover:bg-cyber-purple-900/50 transition-all"
              >
                [ GO HOME ]
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
