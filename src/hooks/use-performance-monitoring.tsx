"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { track as trackEvent } from "@/lib/analytics";

// Core Web Vitals metrics
export interface CoreWebVitalsMetrics {
  // First Contentful Paint - time from navigation to first content render
  fcp?: number;
  // Largest Contentful Paint - time to render largest content element
  lcp?: number;
  // First Input Delay - delay between user input and browser response
  fid?: number;
  // Cumulative Layout Shift - visual stability metric
  cls?: number;
  // Time to Interactive - when page becomes fully interactive
  tti?: number;
  // Total Blocking Time - sum of blocking time periods
  tbt?: number;
}

// Resource loading metrics
export interface ResourceMetrics {
  // JavaScript bundle loading
  jsLoadTime?: number;
  jsBundleSize?: number;
  // CSS loading
  cssLoadTime?: number;
  cssBundleSize?: number;
  // Image loading
  imageLoadTime?: number;
  imagesLoaded?: number;
  imagesFailed?: number;
  // Network requests
  totalRequests?: number;
  failedRequests?: number;
  avgResponseTime?: number;
}

// Memory and CPU metrics
export interface ResourceUsageMetrics {
  // Memory usage
  memoryUsed?: number;
  memoryTotal?: number;
  memoryPressure?: number;
  // CPU usage
  cpuUsage?: number;
  // Frame rate
  fps?: number;
  droppedFrames?: number;
}

// Component performance metrics
export interface ComponentMetrics {
  // Component render times
  avgRenderTime?: number;
  maxRenderTime?: number;
  slowRenders?: number;
  // Component counts
  totalComponents?: number;
  memoizedComponents?: number;
  // Re-render triggers
  stateUpdates?: number;
  propChanges?: number;
}

// Network performance metrics
export interface NetworkMetrics {
  // Connection quality
  connectionType?: "4g" | "3g" | "2g" | "slow-2g" | "unknown";
  downlink?: number; // Mbps
  rtt?: number; // ms
  // Data usage
  dataTransferred?: number; // bytes
  cacheHits?: number;
  cacheMisses?: number;
}

// Combined performance metrics
export interface PerformanceMetrics {
  coreWebVitals: CoreWebVitalsMetrics;
  resources: ResourceMetrics;
  resourceUsage: ResourceUsageMetrics;
  components: ComponentMetrics;
  network: NetworkMetrics;
  device: {
    tier: "high" | "medium" | "low";
    memoryGB?: number;
    cores?: number;
    batteryLevel?: number;
  };
  timestamp: number;
  sessionId: string;
}

// Performance monitoring configuration
interface PerformanceConfig {
  collectCoreVitals: boolean;
  collectResourceMetrics: boolean;
  collectResourceUsage: boolean;
  collectComponentMetrics: boolean;
  collectNetworkMetrics: boolean;
  samplingRate: number; // 0-1, percentage of sessions to monitor
  reportInterval: number; // ms between reports
}

const DEFAULT_CONFIG: PerformanceConfig = {
  collectCoreVitals: true,
  collectResourceMetrics: true,
  collectResourceUsage: true,
  collectComponentMetrics: true,
  collectNetworkMetrics: true,
  samplingRate: 0.1, // 10% of sessions
  reportInterval: 30000, // 30 seconds
};

export function usePerformanceMonitoring(config: Partial<PerformanceConfig> = {}) {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    coreWebVitals: {},
    resources: {},
    resourceUsage: {},
    components: {},
    network: {},
    device: {
      tier: "medium",
    },
    timestamp: Date.now(),
    sessionId: Math.random().toString(36).substring(2, 15),
  });

  const deviceProfile = useDevicePerformance();
  const observerRef = useRef<PerformanceObserver | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const entryBufferRef = useRef<PerformanceEntry[]>([]);
  const componentRenderTimesRef = useRef<{ [key: string]: number[] }>({});
  const stateUpdatesRef = useRef(0);
  const propChangesRef = useRef(0);

  // Check if we should collect metrics based on sampling rate
  const shouldCollectMetrics = Math.random() < mergedConfig.samplingRate;

  // Collect Core Web Vitals
  const collectCoreWebVitals = useCallback(() => {
    if (typeof window === "undefined" || !window.performance) return;

    const perfEntries = window.performance.getEntriesByType("navigation");
    if (perfEntries.length === 0) return;

    const navEntry = perfEntries[0] as PerformanceNavigationTiming;
    
    const coreVitals: CoreWebVitalsMetrics = {
      fcp: undefined,
      lcp: undefined,
      fid: undefined,
      cls: undefined,
      tti: undefined,
      tbt: undefined,
    };

    // Get FCP from paint entries
    const paintEntries = window.performance.getEntriesByType("paint");
    const fcpEntry = paintEntries.find(entry => entry.name === "first-contentful-paint");
    if (fcpEntry) {
      coreVitals.fcp = fcpEntry.startTime;
    }

    // Get LCP from largest contentful paint entries (if browser supports it)
    if ('PerformanceObserver' in window && 'largest-contentful-paint' in PerformanceObserver.supportedEntryTypes) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          if (lastEntry) {
            coreVitals.lcp = lastEntry.startTime;
            setMetrics(prev => ({
              ...prev,
              coreWebVitals: { ...prev.coreWebVitals, ...coreVitals }
            }));
          }
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      } catch (error) {
        console.warn("LCP observation failed:", error);
      }
    }

    // Calculate TTI approximation
    if (navEntry.domContentLoadedEventEnd) {
      coreVitals.tti = navEntry.domContentLoadedEventEnd;
    }

    // Calculate TBT from long tasks
    let blockingTime = 0;
    const longTasks = window.performance.getEntriesByType("longtask");
    longTasks.forEach((task: any) => {
      const blockingDuration = task.duration - 50;
      if (blockingDuration > 0) {
        blockingTime += blockingDuration;
      }
    });
    coreVitals.tbt = blockingTime;

    // Get CLS from layout shift entries (if browser supports it)
    if ('PerformanceObserver' in window && 'layout-shift' in PerformanceObserver.supportedEntryTypes) {
      try {
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });
          coreVitals.cls = clsValue;
          setMetrics(prev => ({
            ...prev,
            coreWebVitals: { ...prev.coreWebVitals, ...coreVitals }
          }));
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn("CLS observation failed:", error);
      }
    }

    setMetrics(prev => ({
      ...prev,
      coreWebVitals: { ...prev.coreWebVitals, ...coreVitals }
    }));
  }, []);

  // Collect resource metrics
  const collectResourceMetrics = useCallback(() => {
    if (typeof window === "undefined" || !window.performance) return;

    const resources: ResourceMetrics = {};
    
    // Get all resource entries
    const resourceEntries = window.performance.getEntriesByType("resource");
    
    // Filter JavaScript resources
    const jsResources = resourceEntries.filter(entry => 
      entry.name.endsWith(".js") || entry.name.includes(".js?")
    );
    
    if (jsResources.length > 0) {
      const totalJsLoadTime = jsResources.reduce((sum, entry) => sum + entry.duration, 0);
      const totalJsSize = jsResources.reduce((sum, entry) => sum + (entry as any).encodedBodySize || 0, 0);
      
      resources.jsLoadTime = totalJsLoadTime;
      resources.jsBundleSize = totalJsSize;
    }

    // Filter CSS resources
    const cssResources = resourceEntries.filter(entry => 
      entry.name.endsWith(".css") || entry.name.includes(".css?")
    );
    
    if (cssResources.length > 0) {
      const totalCssLoadTime = cssResources.reduce((sum, entry) => sum + entry.duration, 0);
      const totalCssSize = cssResources.reduce((sum, entry) => sum + (entry as any).encodedBodySize || 0, 0);
      
      resources.cssLoadTime = totalCssLoadTime;
      resources.cssBundleSize = totalCssSize;
    }

    // Filter image resources
    const imageResources = resourceEntries.filter(entry => 
      entry.name.match(/\.(jpg|jpeg|png|gif|webp|svg)/i)
    );
    
    if (imageResources.length > 0) {
      const totalImageLoadTime = imageResources.reduce((sum, entry) => sum + entry.duration, 0);
      const successfulImages = imageResources.filter(entry => (entry as any).responseEnd > 0);
      const failedImages = imageResources.filter(entry => (entry as any).responseEnd === 0);
      
      resources.imageLoadTime = totalImageLoadTime;
      resources.imagesLoaded = successfulImages.length;
      resources.imagesFailed = failedImages.length;
    }

    // Count total requests and calculate averages
    resources.totalRequests = resourceEntries.length;
    const completedResources = resourceEntries.filter(entry => (entry as any).responseEnd > 0);
    if (completedResources.length > 0) {
      const totalResponseTime = completedResources.reduce((sum, entry) => sum + entry.duration, 0);
      resources.avgResponseTime = totalResponseTime / completedResources.length;
    }

    const failedResources = resourceEntries.filter(entry => (entry as any).responseEnd === 0);
    resources.failedRequests = failedResources.length;

    setMetrics(prev => ({
      ...prev,
      resources: { ...prev.resources, ...resources }
    }));
  }, []);

  // Collect resource usage metrics
  const collectResourceUsage = useCallback(() => {
    const resourceUsage: ResourceUsageMetrics = {};

    // Memory usage (if available)
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      resourceUsage.memoryUsed = memory.usedJSHeapSize / 1024 / 1024; // MB
      resourceUsage.memoryTotal = memory.totalJSHeapSize / 1024 / 1024; // MB
      resourceUsage.memoryPressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    // Frame rate monitoring
    if (typeof window !== "undefined") {
      let frameCount = 0;
      let lastTime = performance.now();
      const frameTimes: number[] = [];
      
      const measureFps = (currentTime: number) => {
        frameCount++;
        
        if (currentTime - lastTime >= 1000) { // Every second
          const fps = frameCount;
          frameTimes.push(fps);
          
          // Keep only last 10 seconds of data
          if (frameTimes.length > 10) {
            frameTimes.shift();
          }
          
          const avgFps = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
          const droppedFrames = Math.max(0, 60 - avgFps);
          
          resourceUsage.fps = avgFps;
          resourceUsage.droppedFrames = droppedFrames;
          
          frameCount = 0;
          lastTime = currentTime;
        }
        
        // Continue measuring if we're still collecting metrics
        if (shouldCollectMetrics) {
          requestAnimationFrame(measureFps);
        }
      };
      
      requestAnimationFrame(measureFps);
    }

    setMetrics(prev => ({
      ...prev,
      resourceUsage: { ...prev.resourceUsage, ...resourceUsage }
    }));
  }, [shouldCollectMetrics]);

  // Collect network metrics
  const collectNetworkMetrics = useCallback(() => {
    if (typeof navigator === "undefined") return;

    const network: NetworkMetrics = {};

    // Connection information
    const connection = (navigator as any).connection;
    if (connection) {
      network.connectionType = connection.effectiveType || "unknown";
      network.downlink = connection.downlink || 0;
      network.rtt = connection.rtt || 0;
    }

    setMetrics(prev => ({
      ...prev,
      network: { ...prev.network, ...network }
    }));
  }, []);

  // Collect component metrics
  const collectComponentMetrics = useCallback(() => {
    const components: ComponentMetrics = {};

    // Calculate average and max render times
    const allRenderTimes: number[] = [];
    Object.values(componentRenderTimesRef.current).forEach(times => {
      allRenderTimes.push(...times);
    });

    if (allRenderTimes.length > 0) {
      const sum = allRenderTimes.reduce((a, b) => a + b, 0);
      components.avgRenderTime = sum / allRenderTimes.length;
      components.maxRenderTime = Math.max(...allRenderTimes);
      components.slowRenders = allRenderTimes.filter(time => time > 16).length; // > 16ms is slow
    }

    // Count components
    components.totalComponents = Object.keys(componentRenderTimesRef.current).length;
    
    // Count state updates and prop changes
    components.stateUpdates = stateUpdatesRef.current;
    components.propChanges = propChangesRef.current;

    setMetrics(prev => ({
      ...prev,
      components: { ...prev.components, ...components }
    }));
  }, []);

  // Record component render time
  const recordComponentRender = useCallback((componentName: string, renderTime: number) => {
    if (!componentRenderTimesRef.current[componentName]) {
      componentRenderTimesRef.current[componentName] = [];
    }
    
    componentRenderTimesRef.current[componentName].push(renderTime);
    
    // Keep only last 100 render times per component
    if (componentRenderTimesRef.current[componentName].length > 100) {
      componentRenderTimesRef.current[componentName].shift();
    }
  }, []);

  // Record state update
  const recordStateUpdate = useCallback(() => {
    stateUpdatesRef.current++;
  }, []);

  // Record prop change
  const recordPropChange = useCallback(() => {
    propChangesRef.current++;
  }, []);

  // Initialize performance observers
  useEffect(() => {
    if (!shouldCollectMetrics || typeof window === "undefined") return;

    // Set up Performance Observer for various metrics
    if ('PerformanceObserver' in window) {
      try {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entryBufferRef.current.push(...entries);
        });
        
        observerRef.current.observe({ 
          entryTypes: ['navigation', 'paint', 'resource', 'longtask', 'largest-contentful-paint', 'layout-shift'] 
        });
      } catch (error) {
        console.warn("Performance Observer setup failed:", error);
      }
    }

    // Collect initial metrics
    collectCoreWebVitals();
    collectResourceMetrics();
    collectResourceUsage();
    collectNetworkMetrics();
    collectComponentMetrics();

    // Set up periodic collection
    intervalRef.current = setInterval(() => {
      collectResourceMetrics();
      collectResourceUsage();
      collectNetworkMetrics();
      collectComponentMetrics();
      
      // Report metrics
      trackEvent("performance_metrics_report", {
        metrics: metrics,
        device_tier: deviceProfile.tier,
        battery_level: deviceProfile.batteryLevel,
      });
    }, mergedConfig.reportInterval);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [
    shouldCollectMetrics,
    collectCoreWebVitals,
    collectResourceMetrics,
    collectResourceUsage,
    collectNetworkMetrics,
    collectComponentMetrics,
    metrics,
    deviceProfile.tier,
    deviceProfile.batteryLevel,
    mergedConfig.reportInterval
  ]);

  // Update device metrics when profile changes
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      device: {
        tier: deviceProfile.tier,
        memoryGB: deviceProfile.memoryGB,
        cores: deviceProfile.cores,
        batteryLevel: deviceProfile.batteryLevel,
      }
    }));
  }, [deviceProfile]);

  // Get current performance score (0-100)
  const getPerformanceScore = useCallback((): number => {
    // This is a simplified scoring algorithm
    // In a real implementation, you'd use more sophisticated weighting
    let score = 100;
    
    // Deduct points for poor Core Web Vitals
    if (metrics.coreWebVitals.fcp && metrics.coreWebVitals.fcp > 2000) {
      score -= 10;
    }
    if (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > 2500) {
      score -= 15;
    }
    if (metrics.coreWebVitals.fid && metrics.coreWebVitals.fid > 100) {
      score -= 10;
    }
    if (metrics.coreWebVitals.cls && metrics.coreWebVitals.cls > 0.1) {
      score -= 10;
    }
    
    // Deduct points for poor resource usage
    if (metrics.resourceUsage.memoryPressure && metrics.resourceUsage.memoryPressure > 0.8) {
      score -= 10;
    }
    if (metrics.resourceUsage.fps && metrics.resourceUsage.fps < 30) {
      score -= 15;
    }
    
    // Deduct points for network issues
    if (metrics.network.connectionType === "slow-2g" || metrics.network.connectionType === "2g") {
      score -= 20;
    }
    if (metrics.network.rtt && metrics.network.rtt > 500) {
      score -= 10;
    }
    
    return Math.max(0, Math.min(100, score));
  }, [metrics]);

  // Get performance recommendations
  const getRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    // Core Web Vitals recommendations
    if (metrics.coreWebVitals.fcp && metrics.coreWebVitals.fcp > 2000) {
      recommendations.push("Optimize First Contentful Paint by reducing initial bundle size");
    }
    if (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > 2500) {
      recommendations.push("Improve Largest Contentful Paint by optimizing largest content elements");
    }
    if (metrics.coreWebVitals.fid && metrics.coreWebVitals.fid > 100) {
      recommendations.push("Reduce First Input Delay by breaking up long tasks");
    }
    if (metrics.coreWebVitals.cls && metrics.coreWebVitals.cls > 0.1) {
      recommendations.push("Improve Cumulative Layout Shift by reserving space for dynamic content");
    }
    
    // Resource usage recommendations
    if (metrics.resourceUsage.memoryPressure && metrics.resourceUsage.memoryPressure > 0.8) {
      recommendations.push("Reduce memory usage by implementing component unmounting");
    }
    if (metrics.resourceUsage.fps && metrics.resourceUsage.fps < 30) {
      recommendations.push("Improve frame rate by optimizing animations and reducing work per frame");
    }
    
    // Network recommendations
    if (metrics.network.connectionType === "slow-2g" || metrics.network.connectionType === "2g") {
      recommendations.push("Implement more aggressive caching and reduce bundle sizes for slow networks");
    }
    
    // Component recommendations
    if (metrics.components.slowRenders && metrics.components.slowRenders > 10) {
      recommendations.push("Optimize slow component renders with memoization and virtualization");
    }
    
    return recommendations;
  }, [metrics]);

  return {
    metrics,
    recordComponentRender,
    recordStateUpdate,
    recordPropChange,
    getPerformanceScore,
    getRecommendations,
    isCollecting: shouldCollectMetrics,
  };
}