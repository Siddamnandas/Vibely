"use client";

import { useEffect, useRef } from "react";
import { track as trackEvent } from "@/lib/analytics";
import { useDevicePerformance } from "./use-device-performance";

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  imageLoadCount: number;
  animationCount: number;
  memoryUsage?: number;
  jsHeapSize?: number;
}

export function usePerformanceMonitor(componentName: string) {
  const deviceProfile = useDevicePerformance();
  const startTime = useRef<number>(Date.now());
  const metrics = useRef<Partial<PerformanceMetrics>>({
    imageLoadCount: 0,
    animationCount: 0,
  });

  // Track component mount time
  useEffect(() => {
    const loadTime = Date.now() - startTime.current;
    metrics.current.loadTime = loadTime;

    // Track initial render performance
    requestAnimationFrame(() => {
      const renderTime = Date.now() - startTime.current;
      metrics.current.renderTime = renderTime;
      
      // Report performance metrics for analytics
      reportPerformanceMetrics(componentName, {
        ...metrics.current,
        loadTime,
        renderTime,
      }, deviceProfile);
    });
  }, [componentName, deviceProfile]);

  // Track memory usage periodically (if available)
  useEffect(() => {
    if (!(performance as any).memory) return;

    const trackMemory = () => {
      const memory = (performance as any).memory;
      metrics.current.memoryUsage = memory.usedJSHeapSize / 1024 / 1024; // MB
      metrics.current.jsHeapSize = memory.totalJSHeapSize / 1024 / 1024; // MB
    };

    // Track memory usage every 10 seconds
    const interval = setInterval(trackMemory, 10000);
    trackMemory(); // Initial measurement

    return () => clearInterval(interval);
  }, []);

  // Functions to track specific performance events
  const trackImageLoad = (loadTime: number, src: string, wasAdaptive: boolean) => {
    metrics.current.imageLoadCount = (metrics.current.imageLoadCount || 0) + 1;
    
    trackEvent("adaptive_image_loaded", {
      component: componentName,
      load_time: loadTime,
      was_adaptive: wasAdaptive,
      device_tier: deviceProfile.tier,
      image_quality: deviceProfile.maxImageQuality,
    });
  };

  const trackAnimationStart = (animationType: string) => {
    if (!deviceProfile.shouldUseAnimations) return;
    
    metrics.current.animationCount = (metrics.current.animationCount || 0) + 1;
    
    trackEvent("adaptive_animation_started", {
      component: componentName,
      animation_type: animationType,
      device_tier: deviceProfile.tier,
      should_reduce_animations: !deviceProfile.shouldUseAnimations,
    });
  };

  const trackPerformanceBottleneck = (bottleneckType: string, duration: number) => {
    trackEvent("performance_bottleneck", {
      component: componentName,
      bottleneck_type: bottleneckType,
      duration,
      device_tier: deviceProfile.tier,
      is_low_end_device: deviceProfile.isLowEndDevice,
    });
  };

  return {
    trackImageLoad,
    trackAnimationStart,
    trackPerformanceBottleneck,
    metrics: metrics.current,
    deviceProfile,
  };
}

function reportPerformanceMetrics(
  componentName: string,
  metrics: Partial<PerformanceMetrics>,
  deviceProfile: any
) {
  // Only report if metrics are meaningful
  if (!metrics.loadTime || !metrics.renderTime) return;

  trackEvent("component_performance", {
    component: componentName,
    load_time: metrics.loadTime,
    render_time: metrics.renderTime,
    image_count: metrics.imageLoadCount || 0,
    animation_count: metrics.animationCount || 0,
    memory_usage_mb: metrics.memoryUsage,
    device_tier: deviceProfile.tier,
    is_low_end_device: deviceProfile.isLowEndDevice,
    connection_type: deviceProfile.connectionType,
    max_image_quality: deviceProfile.maxImageQuality,
    should_use_animations: deviceProfile.shouldUseAnimations,
  });

  // Track performance warnings for slow components
  if (metrics.loadTime > 1000) {
    trackEvent("performance_warning", {
      component: componentName,
      warning_type: "slow_load",
      duration: metrics.loadTime,
      device_tier: deviceProfile.tier,
    });
  }

  if (metrics.renderTime > 500) {
    trackEvent("performance_warning", {
      component: componentName,
      warning_type: "slow_render",
      duration: metrics.renderTime,
      device_tier: deviceProfile.tier,
    });
  }
}

// Hook for measuring specific operations
// Moved to /src/utils/performance-measure.ts to avoid JSX/generic type conflicts
export { usePerformanceMeasure } from "@/utils/performance-measure";

// Utility to detect performance issues in real-time
export function usePerformanceObserver() {
  useEffect(() => {
    if (!("PerformanceObserver" in window)) return;

    // Observe long tasks (tasks that block the main thread for >50ms)
    const longTaskObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          trackEvent("long_task_detected", {
            duration: entry.duration,
            start_time: entry.startTime,
            task_type: entry.entryType,
          });
        }
      }
    });

    // Observe largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        trackEvent("largest_contentful_paint", {
          lcp_time: entry.startTime,
          element: (entry as any).element?.tagName || "unknown",
        });
      }
    });

    try {
      longTaskObserver.observe({ entryTypes: ["longtask"] });
      lcpObserver.observe({ entryTypes: ["largest-contentful-paint"] });
    } catch (error) {
      // Some entry types may not be supported
      console.warn("Performance observer not fully supported:", error);
    }

    return () => {
      longTaskObserver.disconnect();
      lcpObserver.disconnect();
    };
  }, []);
}