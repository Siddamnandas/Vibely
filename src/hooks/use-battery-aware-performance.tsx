"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevicePerformance } from "./use-device-performance";

interface BatteryState {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
}

interface BatteryPerformanceProfile {
  mode: "performance" | "balanced" | "powersave" | "critical";
  shouldReduceAnimations: boolean;
  shouldReducePolling: boolean;
  shouldReduceBackgroundTasks: boolean;
  shouldReduceImageQuality: boolean;
  shouldPauseNonEssential: boolean;
  pollingInterval: number;
  maxConcurrentRequests: number;
  animationDuration: number;
}

export function useBatteryAwarePerformance() {
  const deviceProfile = useDevicePerformance();
  const [batteryState, setBatteryState] = useState<BatteryState | null>(null);
  const [performanceProfile, setPerformanceProfile] = useState<BatteryPerformanceProfile>({
    mode: "performance",
    shouldReduceAnimations: false,
    shouldReducePolling: false,
    shouldReduceBackgroundTasks: false,
    shouldReduceImageQuality: false,
    shouldPauseNonEssential: false,
    pollingInterval: 1000,
    maxConcurrentRequests: 6,
    animationDuration: 300,
  });

  // Monitor battery state
  useEffect(() => {
    let battery: any = null;
    let mounted = true;

    const getBatteryInfo = async () => {
      try {
        if ('getBattery' in navigator) {
          battery = await (navigator as any).getBattery();
          
          const updateBatteryState = () => {
            if (!mounted) return;
            
            setBatteryState({
              level: battery.level * 100,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime,
            });
          };

          // Initial update
          updateBatteryState();

          // Listen for battery events
          battery.addEventListener('levelchange', updateBatteryState);
          battery.addEventListener('chargingchange', updateBatteryState);
          battery.addEventListener('chargingtimechange', updateBatteryState);
          battery.addEventListener('dischargingtimechange', updateBatteryState);
        }
      } catch (error) {
        console.warn('Battery API not available:', error);
      }
    };

    getBatteryInfo();

    return () => {
      mounted = false;
      if (battery) {
        battery.removeEventListener('levelchange', () => {});
        battery.removeEventListener('chargingchange', () => {});
        battery.removeEventListener('chargingtimechange', () => {});
        battery.removeEventListener('dischargingtimechange', () => {});
      }
    };
  }, []);

  // Calculate performance profile based on battery state
  useEffect(() => {
    if (!batteryState) return;

    const { level, charging } = batteryState;
    
    let mode: BatteryPerformanceProfile['mode'];
    let profile: Partial<BatteryPerformanceProfile> = {};

    // Determine battery mode
    if (level <= 5) {
      mode = "critical";
    } else if (level <= 15 && !charging) {
      mode = "powersave";
    } else if (level <= 30 && !charging) {
      mode = "balanced";
    } else {
      mode = "performance";
    }

    // Configure performance settings based on mode
    switch (mode) {
      case "critical":
        profile = {
          shouldReduceAnimations: true,
          shouldReducePolling: true,
          shouldReduceBackgroundTasks: true,
          shouldReduceImageQuality: true,
          shouldPauseNonEssential: true,
          pollingInterval: 10000, // 10 seconds
          maxConcurrentRequests: 1,
          animationDuration: 0, // Disable animations
        };
        break;

      case "powersave":
        profile = {
          shouldReduceAnimations: true,
          shouldReducePolling: true,
          shouldReduceBackgroundTasks: true,
          shouldReduceImageQuality: true,
          shouldPauseNonEssential: false,
          pollingInterval: 5000, // 5 seconds
          maxConcurrentRequests: 2,
          animationDuration: 150, // Reduced animations
        };
        break;

      case "balanced":
        profile = {
          shouldReduceAnimations: false,
          shouldReducePolling: true,
          shouldReduceBackgroundTasks: false,
          shouldReduceImageQuality: false,
          shouldPauseNonEssential: false,
          pollingInterval: 2000, // 2 seconds
          maxConcurrentRequests: 4,
          animationDuration: 200, // Slightly reduced
        };
        break;

      case "performance":
      default:
        profile = {
          shouldReduceAnimations: false,
          shouldReducePolling: false,
          shouldReduceBackgroundTasks: false,
          shouldReduceImageQuality: false,
          shouldPauseNonEssential: false,
          pollingInterval: 1000, // 1 second
          maxConcurrentRequests: 6,
          animationDuration: 300, // Full animations
        };
        break;
    }

    // Factor in device performance
    if (deviceProfile.isLowEndDevice) {
      profile.maxConcurrentRequests = Math.min(profile.maxConcurrentRequests || 6, 3);
      profile.pollingInterval = Math.max(profile.pollingInterval || 1000, 2000);
    }

    setPerformanceProfile({
      mode,
      ...profile,
    } as BatteryPerformanceProfile);
  }, [batteryState, deviceProfile.isLowEndDevice]);

  // Battery-aware polling hook
  const useBatteryAwarePolling = (
    callback: () => void | Promise<void>,
    dependencies: any[] = []
  ) => {
    // Extract the values we need from performanceProfile
    const pollingInterval = performanceProfile.pollingInterval;
    const shouldPauseNonEssential = performanceProfile.shouldPauseNonEssential;

    useEffect(() => {
      if (shouldPauseNonEssential) {
        return; // Skip polling in critical battery mode
      }

      const interval = setInterval(callback, pollingInterval);
      return () => clearInterval(interval);
    }, [callback, pollingInterval, shouldPauseNonEssential, ...dependencies]);
  };

  // Expose simple helpers to toggle battery save mode
  const enableBatterySaveMode = useCallback(() => {
    setPerformanceProfile((prev) => ({
      ...prev,
      mode: "powersave",
      shouldReduceAnimations: true,
      shouldReducePolling: true,
      shouldReduceBackgroundTasks: true,
      shouldReduceImageQuality: true,
      shouldPauseNonEssential: true,
      pollingInterval: Math.max(prev.pollingInterval, 5000),
      maxConcurrentRequests: Math.min(prev.maxConcurrentRequests, 2),
      animationDuration: 0,
    }));
  }, []);

  const disableBatterySaveMode = useCallback(() => {
    setPerformanceProfile((prev) => ({
      ...prev,
      mode: "performance",
      shouldReduceAnimations: false,
      shouldReducePolling: false,
      shouldReduceBackgroundTasks: false,
      shouldReduceImageQuality: false,
      shouldPauseNonEssential: false,
      pollingInterval: 1000,
      maxConcurrentRequests: 6,
      animationDuration: 300,
    }));
  }, []);

  // Battery-aware animation configuration
  const getAnimationConfig = useCallback((baseConfig: {
    duration?: number;
    enabled?: boolean;
  } = {}) => {
    return {
      duration: performanceProfile.shouldReduceAnimations 
        ? performanceProfile.animationDuration 
        : (baseConfig.duration || 300),
      enabled: performanceProfile.shouldReduceAnimations 
        ? performanceProfile.animationDuration > 0 
        : (baseConfig.enabled !== false),
    };
  }, [performanceProfile.shouldReduceAnimations, performanceProfile.animationDuration]);

  // Battery-aware image quality
  const getImageQuality = useCallback(() => {
    if (performanceProfile.shouldReduceImageQuality) {
      return deviceProfile.isLowEndDevice ? "low" : "medium";
    }
    return deviceProfile.maxImageQuality;
  }, [performanceProfile.shouldReduceImageQuality, deviceProfile.isLowEndDevice, deviceProfile.maxImageQuality]);

  // Battery-aware request throttling
  const throttleRequests = useCallback(async <T extends any>(
    requests: (() => Promise<T>)[],
    options: { 
      maxConcurrent?: number;
      batchDelay?: number;
    } = {}
  ): Promise<T[]> => {
    const { 
      maxConcurrent = performanceProfile.maxConcurrentRequests,
      batchDelay = 100 
    } = options;
    
    const results: T[] = [];
    
    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchResults = await Promise.allSettled(batch.map(req => req()));
      
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        }
      });
      
      // Add delay between batches in power save mode
      if (i + maxConcurrent < requests.length && performanceProfile.shouldReducePolling) {
        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }
    }
    
    return results;
  }, [performanceProfile.maxConcurrentRequests, performanceProfile.shouldReducePolling]);

  return {
    batteryState,
    performanceProfile,
    useBatteryAwarePolling,
    getAnimationConfig,
    getImageQuality,
    throttleRequests,
    enableBatterySaveMode,
    disableBatterySaveMode,
  };
}
