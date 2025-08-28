/**
 * Performance Monitoring Utilities
 * Tracks Core Web Vitals and app-specific metrics
 */

import React from "react";

// Performance metrics interface
export interface PerformanceMetrics {
  // Core Web Vitals
  CLS?: number; // Cumulative Layout Shift
  FCP?: number; // First Contentful Paint
  FID?: number; // First Input Delay
  LCP?: number; // Largest Contentful Paint
  TTFB?: number; // Time to First Byte

  // App-specific metrics
  musicLoadTime?: number;
  photoProcessingTime?: number;
  coverGenerationTime?: number;
  navigationTime?: number;
}

// Performance observer class
class PerformanceMonitor {
  private metrics: PerformanceMetrics = {};
  private observers: PerformanceObserver[] = [];
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof window !== "undefined" && "PerformanceObserver" in window;
    if (this.isSupported) {
      this.initializeObservers();
    }
  }

  private initializeObservers() {
    // Observe paint metrics (FCP, LCP)
    try {
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            this.metrics.FCP = entry.startTime;
          }
        });
      });
      paintObserver.observe({ entryTypes: ["paint"] });
      this.observers.push(paintObserver);
    } catch (error) {
      console.warn("Paint observer not supported");
    }

    // Observe LCP
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          this.metrics.LCP = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
      this.observers.push(lcpObserver);
    } catch (error) {
      console.warn("LCP observer not supported");
    }

    // Observe FID
    try {
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          // Type assertion for First Input Delay entry
          const fidEntry = entry as any;
          if (fidEntry.processingStart && fidEntry.startTime) {
            this.metrics.FID = fidEntry.processingStart - fidEntry.startTime;
          }
        });
      });
      fidObserver.observe({ entryTypes: ["first-input"] });
      this.observers.push(fidObserver);
    } catch (error) {
      console.warn("FID observer not supported");
    }

    // Observe CLS
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        });
        this.metrics.CLS = Math.max(this.metrics.CLS || 0, clsValue);
      });
      clsObserver.observe({ entryTypes: ["layout-shift"] });
      this.observers.push(clsObserver);
    } catch (error) {
      console.warn("CLS observer not supported");
    }

    // Observe navigation timing for TTFB
    this.observeNavigationTiming();
  }

  private observeNavigationTiming() {
    if (typeof window !== "undefined" && window.performance && window.performance.timing) {
      const timing = window.performance.timing;
      this.metrics.TTFB = timing.responseStart - timing.navigationStart;
    }
  }

  // Track custom app metrics
  trackMusicLoadTime(startTime: number, endTime: number) {
    this.metrics.musicLoadTime = endTime - startTime;
    this.reportMetric("music_load_time", this.metrics.musicLoadTime);
  }

  trackPhotoProcessing(startTime: number, endTime: number) {
    this.metrics.photoProcessingTime = endTime - startTime;
    this.reportMetric("photo_processing_time", this.metrics.photoProcessingTime);
  }

  trackCoverGeneration(startTime: number, endTime: number) {
    this.metrics.coverGenerationTime = endTime - startTime;
    this.reportMetric("cover_generation_time", this.metrics.coverGenerationTime);
  }

  trackNavigation(route: string, loadTime: number) {
    this.metrics.navigationTime = loadTime;
    this.reportMetric("navigation_time", loadTime, { route });
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  // Report metric to analytics (placeholder for future integration)
  public reportMetric(name: string, value: number, attributes?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      console.log(`📊 Performance Metric: ${name}`, {
        value: `${Math.round(value)}ms`,
        ...attributes,
      });
    }

    // Future: Send to analytics service
    // analytics.track(name, { value, ...attributes });
  }

  // Performance score calculation
  calculatePerformanceScore(): number {
    const metrics = this.getMetrics();
    let score = 100;

    // LCP scoring (Good: <2.5s, Needs improvement: 2.5s-4s, Poor: >4s)
    if (metrics.LCP) {
      if (metrics.LCP > 4000) score -= 30;
      else if (metrics.LCP > 2500) score -= 15;
    }

    // FID scoring (Good: <100ms, Needs improvement: 100ms-300ms, Poor: >300ms)
    if (metrics.FID) {
      if (metrics.FID > 300) score -= 25;
      else if (metrics.FID > 100) score -= 10;
    }

    // CLS scoring (Good: <0.1, Needs improvement: 0.1-0.25, Poor: >0.25)
    if (metrics.CLS) {
      if (metrics.CLS > 0.25) score -= 20;
      else if (metrics.CLS > 0.1) score -= 10;
    }

    // FCP scoring (Good: <1.8s, Needs improvement: 1.8s-3s, Poor: >3s)
    if (metrics.FCP) {
      if (metrics.FCP > 3000) score -= 15;
      else if (metrics.FCP > 1800) score -= 7;
    }

    return Math.max(0, score);
  }

  // Cleanup observers
  disconnect() {
    this.observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn("Error disconnecting observer:", error);
      }
    });
    this.observers = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// React hook for performance tracking
export function usePerformanceTracking(componentName: string) {
  const startTimeRef = React.useRef<number>();
  const [metrics, setMetrics] = React.useState<PerformanceMetrics>({});

  React.useEffect(() => {
    startTimeRef.current = performance.now();

    return () => {
      if (startTimeRef.current) {
        const loadTime = performance.now() - startTimeRef.current;
        performanceMonitor.trackNavigation(componentName, loadTime);
      }
    };
  }, [componentName]);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(performanceMonitor.getMetrics());
    };

    // Update metrics periodically
    const interval = setInterval(updateMetrics, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const trackCustomMetric = React.useCallback(
    (name: string, duration: number) => {
      performanceMonitor.reportMetric(`${componentName}_${name}`, duration);
    },
    [componentName],
  );

  return {
    metrics,
    trackCustomMetric,
    performanceScore: performanceMonitor.calculatePerformanceScore(),
  };
}

// Performance timing utilities
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  end(category?: "music" | "photo" | "cover" | "navigation") {
    const endTime = performance.now();
    const duration = endTime - this.startTime;

    switch (category) {
      case "music":
        performanceMonitor.trackMusicLoadTime(this.startTime, endTime);
        break;
      case "photo":
        performanceMonitor.trackPhotoProcessing(this.startTime, endTime);
        break;
      case "cover":
        performanceMonitor.trackCoverGeneration(this.startTime, endTime);
        break;
      case "navigation":
        performanceMonitor.trackNavigation(this.name, duration);
        break;
      default:
        performanceMonitor.reportMetric(this.name, duration);
    }

    return duration;
  }
}

// Utility function to create performance timers
export function createPerformanceTimer(name: string): PerformanceTimer {
  return new PerformanceTimer(name);
}

// Memory usage tracking
export function getMemoryUsage() {
  if (typeof window !== "undefined" && "memory" in performance) {
    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      usagePercentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}
