// Sentry configuration for error tracking and performance monitoring
import * as Sentry from "@sentry/nextjs";

export const initSentry = () => {
  if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
      tracesSampleRate: 1.0, // Capture 100% of transactions in production
      replaysSessionSampleRate: 0.1, // Capture 10% of sessions
      replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with errors
      // Filter out sensitive data
      beforeSend: (event) => {
        // Don't send events from localhost
        if (typeof window !== "undefined" && window.location.hostname === "localhost") {
          return null;
        }

        // Filter out events with sensitive data
        if (event.request?.url?.includes("auth")) {
          delete event.request;
        }

        return event;
      },
    });
  }
};

// Helper function to capture errors
export const captureError = (error: Error, context?: Record<string, any>) => {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureException(error, {
      contexts: {
        context,
      },
    });
  } else {
    console.error("Captured error:", error, context);
  }
};

// Helper function to capture messages
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  if (process.env.NODE_ENV === "production") {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`Captured message (${level}):`, message);
  }
};

// Helper function to capture performance metrics
export const capturePerformance = (
  name: string,
  op: string,
  description?: string,
  data?: Record<string, any>,
) => {
  if (process.env.NODE_ENV === "production") {
    const transaction = Sentry.startInactiveSpan({
      name,
      op,
      attributes: data,
    });

    return transaction;
  }
  return null;
};
