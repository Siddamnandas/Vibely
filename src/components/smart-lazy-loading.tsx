"use client";

import React, { ComponentType, LazyExoticComponent, useEffect, useState } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";

// Smart lazy loading with device awareness
export function createSmartLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    priority?: "high" | "medium" | "low";
    preloadOnIdle?: boolean;
    preloadOnHover?: boolean;
    fallback?: React.ComponentType;
  } = {}
): LazyExoticComponent<T> {
  const { priority = "medium", preloadOnIdle = true, preloadOnHover = false } = options;
  
  let retryCount = 0;
  const maxRetries = 3;
  
  const enhancedImportFn = async (): Promise<{ default: T }> => {
    try {
      return await importFn();
    } catch (err) {
      if (retryCount < maxRetries) {
        retryCount++;
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
        return enhancedImportFn();
      }
      throw err;
    }
  };

  return React.lazy(enhancedImportFn);
}

// Smart preloader that adapts to device capabilities
class SmartPreloader {
  private cache = new Map<string, Promise<any>>();
  private loadedComponents = new Set<string>();
  private deviceProfile: any = null;

  setDeviceProfile(profile: any) {
    this.deviceProfile = profile;
  }

  async preload(key: string, importFn: () => Promise<any>, priority: "high" | "medium" | "low" = "medium") {
    if (this.loadedComponents.has(key)) return;
    if (this.cache.has(key)) return this.cache.get(key);

    // Skip preloading on low-end devices for low priority components
    if (this.deviceProfile?.isLowEndDevice && priority === "low") {
      return;
    }

    // Skip preloading on slow connections for medium/low priority
    if (this.deviceProfile?.connectionType === "slow" && priority !== "high") {
      return;
    }

    const promise = importFn()
      .then((module) => {
        this.loadedComponents.add(key);
        this.cache.delete(key);
        return module;
      })
      .catch((error) => {
        this.cache.delete(key);
        throw error;
      });

    this.cache.set(key, promise);
    return promise;
  }

  preloadOnIdle(key: string, importFn: () => Promise<any>, priority: "high" | "medium" | "low" = "medium") {
    if (typeof window === "undefined") return;

    const preload = () => this.preload(key, importFn, priority);
    
    // Use different strategies based on device performance
    if (this.deviceProfile?.tier === "high" && "requestIdleCallback" in window) {
      (window as any).requestIdleCallback(preload, { timeout: 3000 });
    } else {
      const delay = this.deviceProfile?.isLowEndDevice ? 2000 : 500;
      setTimeout(preload, delay);
    }
  }

  preloadOnUserIntent(key: string, importFn: () => Promise<any>) {
    // Only preload on user intent for low-end devices
    if (!this.deviceProfile?.isLowEndDevice) {
      this.preload(key, importFn, "high");
    }
  }
}

export const smartPreloader = new SmartPreloader();

// Hook for device-aware lazy loading
export function useSmartLazyLoading() {
  const deviceProfile = useDevicePerformance();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    smartPreloader.setDeviceProfile(deviceProfile);
    setIsReady(true);
  }, [deviceProfile]);

  return {
    isReady,
    shouldPreload: !deviceProfile.isLowEndDevice && deviceProfile.connectionType !== "slow",
    preloadDelay: deviceProfile.isLowEndDevice ? 2000 : 500,
    chunkSize: deviceProfile.isLowEndDevice ? 3 : 8
  };
}

// Route-based components with smart loading
export const smartRoutes = {
  // Critical components (preload immediately)
  critical: {
    Generator: () => import("@/app/(app)/generator/page"),
    Library: () => import("@/app/(app)/library/page"),
  },
  
  // Important components (preload on idle)
  important: {
    Profile: () => import("@/app/(app)/profile/page"),
    Stories: () => import("@/app/(app)/stories/page"),
  },
  
  // Secondary components (load on demand)
  secondary: {
    Subscription: () => import("@/app/(app)/subscription/page"),
    PhotoGallery: () => import("@/components/photo-gallery"),
  }
};

// Auto-preload components based on device capabilities
export function initializeSmartPreloading() {
  if (typeof window === "undefined") return;

  // Always preload critical components
  Object.entries(smartRoutes.critical).forEach(([key, importFn]) => {
    smartPreloader.preload(key, importFn, "high");
  });

  // Preload important components on idle
  Object.entries(smartRoutes.important).forEach(([key, importFn]) => {
    smartPreloader.preloadOnIdle(key, importFn, "medium");
  });

  // Setup user intent preloading for secondary components
  setTimeout(() => {
    const navLinks = document.querySelectorAll('a[href*="subscription"], a[href*="gallery"]');
    navLinks.forEach((link) => {
      link.addEventListener('mouseenter', () => {
        const href = link.getAttribute('href');
        if (href?.includes('subscription')) {
          smartPreloader.preloadOnUserIntent('subscription', smartRoutes.secondary.Subscription);
        } else if (href?.includes('gallery')) {
          smartPreloader.preloadOnUserIntent('gallery', smartRoutes.secondary.PhotoGallery);
        }
      }, { once: true });
    });
  }, 1000);
}

// Component exports with smart loading
export const SmartLazyStories = createSmartLazyComponent(
  smartRoutes.important.Stories,
  { priority: "medium", preloadOnIdle: true }
);

export const SmartLazySubscription = createSmartLazyComponent(
  smartRoutes.secondary.Subscription,
  { priority: "low", preloadOnHover: true }
);

export const SmartLazyPhotoGallery = createSmartLazyComponent(
  smartRoutes.secondary.PhotoGallery,
  { priority: "low", preloadOnHover: true }
);