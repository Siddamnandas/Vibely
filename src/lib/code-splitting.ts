/**
 * Code Splitting and Dynamic Import Utilities
 * Enables lazy loading of components and features for better performance
 */

import React, { ComponentType, LazyExoticComponent, Suspense } from "react";

// Component preloader for eager loading
export class ComponentPreloader {
  private preloadedComponents = new Set<string>();
  private preloadPromises = new Map<string, Promise<any>>();

  async preloadComponent(key: string, importFn: () => Promise<any>): Promise<void> {
    if (this.preloadedComponents.has(key)) {
      return;
    }

    if (this.preloadPromises.has(key)) {
      return this.preloadPromises.get(key);
    }

    const promise = importFn()
      .then(() => {
        this.preloadedComponents.add(key);
        this.preloadPromises.delete(key);
      })
      .catch((error) => {
        console.warn(`Failed to preload component ${key}:`, error);
        this.preloadPromises.delete(key);
        throw error;
      });

    this.preloadPromises.set(key, promise);
    return promise;
  }

  isPreloaded(key: string): boolean {
    return this.preloadedComponents.has(key);
  }

  preloadOnIdle(key: string, importFn: () => Promise<any>) {
    if (typeof window === "undefined") return;

    const preload = () => this.preloadComponent(key, importFn);

    if ("requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preload, { timeout: 2000 });
    } else {
      setTimeout(preload, 100);
    }
  }

  preloadOnHover(element: HTMLElement, key: string, importFn: () => Promise<any>) {
    let timeoutId: NodeJS.Timeout;

    const handleMouseEnter = () => {
      timeoutId = setTimeout(() => {
        this.preloadComponent(key, importFn);
      }, 100);
    };

    const handleMouseLeave = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("mouseleave", handleMouseLeave);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }
}

export const componentPreloader = new ComponentPreloader();

// Route-based code splitting utilities
export const routeComponents = {
  // Core pages (always loaded)
  Generator: () => import("@/app/(app)/generator/page"),
  Library: () => import("@/app/(app)/library/page"),
  Profile: () => import("@/app/(app)/profile/page"),

  // Feature components (lazy loaded)
  Stories: () => import("@/app/(app)/stories/page"),
  Subscription: () => import("@/app/(app)/subscription/page"),
  PhotoGallery: () => import("@/components/photo-gallery"),

  // Heavy components (when they exist)
  StoryViewer: () => Promise.resolve({ default: () => null }),
  CoverGenerator: () => Promise.resolve({ default: () => null }),
  MusicPlayer: () => Promise.resolve({ default: () => null }),
};

// Enhanced lazy loader with retry logic
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options?: {
    maxRetries?: number;
    retryDelay?: number;
  },
): LazyExoticComponent<T> {
  const { maxRetries = 3, retryDelay = 1000 } = options || {};

  let retryCount = 0;

  const enhancedImportFn = async (): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (err) {
      if (retryCount < maxRetries) {
        retryCount++;
        console.warn(`Retrying lazy import (${retryCount}/${maxRetries})...`);

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, retryDelay * retryCount));

        return enhancedImportFn();
      }
      throw err;
    }
  };

  return React.lazy(enhancedImportFn);
}

// Lazy component exports with optimized loading
export const LazyStories = createLazyComponent(routeComponents.Stories, {
  maxRetries: 3,
  retryDelay: 1000,
});

export const LazySubscription = createLazyComponent(routeComponents.Subscription, {
  maxRetries: 3,
  retryDelay: 1000,
});

export const LazyPhotoGallery = createLazyComponent(routeComponents.PhotoGallery, {
  maxRetries: 3,
  retryDelay: 1000,
});

// Preload critical components on app initialization
export function preloadCriticalComponents() {
  if (typeof window === "undefined") return;

  // Preload core navigation components after initial load
  componentPreloader.preloadOnIdle("photo-gallery", routeComponents.PhotoGallery);
  componentPreloader.preloadOnIdle("stories", routeComponents.Stories);

  // Preload heavy components on user interaction hints
  const preloadOnNavHover = () => {
    componentPreloader.preloadComponent("subscription", routeComponents.Subscription);
  };

  // Add hover listeners to navigation elements
  setTimeout(() => {
    const navElements = document.querySelectorAll('[href="/subscription"], [href="/stories"]');
    navElements.forEach((element) => {
      element.addEventListener("mouseenter", preloadOnNavHover, { once: true });
    });
  }, 1000);
}

// Bundle analysis helper (development only)
export function analyzeBundleSize() {
  if (process.env.NODE_ENV !== "development") return;

  const getResourceSizes = () => {
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const jsResources = resources.filter((r) => r.name.includes(".js"));
    const cssResources = resources.filter((r) => r.name.includes(".css"));

    const totalJSSize = jsResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);
    const totalCSSSize = cssResources.reduce((sum, r) => sum + (r.transferSize || 0), 0);

    console.log("📦 Bundle Analysis:", {
      jsFiles: jsResources.length,
      jsSize: `${(totalJSSize / 1024).toFixed(2)} KB`,
      cssFiles: cssResources.length,
      cssSize: `${(totalCSSSize / 1024).toFixed(2)} KB`,
      totalSize: `${((totalJSSize + totalCSSSize) / 1024).toFixed(2)} KB`,
    });
  };

  // Run after page load
  if (document.readyState === "complete") {
    getResourceSizes();
  } else {
    window.addEventListener("load", getResourceSizes);
  }
}
