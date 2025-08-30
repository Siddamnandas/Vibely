"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDevicePerformance } from "./use-device-performance";

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  usedPercent: number;
  available: number;
}

interface MemoryThresholds {
  warning: number;    // 70%
  critical: number;   // 85%
  emergency: number;  // 95%
}

interface MemoryManagementState {
  memoryInfo: MemoryInfo | null;
  thresholds: MemoryThresholds;
  alertLevel: "normal" | "warning" | "critical" | "emergency";
  isMonitoring: boolean;
  gcSuggestions: string[];
}

interface MemoryOptimizationActions {
  unloadComponents: () => Promise<void>;
  clearCaches: () => Promise<void>;
  reduceImageQuality: () => void;
  pauseNonEssential: () => void;
  forceGarbageCollection: () => void;
}

export function useMemoryManagement(): MemoryManagementState & MemoryOptimizationActions {
  const deviceProfile = useDevicePerformance();
  const [memoryState, setMemoryState] = useState<MemoryManagementState>({
    memoryInfo: null,
    thresholds: {
      warning: 0.7,
      critical: 0.85,
      emergency: 0.95,
    },
    alertLevel: "normal",
    isMonitoring: false,
    gcSuggestions: [],
  });

  const componentCacheRef = useRef<Map<string, any>>(new Map());
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<PerformanceObserver | null>(null);

  // Get memory information
  const getMemoryInfo = useCallback((): MemoryInfo | null => {
    if (typeof window === "undefined") return null;
    
    const memory = (performance as any).memory;
    if (!memory) return null;

    const usedJSHeapSize = memory.usedJSHeapSize;
    const totalJSHeapSize = memory.totalJSHeapSize;
    const jsHeapSizeLimit = memory.jsHeapSizeLimit;
    const usedPercent = usedJSHeapSize / jsHeapSizeLimit;
    const available = jsHeapSizeLimit - usedJSHeapSize;

    return {
      usedJSHeapSize,
      totalJSHeapSize,
      jsHeapSizeLimit,
      usedPercent,
      available,
    };
  }, []);

  // Determine alert level based on memory usage
  const determineAlertLevel = useCallback((usedPercent: number): MemoryManagementState["alertLevel"] => {
    const { warning, critical, emergency } = memoryState.thresholds;
    
    if (usedPercent >= emergency) return "emergency";
    if (usedPercent >= critical) return "critical";
    if (usedPercent >= warning) return "warning";
    return "normal";
  }, [memoryState.thresholds]);

  // Generate garbage collection suggestions
  const generateGCSuggestions = useCallback((memoryInfo: MemoryInfo, alertLevel: string): string[] => {
    const suggestions = [];
    
    if (alertLevel === "warning") {
      suggestions.push("Clear image cache for unused images");
      suggestions.push("Unload components outside viewport");
    }
    
    if (alertLevel === "critical") {
      suggestions.push("Reduce image quality to free memory");
      suggestions.push("Pause background animations");
      suggestions.push("Clear component cache");
    }
    
    if (alertLevel === "emergency") {
      suggestions.push("Emergency memory cleanup required");
      suggestions.push("Unload all non-essential components");
      suggestions.push("Clear all caches");
      suggestions.push("Pause all animations");
    }
    
    return suggestions;
  }, []);

  // Monitor memory usage
  const startMemoryMonitoring = useCallback(() => {
    if (intervalRef.current) return;

    const monitoringInterval = deviceProfile.isLowEndDevice ? 5000 : 3000;

    intervalRef.current = setInterval(() => {
      const memoryInfo = getMemoryInfo();
      if (!memoryInfo) return;

      const alertLevel = determineAlertLevel(memoryInfo.usedPercent);
      const gcSuggestions = generateGCSuggestions(memoryInfo, alertLevel);

      setMemoryState(prev => ({
        ...prev,
        memoryInfo,
        alertLevel,
        gcSuggestions,
        isMonitoring: true,
      }));

      // Auto-trigger cleanup based on alert level
      if (alertLevel === "critical") {
        console.warn("🚨 Critical memory usage detected. Initiating cleanup...");
        clearCaches();
        reduceImageQuality();
      }

      if (alertLevel === "emergency") {
        console.error("🔥 Emergency memory usage! Force cleanup...");
        unloadComponents();
        clearCaches();
        pauseNonEssential();
        forceGarbageCollection();
      }
    }, monitoringInterval);

    // Setup performance observer for memory measurements
    if (typeof PerformanceObserver !== "undefined") {
      try {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === "measure" && entry.name.includes("memory")) {
              console.log("📊 Memory measurement:", entry);
            }
          });
        });
        
        observerRef.current.observe({ entryTypes: ["measure"] });
      } catch (error) {
        console.warn("Performance observer not available:", error);
      }
    }
  }, [deviceProfile.isLowEndDevice, getMemoryInfo, determineAlertLevel, generateGCSuggestions]);

  // Stop memory monitoring
  const stopMemoryMonitoring = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    setMemoryState(prev => ({
      ...prev,
      isMonitoring: false,
    }));
  }, []);

  // Memory optimization actions
  const unloadComponents = useCallback(async (): Promise<void> => {
    console.log("🧹 Unloading cached components...");
    
    // Clear component cache
    componentCacheRef.current.clear();
    
    // Remove non-visible DOM elements
    const nonVisibleElements = document.querySelectorAll('[data-lazy-loaded="true"]:not([data-visible="true"])');
    nonVisibleElements.forEach(element => {
      element.remove();
    });

    // Force re-render of heavy components
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "unload-components" } 
    }));
    
    // Wait for cleanup to complete
    await new Promise(resolve => setTimeout(resolve, 100));
  }, []);

  const clearCaches = useCallback(async (): Promise<void> => {
    console.log("🗑️ Clearing caches...");
    
    // Clear image cache
    imageCacheRef.current.clear();
    
    // Clear browser caches if available
    if ('caches' in window) {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => 
            caches.delete(cacheName)
          )
        );
      } catch (error) {
        console.warn("Failed to clear browser caches:", error);
      }
    }

    // Clear localStorage non-essential items
    const keysToKeep = ['vibely.auth', 'vibely.settings', 'vibely.onboarding'];
    Object.keys(localStorage).forEach(key => {
      if (!keysToKeep.some(keepKey => key.startsWith(keepKey))) {
        localStorage.removeItem(key);
      }
    });

    // Clear sessionStorage
    sessionStorage.clear();
    
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "clear-caches" } 
    }));
  }, []);

  const reduceImageQuality = useCallback((): void => {
    console.log("📷 Reducing image quality...");
    
    // Update global image quality setting
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { 
        action: "reduce-image-quality",
        quality: deviceProfile.isLowEndDevice ? "low" : "medium"
      } 
    }));

    // Replace high-quality images with lower quality versions
    const images = document.querySelectorAll('img[data-high-quality]');
    Array.from(images).forEach((el) => {
      const img = el as HTMLImageElement;
      const lowQualitySrc = img.dataset.lowQuality || img.src.replace(/quality=high/, 'quality=low');
      if (lowQualitySrc !== img.src) {
        img.src = lowQualitySrc;
      }
    });
  }, [deviceProfile.isLowEndDevice]);

  const pauseNonEssential = useCallback((): void => {
    console.log("⏸️ Pausing non-essential features...");
    
    // Pause animations
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "pause-animations" } 
    }));

    // Pause background tasks
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "pause-background-tasks" } 
    }));

    // Reduce polling frequency
    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "reduce-polling" } 
    }));
  }, []);

  const forceGarbageCollection = useCallback((): void => {
    console.log("🗑️ Forcing garbage collection...");
    
    // Manual cleanup
    if (typeof window !== "undefined") {
      // Clear any remaining references
      (window as any).tempReferences = null;
      
      // Force garbage collection if available (development only)
      if (process.env.NODE_ENV === "development" && (window as any).gc) {
        (window as any).gc();
      }
    }

    // Clear all intervals and timeouts
    const intervalIds = [];
    const timeoutIds = [];
    
    // Clear high interval IDs (assuming they're cleanup targets)
    for (let i = 1; i < 1000; i++) {
      clearInterval(i);
      clearTimeout(i);
    }

    window.dispatchEvent(new CustomEvent("memory-cleanup", { 
      detail: { action: "force-gc" } 
    }));
  }, []);

  // Initialize monitoring on mount
  useEffect(() => {
    startMemoryMonitoring();
    
    return () => {
      stopMemoryMonitoring();
    };
  }, [startMemoryMonitoring, stopMemoryMonitoring]);

  // Listen for visibility changes to pause monitoring
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopMemoryMonitoring();
      } else {
        startMemoryMonitoring();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startMemoryMonitoring, stopMemoryMonitoring]);

  return {
    ...memoryState,
    unloadComponents,
    clearCaches,
    reduceImageQuality,
    pauseNonEssential,
    forceGarbageCollection,
  };
}

// Memory-aware component wrapper
export function withMemoryManagement<T extends object>(
  Component: React.ComponentType<T>,
  componentName: string
) {
  return function MemoryManagedComponent(props: T) {
    const { alertLevel } = useMemoryManagement();
    const [shouldRender, setShouldRender] = useState(true);

    useEffect(() => {
      const handleMemoryCleanup = (event: CustomEvent) => {
        const { action } = event.detail;
        
        if (action === "unload-components" && alertLevel === "emergency") {
          setShouldRender(false);
          setTimeout(() => setShouldRender(true), 5000); // Re-enable after 5 seconds
        }
      };

      window.addEventListener("memory-cleanup", handleMemoryCleanup as EventListener);
      
      return () => {
        window.removeEventListener("memory-cleanup", handleMemoryCleanup as EventListener);
      };
    }, [alertLevel]);

    if (!shouldRender) {
      return <div>Component temporarily disabled to save memory</div>;
    }

    return <Component {...props} />;
  };
}
