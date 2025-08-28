"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { analytics } from "@/lib/analytics";
import type { AnalyticsEvent, EventProperties, UserProperties } from "@/lib/analytics";

interface AnalyticsContextType {
  track: (event: AnalyticsEvent, properties?: EventProperties) => void;
  identify: (userId: string, properties?: UserProperties) => void;
  pageView: (page: string, properties?: EventProperties) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    analytics.initialize();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      analytics.pageView(window.location.pathname);
    }
  }, []);

  const contextValue: AnalyticsContextType = {
    track: (event: AnalyticsEvent, properties?: EventProperties) => {
      analytics.track(event, properties);
    },
    identify: (userId: string, properties?: UserProperties) => {
      analytics.identify(userId, properties);
    },
    pageView: (page: string, properties?: EventProperties) => {
      analytics.pageView(page, properties);
    },
  };

  return <AnalyticsContext.Provider value={contextValue}>{children}</AnalyticsContext.Provider>;
}

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalytics must be used within an AnalyticsProvider");
  }
  return context;
}
