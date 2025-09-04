/**
 * Basic Analytics Tracking System for Vibely
 * Tracks user interactions and performance metrics
 */

import { useEffect, useCallback } from 'react';

export interface TrackingEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  type: 'timing' | 'counter' | 'gauge';
  timestamp?: number;
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker;
  private events: TrackingEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private sessionId!: string;
  private maxStorage = 1000;

  constructor() {
    if (AnalyticsTracker.instance) {
      return AnalyticsTracker.instance;
    }

    this.sessionId = this.generateSessionId();
    AnalyticsTracker.instance = this;
    this.loadStoredData();

    // Clean up periodically
    setInterval(() => this.cleanupOldData(), 60 * 1000);
  }

  /**
   * Track user interaction events
   */
  trackEvent(eventName: string, properties?: Record<string, any>) {
    const event: TrackingEvent = {
      eventName,
      properties: {
        ...properties,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        screenSize: typeof window !== 'undefined'
          ? `${window.screen.width}x${window.screen.height}`
          : undefined
      },
      timestamp: Date.now(),
      sessionId: this.sessionId
    };

    this.events.push(event);
    this.saveData();

    // Console logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Tracked event: ${eventName}`, properties);
    }
  }

  /**
   * Track performance metrics
   */
  trackMetric(name: string, value: number, type: 'timing' | 'counter' | 'gauge' = 'gauge') {
    const metric: PerformanceMetric = {
      name,
      value,
      type,
      timestamp: Date.now()
    };

    this.metrics.push(metric);
    this.saveData();

    if (process.env.NODE_ENV === 'development') {
      console.log(`📈 Performance metric: ${name} = ${value}`);
    }
  }

  /**
   * Track page views
   */
  trackPageView(pageName: string, properties?: Record<string, any>) {
    this.trackEvent('page_view', {
      page: pageName,
      ...properties
    });

    // Track page load time if Performance API is available
    if (typeof performance !== 'undefined' && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.trackMetric('page_load_time', loadTime, 'timing');
    }
  }

  /**
   * Track user engagement metrics
   */
  trackEngagement(action: string, target: string, additionalData?: Record<string, any>) {
    this.trackEvent('user_engagement', {
      action,
      target,
      ...additionalData
    });
  }

  /**
   * Track conversion events
   */
  trackConversion(conversionType: string, value?: number, properties?: Record<string, any>) {
    this.trackEvent('conversion', {
      conversion_type: conversionType,
      value,
      ...properties
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): TrackingEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Get performance metrics summary
   */
  getMetricsSummary(): Array<{
    name: string;
    avgValue: number;
    minValue: number;
    maxValue: number;
    totalEvents: number;
  }> {
    const summaries = new Map<string, {
      values: number[];
      count: number;
    }>();

    this.metrics.forEach(metric => {
      const existing = summaries.get(metric.name) || { values: [], count: 0 };
      existing.values.push(metric.value);
      existing.count++;
      summaries.set(metric.name, existing);
    });

    return Array.from(summaries.entries()).map(([name, data]) => ({
      name,
      avgValue: Math.round((data.values.reduce((sum, val) => sum + val, 0) / data.values.length) * 100) / 100,
      minValue: Math.min(...data.values),
      maxValue: Math.max(...data.values),
      totalEvents: data.count
    }));
  }

  /**
   * Get event type breakdown
   */
  getEventBreakdown(): Array<{
    eventName: string;
    count: number;
    recentUsage: number;
  }> {
    const breakdown = new Map<string, number>();
    const recentBreakdown = new Map<string, number>();

    const recentThreshold = Date.now() - (60 * 60 * 1000); // Last hour

    this.events.forEach(event => {
      breakdown.set(event.eventName, (breakdown.get(event.eventName) || 0) + 1);

      if (event.timestamp && event.timestamp > recentThreshold) {
        recentBreakdown.set(event.eventName, (recentBreakdown.get(event.eventName) || 0) + 1);
      }
    });

    return Array.from(breakdown.entries())
      .map(([eventName, count]) => ({
        eventName,
        count,
        recentUsage: recentBreakdown.get(eventName) || 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Export analytics data (for debugging)
   */
  exportData() {
    return {
      sessionId: this.sessionId,
      totalEvents: this.events.length,
      totalMetrics: this.metrics.length,
      recentEvents: this.getRecentEvents(20),
      metricsSummary: this.getMetricsSummary(),
      eventBreakdown: this.getEventBreakdown()
    };
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private saveData() {
    if (typeof window === 'undefined') return;

    try {
      // Keep only recent events and metrics to avoid storage bloat
      const recentEvents = this.events.slice(-this.maxStorage);
      const recentMetrics = this.metrics.slice(-this.maxStorage);

      localStorage.setItem('vibely_analytics_events', JSON.stringify(recentEvents));
      localStorage.setItem('vibely_analytics_metrics', JSON.stringify(recentMetrics));
      localStorage.setItem('vibely_session_id', this.sessionId);
    } catch (error) {
      console.warn('Error saving analytics data:', error);
    }
  }

  private loadStoredData() {
    if (typeof window === 'undefined') return;

    try {
      const storedEvents = JSON.parse(localStorage.getItem('vibely_analytics_events') || '[]');
      const storedMetrics = JSON.parse(localStorage.getItem('vibely_analytics_metrics') || '[]');
      const storedSessionId = localStorage.getItem('vibely_session_id');

      this.events = storedEvents;
      this.metrics = storedMetrics;

      if (storedSessionId) {
        this.sessionId = storedSessionId;
      }
    } catch (error) {
      console.warn('Error loading analytics data:', error);
    }
  }

  private cleanupOldData() {
    if (typeof window === 'undefined') return;

    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

    // Filter old data
    this.events = this.events.filter(event =>
      event.timestamp && event.timestamp > oneWeekAgo
    );

    this.metrics = this.metrics.filter(metric =>
      metric.timestamp && metric.timestamp > oneWeekAgo
    );

    // Save cleaned data
    this.saveData();
  }
}

export const analyticsTracker = new AnalyticsTracker();

// React hooks for easy integration
export function useAnalytics() {
  const trackEvent = useCallback((eventName: string, properties?: Record<string, any>) => {
    analyticsTracker.trackEvent(eventName, properties);
  }, []);

  const trackMetric = useCallback((name: string, value: number, type?: 'timing' | 'counter' | 'gauge') => {
    analyticsTracker.trackMetric(name, value, type);
  }, []);

  const trackPageView = useCallback((pageName: string, properties?: Record<string, any>) => {
    analyticsTracker.trackPageView(pageName, properties);
  }, []);

  const trackEngagement = useCallback((action: string, target: string, additionalData?: Record<string, any>) => {
    analyticsTracker.trackEngagement(action, target, additionalData);
  }, []);

  const trackConversion = useCallback((conversionType: string, value?: number, properties?: Record<string, any>) => {
    analyticsTracker.trackConversion(conversionType, value, properties);
  }, []);

  return {
    trackEvent,
    trackMetric,
    trackPageView,
    trackEngagement,
    trackConversion
  };
}

// Performance tracking hooks
export function usePerformanceTracking(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      analyticsTracker.trackMetric(`${componentName}_render_time`, duration, 'timing');
    };
  }, [componentName]);
}

// Automatic page tracking hook
export function usePageTracking(pageName: string, dependencies?: any[]) {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView(pageName);

    // Track page visibility changes
    const handleVisibilityChange = () => {
      trackEvent(
        document.hidden ? 'page_hidden' : 'page_visible',
        { page: pageName, timeSpent: Date.now() }
      );
    };

    const trackEvent = (event: string, props?: any) => {
      analyticsTracker.trackEvent(event, props);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pageName, trackPageView, dependencies]);

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollPercentage = Math.round((scrollTop / (documentHeight - windowHeight)) * 100);

      // Track milestones (25%, 50%, 75%, 90%)
      if ([25, 50, 75, 90].includes(scrollPercentage)) {
        analyticsTracker.trackEvent('scroll_milestone', {
          page: pageName,
          scrollPercentage
        });
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageName]);
}

// User interaction tracking hook
export function useInteractionTracking(eventName: string, eventData?: Record<string, any>) {
  const { trackEvent } = useAnalytics();

  const trackInteraction = useCallback((additionalData?: Record<string, any>) => {
    trackEvent(eventName, {
      ...eventData,
      ...additionalData,
      timestamp: new Date().toISOString()
    });
  }, [eventName, eventData, trackEvent]);

  return trackInteraction;
}

// Error tracking hook
export function useErrorTracking(componentName: string) {
  const { trackEvent } = useAnalytics();

  const trackError = useCallback((error: Error | string, context?: Record<string, any>) => {
    const errorData = typeof error === 'string' ? { message: error } : {
      message: error.message,
      stack: error.stack,
      name: error.name
    };

    trackEvent('error_occurred', {
      component: componentName,
      ...errorData,
      ...context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined
    });
  }, [componentName, trackEvent]);

  return trackError;
}

// Export convenience functions
export const trackEvent = analyticsTracker.trackEvent.bind(analyticsTracker);
export const trackMetric = analyticsTracker.trackMetric.bind(analyticsTracker);
export const trackPageView = analyticsTracker.trackPageView.bind(analyticsTracker);
export const trackEngagement = analyticsTracker.trackEngagement.bind(analyticsTracker);
export const trackConversion = analyticsTracker.trackConversion.bind(analyticsTracker);
