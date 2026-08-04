import { Component, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  label: string;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.label}] caught:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-6">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-red-400 text-lg">⚠</span>
            <h3 className="font-mono text-sm font-bold text-red-300">
              {this.props.label} — Rendering Error
            </h3>
          </div>
          <p className="text-xs text-red-400/80 font-mono mb-1">
            {this.state.error?.message ?? 'Unknown error'}
          </p>
          <p className="text-[10px] text-zinc-600 mb-4">
            The error was caught and isolated. Other parts of the app are unaffected.
          </p>
          <button
            onClick={this.handleRetry}
            className="rounded-md border border-red-500/30 bg-red-950/30 px-4 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-900/40 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
