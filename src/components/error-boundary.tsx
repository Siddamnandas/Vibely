"use client";

import React from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<ErrorFallbackProps>;
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service
    if (typeof window !== "undefined") {
      // In production, you would send this to your error monitoring service
      console.error("Error Details:", {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      });
    }
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { fallback: Fallback } = this.props;

      if (Fallback && this.state.error) {
        return <Fallback error={this.state.error} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Default error fallback component
function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center px-6">
      <Card className="max-w-md w-full bg-white/5 border-white/20">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#FF6F91]/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-[#FF6F91]" />
          </div>
          <CardTitle className="text-2xl font-bold text-white">Something went wrong</CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-white/70 mb-4">
              We encountered an unexpected error. This has been logged and our team will
              investigate.
            </p>

            {process.env.NODE_ENV === "development" && (
              <details className="text-left">
                <summary className="text-white/50 text-sm cursor-pointer mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="bg-black/50 p-4 rounded-lg text-xs font-mono text-white/60 max-h-32 overflow-y-auto">
                  <div className="mb-2">
                    <strong>Message:</strong> {error.message}
                  </div>
                  {error.stack && (
                    <div>
                      <strong>Stack:</strong>
                      <pre className="whitespace-pre-wrap mt-1">{error.stack}</pre>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>

          <div className="space-y-3">
            <Button
              onClick={resetError}
              className="w-full bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] text-black font-bold hover:opacity-90"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={handleReload}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              Reload Page
            </Button>

            <Button
              onClick={handleGoHome}
              variant="ghost"
              className="w-full text-white/70 hover:bg-white/5"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Specific error fallback for music-related errors
export function MusicErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 mb-4 bg-[#FF6F91]/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-[#FF6F91]" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Music Service Error</h3>
      <p className="text-white/70 mb-6 max-w-sm">
        Unable to connect to your music service. Please check your connection and try again.
      </p>

      <div className="space-y-3">
        <Button
          onClick={resetError}
          className="bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] text-black font-bold hover:opacity-90"
        >
          Retry Connection
        </Button>
      </div>
    </div>
  );
}

// Photo-related error fallback
export function PhotoErrorFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      <div className="w-16 h-16 mb-4 bg-[#FF6F91]/20 rounded-full flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-[#FF6F91]" />
      </div>

      <h3 className="text-xl font-bold text-white mb-2">Photo Processing Error</h3>
      <p className="text-white/70 mb-6 max-w-sm">
        Unable to process your photos. This might be due to file format or permission issues.
      </p>

      <Button
        onClick={resetError}
        className="bg-gradient-to-r from-[#9FFFA2] to-[#8FD3FF] text-black font-bold hover:opacity-90"
      >
        Try Different Photos
      </Button>
    </div>
  );
}

export default ErrorBoundary;
export type { ErrorBoundaryProps, ErrorFallbackProps };
