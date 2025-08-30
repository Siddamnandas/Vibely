"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { usePerformanceMonitoring, PerformanceMetrics } from "@/hooks/use-performance-monitoring";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useBatteryAwarePerformance } from "@/hooks/use-battery-aware-performance";
import { useNetworkAware } from "@/hooks/use-network-aware-loading";
import { track as trackEvent } from "@/lib/analytics";

// Performance optimization levels
type OptimizationLevel = "aggressive" | "moderate" | "conservative" | "none";

// Optimization strategies
interface OptimizationStrategy {
  level: OptimizationLevel;
  description: string;
  actions: string[];
}

// Performance thresholds for optimization triggers
interface PerformanceThresholds {
  // Core Web Vitals
  fcpThreshold: number; // ms
  lcpThreshold: number; // ms
  fidThreshold: number; // ms
  clsThreshold: number; // unitless
  // Resource usage
  memoryPressureThreshold: number; // 0-1
  fpsThreshold: number; // frames per second
  // Network
  rttThreshold: number; // ms
  downlinkThreshold: number; // Mbps
}

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  fcpThreshold: 2000, // 2 seconds
  lcpThreshold: 2500, // 2.5 seconds
  fidThreshold: 100,  // 100ms
  clsThreshold: 0.1,  // 0.1 cumulative layout shift
  memoryPressureThreshold: 0.8, // 80% memory pressure
  fpsThreshold: 30,   // 30 frames per second
  rttThreshold: 200,  // 200ms round trip time
  downlinkThreshold: 1.0, // 1 Mbps
};

export function useAutomaticPerformanceOptimization(thresholds: Partial<PerformanceThresholds> = {}) {
  const mergedThresholds = useMemo(
    () => ({ ...DEFAULT_THRESHOLDS, ...thresholds }),
    [thresholds],
  );
  const [optimizationLevel, setOptimizationLevel] = useState<OptimizationLevel>("none");
  const [activeOptimizations, setActiveOptimizations] = useState<string[]>([]);
  const [performanceScore, setPerformanceScore] = useState<number>(100);
  
  const performanceMonitoring = usePerformanceMonitoring();
  const deviceProfile = useDevicePerformance();
  const batteryAware = useBatteryAwarePerformance();
  const networkAware = useNetworkAware();
  
  const lastOptimizationTimeRef = useRef<number>(0);
  const optimizationCooldown = 30000; // 30 seconds between optimizations

  // Determine current optimization level based on metrics
  const determineOptimizationLevel = useCallback((metrics: PerformanceMetrics): OptimizationLevel => {
    const now = Date.now();
    
    // Don't optimize too frequently
    if (now - lastOptimizationTimeRef.current < optimizationCooldown) {
      return optimizationLevel;
    }
    
    // Check Core Web Vitals
    const poorCoreVitals = 
      (metrics.coreWebVitals.fcp && metrics.coreWebVitals.fcp > mergedThresholds.fcpThreshold) ||
      (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > mergedThresholds.lcpThreshold) ||
      (metrics.coreWebVitals.fid && metrics.coreWebVitals.fid > mergedThresholds.fidThreshold) ||
      (metrics.coreWebVitals.cls && metrics.coreWebVitals.cls > mergedThresholds.clsThreshold);
    
    // Check resource usage
    const highResourceUsage = 
      (metrics.resourceUsage.memoryPressure && metrics.resourceUsage.memoryPressure > mergedThresholds.memoryPressureThreshold) ||
      (metrics.resourceUsage.fps && metrics.resourceUsage.fps < mergedThresholds.fpsThreshold);
    
    // Check network conditions
    const poorNetwork = 
      (metrics.network.rtt && metrics.network.rtt > mergedThresholds.rttThreshold) ||
      (metrics.network.downlink && metrics.network.downlink < mergedThresholds.downlinkThreshold);
    
    // Check device conditions
    const deviceStressed = 
      deviceProfile.isLowEndDevice || 
      (deviceProfile.batteryLevel !== undefined && deviceProfile.batteryLevel < 20 && !deviceProfile.batteryCharging) ||
      batteryAware.performanceProfile.mode === "critical" ||
      batteryAware.performanceProfile.mode === "powersave";
    
    // Determine optimization level
    if (poorCoreVitals || highResourceUsage || poorNetwork || deviceStressed) {
      // Aggressive optimization needed
      return "aggressive";
    } else if (
      (metrics.coreWebVitals.fcp && metrics.coreWebVitals.fcp > mergedThresholds.fcpThreshold * 0.7) ||
      (metrics.coreWebVitals.lcp && metrics.coreWebVitals.lcp > mergedThresholds.lcpThreshold * 0.7) ||
      deviceStressed
    ) {
      // Moderate optimization
      return "moderate";
    } else if (
      (metrics.resourceUsage.memoryPressure && metrics.resourceUsage.memoryPressure > mergedThresholds.memoryPressureThreshold * 0.7) ||
      (metrics.resourceUsage.fps && metrics.resourceUsage.fps < mergedThresholds.fpsThreshold * 1.2)
    ) {
      // Conservative optimization
      return "conservative";
    }
    
    // No optimization needed
    return "none";
  }, [
    optimizationLevel,
    mergedThresholds,
    deviceProfile.isLowEndDevice,
    deviceProfile.batteryLevel,
    deviceProfile.batteryCharging,
    batteryAware.performanceProfile.mode,
  ]);

  // Get optimization strategy for current level
  const getOptimizationStrategy = useCallback((level: OptimizationLevel): OptimizationStrategy => {
    switch (level) {
      case "aggressive":
        return {
          level: "aggressive",
          description: "Aggressive performance optimization for severely degraded performance",
          actions: [
            "reduce_image_quality",
            "disable_animations",
            "reduce_concurrent_requests",
            "increase_cache_size",
            "preload_critical_resources",
            "defer_non_essential_scripts",
            "reduce_component_updates",
            "enable_battery_save_mode"
          ]
        };
      
      case "moderate":
        return {
          level: "moderate",
          description: "Moderate performance optimization for degraded performance",
          actions: [
            "reduce_image_quality_medium",
            "reduce_animation_intensity",
            "limit_concurrent_requests",
            "preload_essential_resources",
            "defer_non_critical_scripts",
            "reduce_component_update_frequency"
          ]
        };
      
      case "conservative":
        return {
          level: "conservative",
          description: "Conservative performance optimization for slightly degraded performance",
          actions: [
            "reduce_image_quality_light",
            "reduce_animation_duration",
            "preload_important_resources",
            "defer_analytics_scripts"
          ]
        };
      
      case "none":
      default:
        return {
          level: "none",
          description: "No performance optimization needed",
          actions: []
        };
    }
  }, []);

  // Apply optimizations based on strategy
  const applyOptimizations = useCallback((strategy: OptimizationStrategy) => {
    const now = Date.now();
    
    // Don't apply optimizations too frequently
    if (now - lastOptimizationTimeRef.current < optimizationCooldown) {
      return;
    }
    
    lastOptimizationTimeRef.current = now;
    setActiveOptimizations(strategy.actions);
    setOptimizationLevel(strategy.level);
    
    // Apply each optimization action
    strategy.actions.forEach(action => {
      switch (action) {
        case "reduce_image_quality":
          // Reduce image quality to low
          document.documentElement.style.setProperty('--image-quality', 'low');
          break;
          
        case "reduce_image_quality_medium":
          // Reduce image quality to medium
          document.documentElement.style.setProperty('--image-quality', 'medium');
          break;
          
        case "reduce_image_quality_light":
          // Reduce image quality slightly
          document.documentElement.style.setProperty('--image-quality', 'light');
          break;
          
        case "disable_animations":
          // Disable all animations
          document.documentElement.style.setProperty('--animation-scale', '0');
          break;
          
        case "reduce_animation_intensity":
          // Reduce animation intensity
          document.documentElement.style.setProperty('--animation-scale', '0.5');
          break;
          
        case "reduce_animation_duration":
          // Reduce animation duration
          document.documentElement.style.setProperty('--animation-duration', '0.2s');
          break;
          
        case "reduce_concurrent_requests":
          // Reduce concurrent network requests
          networkAware.updateConfig(prev => ({
            ...prev,
            maxConcurrentRequests: Math.max(1, Math.floor(prev.maxConcurrentRequests * 0.5))
          }));
          break;
          
        case "limit_concurrent_requests":
          // Limit concurrent network requests moderately
          networkAware.updateConfig(prev => ({
            ...prev,
            maxConcurrentRequests: Math.max(2, Math.floor(prev.maxConcurrentRequests * 0.7))
          }));
          break;
          
        case "increase_cache_size":
          // Increase cache size for better offline performance
          if (typeof window !== "undefined" && 'caches' in window) {
            // This would typically be handled by the service worker
          }
          break;
          
        case "preload_critical_resources":
          // Preload critical resources
          // This would typically be handled by the resource loading system
          break;
          
        case "preload_essential_resources":
          // Preload essential resources
          break;
          
        case "preload_important_resources":
          // Preload important resources
          break;
          
        case "defer_non_essential_scripts":
          // Defer non-essential scripts
          // This would typically be handled by the build system
          break;
          
        case "defer_non_critical_scripts":
          // Defer non-critical scripts
          break;
          
        case "defer_analytics_scripts":
          // Defer analytics scripts
          break;
          
        case "reduce_component_updates":
          // Reduce component update frequency
          // This would typically be handled by the component system
          break;
          
        case "reduce_component_update_frequency":
          // Reduce component update frequency moderately
          break;
          
        case "enable_battery_save_mode":
          // Enable battery save mode
          batteryAware.enableBatterySaveMode();
          break;
          
        default:
          console.warn("Unknown optimization action:", action);
      }
    });
    
    // Track optimization applied
    trackEvent("automatic_performance_optimization_applied", {
      level: strategy.level,
      actions: strategy.actions,
      performance_score: performanceScore,
      device_tier: deviceProfile.tier,
      battery_level: deviceProfile.batteryLevel,
      network_quality: networkAware.networkState.connectionQuality,
    });
  }, [
    performanceScore,
    deviceProfile.tier,
    deviceProfile.batteryLevel,
    networkAware,
    batteryAware
  ]);

  // Reset optimizations to default
  const resetOptimizations = useCallback(() => {
    // Reset CSS variables
    document.documentElement.style.removeProperty('--image-quality');
    document.documentElement.style.removeProperty('--animation-scale');
    document.documentElement.style.removeProperty('--animation-duration');
    
    // Reset network config
    networkAware.updateConfig(prev => ({
      ...prev,
      maxConcurrentRequests: 4 // Default value
    }));
    
    // Disable battery save mode
    // Note: We don't automatically disable battery save mode as user may have enabled it manually
    
    setActiveOptimizations([]);
    setOptimizationLevel("none");
    
    trackEvent("automatic_performance_optimization_reset", {
      previous_level: optimizationLevel,
      performance_score: performanceScore,
    });
  }, [networkAware, optimizationLevel, performanceScore]);

  // Monitor performance and apply optimizations
  useEffect(() => {
    if (!performanceMonitoring.isCollecting) return;
    
    const metrics = performanceMonitoring.metrics;
    const score = performanceMonitoring.getPerformanceScore();
    setPerformanceScore(score);
    
    const level = determineOptimizationLevel(metrics);
    const strategy = getOptimizationStrategy(level);
    
    // Only apply optimizations if level has changed or it's been a while
    if (level !== optimizationLevel || Date.now() - lastOptimizationTimeRef.current > optimizationCooldown) {
      if (level !== "none") {
        applyOptimizations(strategy);
      } else {
        // Reset optimizations if no longer needed
        resetOptimizations();
      }
    }
  }, [
    performanceMonitoring.isCollecting,
    performanceMonitoring.metrics,
    performanceMonitoring.getPerformanceScore,
    determineOptimizationLevel,
    getOptimizationStrategy,
    applyOptimizations,
    resetOptimizations,
    optimizationLevel,
    performanceMonitoring,
  ]);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback((): string[] => {
    const recommendations: string[] = [];
    
    // Add general recommendations based on current state
    if (optimizationLevel !== "none") {
      recommendations.push(`Current optimization level: ${optimizationLevel}`);
    }
    
    // Add device-specific recommendations
    if (deviceProfile.isLowEndDevice) {
      recommendations.push("Device is low-end, consider reducing visual effects");
    }
    
    if (deviceProfile.batteryLevel !== undefined && deviceProfile.batteryLevel < 20) {
      recommendations.push("Battery is low, consider enabling battery save mode");
    }
    
    // Add network-specific recommendations
    if (networkAware.networkState.connectionQuality === "poor") {
      recommendations.push("Network connection is poor, consider reducing data usage");
    }
    
    return recommendations;
  }, [
    optimizationLevel,
    deviceProfile.isLowEndDevice,
    deviceProfile.batteryLevel,
    networkAware.networkState.connectionQuality
  ]);

  return {
    optimizationLevel,
    activeOptimizations,
    performanceScore,
    applyOptimizations,
    resetOptimizations,
    getOptimizationStrategy,
    getOptimizationRecommendations,
    isOptimizing: optimizationLevel !== "none",
  };
}
