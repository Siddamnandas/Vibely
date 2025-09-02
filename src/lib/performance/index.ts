/**
 * Performance Optimization Suite for Vibely
 * Centralized performance management system
 */

import { useEffect } from "react";

// Re-export main performance utilities
export * from "./image-cache";
export {
  imageCache,
  cacheCoverImage,
  getOptimizedCoverUrl,
  getImageCacheStats,
} from "./image-cache";

// Performance monitoring utilities
export function usePerformanceMonitor(componentName: string) {
  useEffect(() => {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Log component performance
      if (duration > 100) {
        console.log(`${componentName} render time: ${duration.toFixed(2)}ms`);
      }
    };
  }, [componentName]);
}

// Core performance types
export interface PerformanceMetrics {
  coreWebVitals: {
    cls: number; // Cumulative Layout Shift
    fid: number; // First Input Delay
    lcp: number; // Largest Contentful Paint
  };
  bundleSize: {
    total: number;
    main: number;
    vendor: number;
    chunks: number;
  };
  cacheStats: {
    hitRate: number;
    coverage: number;
    size: number;
  };
}

// Performance monitoring hook
export function usePerformanceMetrics() {
  const metrics = {
    getMemoryUsage: () => {
      if (typeof performance !== "undefined") {
        // @ts-ignore
        return performance.memory?.usedJSHeapSize || 0;
      }
      return 0;
    },

    trackPageLoadTime: (pageName: string) => {
      if (typeof window !== "undefined" && window.performance) {
        const timing = performance.getEntriesByType("navigation")[0] as any;
        console.log(`${pageName} load time: ${timing.loadEventEnd - timing.navigationStart}ms`);
      }
    },

    monitorInteraction: (interactionName: string) => {
      if (typeof window !== "undefined" && window.performance) {
        console.time(interactionName);

        // Mark interaction start
        if (window.performance?.mark) {
          window.performance.mark(`${interactionName}-start`);
        }
      }
    },

    endInteractionMonitoring: (interactionName: string) => {
      if (typeof window !== "undefined" && window.performance) {
        console.timeEnd(interactionName);

        // Mark interaction end
        if (window.performance?.mark) {
          window.performance.mark(`${interactionName}-end`);
          window.performance.measure(
            `${interactionName}-duration`,
            `${interactionName}-start`,
            `${interactionName}-end`,
          );
        }
      }
    },
  };

  return metrics;
}

// Lazy loading hooks
export function useLazyLoad(rootMargin = "50px") {
  return {
    root: null,
    rootMargin,
    threshold: 0.1,
    once: true,
  };
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  // Simplified implementation - import from image-cache if needed
  return value;
}

// Performance-driven image loading
export async function preloadCriticalImages(
  coverIds: string[],
  priority: "high" | "medium" | "low" = "high",
) {
  const { preloadCoverImages } = await import("./image-cache");
  return preloadCoverImages(coverIds, priority);
}

// Bundle splitting helpers
export function createDynamicRoute(importer: () => Promise<any>) {
  return importer;
}

// Service worker registration with performance tracking
export async function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator) {
    try {
      // Check if already registered to avoid duplicate registrations
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (registration) {
        console.log("SW already registered");
        return registration;
      }

      const newRegistration = await navigator.serviceWorker.register("/sw.js");
      console.log("SW registered:", newRegistration);

      // Track sw lifecycle events
      newRegistration.addEventListener("updatefound", () => {
        console.log("SW update found");
      });

      return newRegistration;
    } catch (error) {
      console.warn("SW registration failed:", error);
    }
  }
}

// Performance configuration
export const performanceConfig = {
  // Image optimization
  imageFormats: ["webp", "auto", "png"],

  // Lazy loading
  lazyLoadThreshold: "0.1",
  rootMargin: "50px",

  // Cache configuration
  cacheName: "vibely-cache-v1",
  cacheVersion: "1.0.0",

  // Bundle optimization
  chunkSizeLimit: 512 * 1024, // 512KB

  // Monitoring
  enablePerformanceMonitoring: true,
  logSlowComponents: true,
  slowComponentThreshold: 100, // ms
};

export default performanceConfig;
