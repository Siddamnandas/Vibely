"use client";

import { useState, useEffect } from "react";

export interface DevicePerformanceProfile {
  tier: "high" | "medium" | "low";
  memoryGB: number;
  cores: number;
  connectionType: "fast" | "slow" | "offline";
  batteryLevel?: number;
  batteryCharging?: boolean;
  thermalState?: "nominal" | "fair" | "serious" | "critical";
  isLowEndDevice: boolean;
  supportsWebGL: boolean;
  maxImageQuality: "high" | "medium" | "low";
  maxConcurrentImages: number;
  shouldPreloadImages: boolean;
  shouldUseAnimations: boolean;
  shouldUseLazyLoading: boolean;
  networkLatency?: number;
  devicePixelRatio: number;
  screenSize: "small" | "medium" | "large";
  isReducedMotion: boolean;
}

interface NavigatorWithMemory extends Omit<Navigator, "hardwareConcurrency"> {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
    chargingTime: number;
    dischargingTime: number;
  }>;
  connection?: {
    effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  };
}

interface ConnectionInfo {
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function useDevicePerformance(): DevicePerformanceProfile {
  const [profile, setProfile] = useState<DevicePerformanceProfile>({
    tier: "medium",
    memoryGB: 4,
    cores: 4,
    connectionType: "fast",
    isLowEndDevice: false,
    supportsWebGL: true,
    maxImageQuality: "high",
    maxConcurrentImages: 10,
    shouldPreloadImages: true,
    shouldUseAnimations: true,
    shouldUseLazyLoading: false,
    devicePixelRatio: 1,
    screenSize: "medium",
    isReducedMotion: false,
  });

  useEffect(() => {
    const detectDevicePerformance = async () => {
      const nav = navigator as NavigatorWithMemory;
      const connection = nav.connection;

      // Memory detection
      const memoryGB = nav.deviceMemory || estimateMemoryFromUserAgent();

      // CPU cores detection
      const cores = nav.hardwareConcurrency || 4;

      // Connection speed detection
      const connectionType = getConnectionType(connection);
      const networkLatency = connection?.rtt || 0;

      // WebGL support detection
      const supportsWebGL = detectWebGLSupport();

      // Battery level detection (if available)
      let batteryLevel: number | undefined;
      let batteryCharging: boolean | undefined;
      let thermalState: "nominal" | "fair" | "serious" | "critical" = "nominal";
      
      try {
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          batteryLevel = battery.level * 100;
          batteryCharging = battery.charging;
        }
      } catch (error) {
        // Battery API not supported or blocked
      }

      // Thermal state detection (experimental)
      try {
        if ('connection' in navigator && 'effectiveType' in (navigator as any).connection) {
          const effective = (navigator as any).connection.effectiveType;
          if (effective === 'slow-2g' && cores < 4) {
            thermalState = 'serious';
          }
        }
      } catch (error) {
        // Thermal detection not available
      }

      // Screen and display detection
      const devicePixelRatio = window.devicePixelRatio || 1;
      const screenWidth = window.screen.width;
      const screenSize: "small" | "medium" | "large" = 
        screenWidth < 768 ? "small" : 
        screenWidth < 1200 ? "medium" : "large";

      // Reduced motion preference
      const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      // Performance tier calculation
      const tier = calculatePerformanceTier(memoryGB, cores, connectionType, batteryLevel);

      // Low-end device detection
      const isLowEndDevice = memoryGB < 3 || cores < 4 || connectionType === "slow" || 
                             (batteryLevel !== undefined && batteryLevel < 20 && !batteryCharging);

      // Adaptive settings based on performance
      const adaptiveSettings = calculateAdaptiveSettings(
        tier,
        isLowEndDevice,
        connectionType,
        supportsWebGL,
        batteryLevel,
        isReducedMotion
      );

      setProfile({
        tier,
        memoryGB,
        cores,
        connectionType,
        batteryLevel,
        batteryCharging,
        thermalState,
        isLowEndDevice,
        supportsWebGL,
        networkLatency,
        devicePixelRatio,
        screenSize,
        isReducedMotion,
        ...adaptiveSettings,
      });
    };

    detectDevicePerformance();

    // Re-run detection when battery or connection changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        detectDevicePerformance();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Monitor connection changes
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', detectDevicePerformance);
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', detectDevicePerformance);
      }
    };
  }, []);

  return profile;
}

function estimateMemoryFromUserAgent(): number {
  const userAgent = navigator.userAgent.toLowerCase();

  // Basic heuristics based on user agent
  if (userAgent.includes("iphone")) {
    if (userAgent.includes("iphone 6") || userAgent.includes("iphone 7")) return 2;
    if (userAgent.includes("iphone 8") || userAgent.includes("iphone x")) return 3;
    return 4; // Newer iPhones typically have 4GB+
  }

  if (userAgent.includes("android")) {
    if (userAgent.includes("chrome/") && parseInt(userAgent.split("chrome/")[1]) < 70) return 2;
    return 3; // Assume mid-range Android
  }

  return 4; // Desktop or unknown, assume sufficient memory
}

function getConnectionType(connection?: ConnectionInfo): "fast" | "slow" | "offline" {
  if (!navigator.onLine) return "offline";

  if (connection) {
    const { effectiveType, downlink, saveData } = connection;

    if (saveData) return "slow";

    if (effectiveType === "slow-2g" || effectiveType === "2g") return "slow";
    if (effectiveType === "3g" && (downlink || 0) < 1.5) return "slow";

    return "fast";
  }

  // Fallback: assume fast connection
  return "fast";
}

function detectWebGLSupport(): boolean {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch (error) {
    return false;
  }
}

function calculatePerformanceTier(
  memoryGB: number,
  cores: number,
  connectionType: "fast" | "slow" | "offline",
  batteryLevel?: number
): "high" | "medium" | "low" {
  // Factor in battery level for performance tier
  const batteryPenalty = (batteryLevel !== undefined && batteryLevel < 15) ? 1 : 0;
  
  if (memoryGB >= 6 && cores >= 6 && connectionType === "fast" && batteryPenalty === 0) return "high";
  if (memoryGB >= 3 && cores >= 4 && connectionType !== "slow" && batteryPenalty === 0) return "medium";
  return "low";
}

function calculateAdaptiveSettings(
  tier: "high" | "medium" | "low",
  isLowEndDevice: boolean,
  connectionType: "fast" | "slow" | "offline",
  supportsWebGL: boolean,
  batteryLevel?: number,
  isReducedMotion?: boolean
) {
  const settings = {
    maxImageQuality: "high" as "high" | "medium" | "low",
    maxConcurrentImages: 10,
    shouldPreloadImages: true,
    shouldUseAnimations: true,
    shouldUseLazyLoading: false,
  };

  // Battery-aware adjustments
  const lowBattery = batteryLevel !== undefined && batteryLevel < 20;
  const criticalBattery = batteryLevel !== undefined && batteryLevel < 10;

  // Respect user's motion preferences
  if (isReducedMotion) {
    settings.shouldUseAnimations = false;
  }

  // Adjust based on performance tier
  if (tier === "low" || isLowEndDevice || criticalBattery) {
    settings.maxImageQuality = "low";
    settings.maxConcurrentImages = 3;
    settings.shouldPreloadImages = false;
    settings.shouldUseAnimations = false;
    settings.shouldUseLazyLoading = true;
  } else if (tier === "medium" || lowBattery) {
    settings.maxImageQuality = "medium";
    settings.maxConcurrentImages = 6;
    settings.shouldPreloadImages = connectionType === "fast" && !lowBattery;
    settings.shouldUseLazyLoading = connectionType === "slow";
    if (lowBattery) settings.shouldUseAnimations = false;
  }

  // Adjust based on connection
  if (connectionType === "slow") {
    settings.maxImageQuality = settings.maxImageQuality === "high" ? "medium" : "low";
    settings.shouldPreloadImages = false;
    settings.shouldUseLazyLoading = true;
    settings.maxConcurrentImages = Math.min(settings.maxConcurrentImages, 3);
  }

  // Adjust animations based on WebGL support
  if (!supportsWebGL && tier === "low") {
    settings.shouldUseAnimations = false;
  }

  return settings;
}
