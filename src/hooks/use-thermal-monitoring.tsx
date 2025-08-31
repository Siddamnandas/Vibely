"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDevicePerformance } from "./use-device-performance";
import { track as trackEvent } from "@/lib/analytics";

export interface ThermalState {
  level: "nominal" | "fair" | "serious" | "critical";
  cpuUsage: number;
  memoryPressure: number;
  recommendedActions: string[];
  shouldThrottleAudio: boolean;
  shouldReduceQuality: boolean;
  shouldPauseNonEssential: boolean;
  maxAudioBitrate: "high" | "medium" | "low";
  maxConcurrentProcesses: number;
}

interface ThermalMetrics {
  cpuIntensiveOperations: number;
  memoryAllocations: number;
  frameDrops: number;
  lastThermalCheck: number;
  temperatureHistory: number[];
}

export function useThermalMonitoring() {
  const deviceProfile = useDevicePerformance();
  const [thermalState, setThermalState] = useState<ThermalState>({
    level: "nominal",
    cpuUsage: 0,
    memoryPressure: 0,
    recommendedActions: [],
    shouldThrottleAudio: false,
    shouldReduceQuality: false,
    shouldPauseNonEssential: false,
    maxAudioBitrate: "high",
    maxConcurrentProcesses: 6,
  });

  const metricsRef = useRef<ThermalMetrics>({
    cpuIntensiveOperations: 0,
    memoryAllocations: 0,
    frameDrops: 0,
    lastThermalCheck: Date.now(),
    temperatureHistory: [],
  });

  const frameTimeRef = useRef<number[]>([]);
  const observerRef = useRef<PerformanceObserver | null>(null);

  // Monitor performance metrics that indicate thermal stress
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Monitor frame timing for thermal throttling detection
    const monitorFrameTiming = () => {
      let frameCount = 0;
      let lastTime = performance.now();
      
      const checkFrame = (currentTime: number) => {
        frameCount++;
        
        if (currentTime - lastTime >= 1000) { // Every second
          const fps = frameCount;
          frameTimeRef.current.push(fps);
          
          // Keep only last 10 seconds of data
          if (frameTimeRef.current.length > 10) {
            frameTimeRef.current.shift();
          }
          
          frameCount = 0;
          lastTime = currentTime;
          
          // Calculate frame drop percentage
          const averageFps = frameTimeRef.current.reduce((a, b) => a + b, 0) / frameTimeRef.current.length;
          const frameDropPercentage = Math.max(0, (60 - averageFps) / 60);
          
          metricsRef.current.frameDrops = frameDropPercentage;
        }
        
        requestAnimationFrame(checkFrame);
      };
      
      requestAnimationFrame(checkFrame);
    };

    // Monitor performance entries for thermal indicators
    if ('PerformanceObserver' in window) {
      try {
        observerRef.current = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          
          entries.forEach((entry) => {
            // Monitor long tasks that might indicate thermal throttling
            if (entry.entryType === 'longtask') {
              metricsRef.current.cpuIntensiveOperations++;
            }
            
            // Monitor memory allocations
            if (entry.entryType === 'measure' && entry.name.includes('memory')) {
              metricsRef.current.memoryAllocations++;
            }
          });
        });
        
        observerRef.current.observe({ entryTypes: ['longtask', 'measure'] });
      } catch (error) {
        console.warn('PerformanceObserver not fully supported:', error);
      }
    }

    monitorFrameTiming();

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Calculate thermal state based on multiple indicators
  const calculateThermalState = useCallback((): ThermalState => {
    const now = Date.now();
    const timeSinceLastCheck = now - metricsRef.current.lastThermalCheck;
    
    // Get memory usage if available
    let memoryPressure = 0;
    if ((performance as any).memory) {
      const memory = (performance as any).memory;
      memoryPressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    // Calculate CPU usage indicators
    const frameDropRate = metricsRef.current.frameDrops;
    const cpuOperationsRate = metricsRef.current.cpuIntensiveOperations / (timeSinceLastCheck / 1000);
    
    // Estimate CPU usage based on frame performance and device capabilities
    let cpuUsage = 0;
    if (frameDropRate > 0.3) { // >30% frame drops
      cpuUsage = Math.min(100, 60 + (frameDropRate * 40));
    } else if (frameDropRate > 0.1) { // >10% frame drops
      cpuUsage = Math.min(100, 30 + (frameDropRate * 30));
    } else {
      cpuUsage = frameDropRate * 30;
    }

    // Factor in device tier for thermal sensitivity
    if (deviceProfile.tier === "low" || deviceProfile.isLowEndDevice) {
      cpuUsage *= 1.5; // Low-end devices heat up faster
      memoryPressure *= 1.3;
    }

    // Factor in battery level (low battery often correlates with thermal issues)
    if (deviceProfile.batteryLevel && deviceProfile.batteryLevel < 20) {
      cpuUsage *= 1.2;
    }

    // Determine thermal level
    let level: ThermalState["level"] = "nominal";
    let recommendedActions: string[] = [];
    let shouldThrottleAudio = false;
    let shouldReduceQuality = false;
    let shouldPauseNonEssential = false;
    let maxAudioBitrate: "high" | "medium" | "low" = "high";
    let maxConcurrentProcesses = 6;

    if (cpuUsage > 80 || memoryPressure > 0.9 || frameDropRate > 0.5) {
      level = "critical";
      recommendedActions = [
        "Reduce audio quality to minimum",
        "Pause all non-essential processing",
        "Disable visual effects",
        "Reduce animation frequency"
      ];
      shouldThrottleAudio = true;
      shouldReduceQuality = true;
      shouldPauseNonEssential = true;
      maxAudioBitrate = "low";
      maxConcurrentProcesses = 1;
    } else if (cpuUsage > 60 || memoryPressure > 0.7 || frameDropRate > 0.3) {
      level = "serious";
      recommendedActions = [
        "Reduce audio bitrate",
        "Throttle background tasks",
        "Reduce visual effects quality"
      ];
      shouldThrottleAudio = true;
      shouldReduceQuality = true;
      maxAudioBitrate = "low";
      maxConcurrentProcesses = 2;
    } else if (cpuUsage > 40 || memoryPressure > 0.5 || frameDropRate > 0.2) {
      level = "fair";
      recommendedActions = [
        "Monitor performance closely",
        "Consider reducing quality if needed"
      ];
      shouldReduceQuality = true;
      maxAudioBitrate = "medium";
      maxConcurrentProcesses = 4;
    }

    metricsRef.current.lastThermalCheck = now;

    return {
      level,
      cpuUsage,
      memoryPressure,
      recommendedActions,
      shouldThrottleAudio,
      shouldReduceQuality,
      shouldPauseNonEssential,
      maxAudioBitrate,
      maxConcurrentProcesses,
    };
  }, [deviceProfile.tier, deviceProfile.isLowEndDevice, deviceProfile.batteryLevel]);

  // Update thermal state periodically
  useEffect(() => {
    const updateThermalState = () => {
      const newState = calculateThermalState();
      
      // Only update if there's a significant change
      if (newState.level !== thermalState.level || 
          Math.abs(newState.cpuUsage - thermalState.cpuUsage) > 10) {
        
        setThermalState(newState);
        
        // Track thermal state changes
        trackEvent("thermal_state_change", {
          previous_level: thermalState.level,
          new_level: newState.level,
          cpu_usage: Math.round(newState.cpuUsage),
          memory_pressure: Math.round(newState.memoryPressure * 100),
          frame_drop_rate: Math.round(metricsRef.current.frameDrops * 100),
          device_tier: deviceProfile.tier,
          battery_level: deviceProfile.batteryLevel,
        });
      }
    };

    // Check thermal state every 5 seconds
    const interval = setInterval(updateThermalState, 5000);
    
    // Initial check
    updateThermalState();

    return () => clearInterval(interval);
  }, [calculateThermalState, thermalState.level, thermalState.cpuUsage, deviceProfile.tier, deviceProfile.batteryLevel]);

  // Manual thermal check for immediate optimization
  const performThermalCheck = useCallback(() => {
    const newState = calculateThermalState();
    setThermalState(newState);
    return newState;
  }, [calculateThermalState]);

  // Reset thermal metrics (useful after optimizations applied)
  const resetThermalMetrics = useCallback(() => {
    metricsRef.current = {
      cpuIntensiveOperations: 0,
      memoryAllocations: 0,
      frameDrops: 0,
      lastThermalCheck: Date.now(),
      temperatureHistory: [],
    };
    frameTimeRef.current = [];
  }, []);

  // Get thermal-aware audio settings
  const getThermalAwareAudioSettings = useCallback(() => {
    return {
      bitrate: thermalState.maxAudioBitrate,
      shouldThrottle: thermalState.shouldThrottleAudio,
      maxConcurrentStreams: Math.min(thermalState.maxConcurrentProcesses, 3),
      bufferSize: thermalState.level === "critical" ? "small" : 
                  thermalState.level === "serious" ? "medium" : "large",
      enableEffects: thermalState.level === "nominal",
      preloadEnabled: thermalState.level === "nominal" || thermalState.level === "fair",
    };
  }, [thermalState]);

  return {
    thermalState,
    performThermalCheck,
    resetThermalMetrics,
    getThermalAwareAudioSettings,
    isOverheating: thermalState.level === "serious" || thermalState.level === "critical",
    canPerformIntensiveTask: thermalState.level === "nominal" || thermalState.level === "fair",
  };
}