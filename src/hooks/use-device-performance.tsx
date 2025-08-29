"use client";

import { useState, useEffect } from "react";

export interface DevicePerformanceProfile {
  tier: "high" | "medium" | "low";
  memoryGB: number;
  cores: number;
  connectionType: "fast" | "slow" | "offline";
  batteryLevel?: number;
  isLowEndDevice: boolean;
  supportsWebGL: boolean;
  maxImageQuality: "high" | "medium" | "low";
  maxConcurrentImages: number;
  shouldPreloadImages: boolean;
  shouldUseAnimations: boolean;
  shouldUseLazyLoading: boolean;
}

interface NavigatorWithMemory extends Omit<Navigator, "hardwareConcurrency"> {
  deviceMemory?: number;
  hardwareConcurrency?: number;
  getBattery?: () => Promise<{
    level: number;
    charging: boolean;
  }>;
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
  });

  useEffect(() => {
    const detectDevicePerformance = async () => {
      const nav = navigator as NavigatorWithMemory;
      const connection = (nav as any).connection as ConnectionInfo | undefined;

      // Memory detection
      const memoryGB = nav.deviceMemory || estimateMemoryFromUserAgent();

      // CPU cores detection
      const cores = nav.hardwareConcurrency || 4;

      // Connection speed detection
      const connectionType = getConnectionType(connection);

      // WebGL support detection
      const supportsWebGL = detectWebGLSupport();

      // Battery level detection (if available)
      let batteryLevel: number | undefined;
      try {
        if (nav.getBattery) {
          const battery = await nav.getBattery();
          batteryLevel = battery.level * 100;
        }
      } catch (error) {
        // Battery API not supported or blocked
      }

      // Performance tier calculation
      const tier = calculatePerformanceTier(memoryGB, cores, connectionType);

      // Low-end device detection
      const isLowEndDevice = memoryGB < 3 || cores < 4 || connectionType === "slow";

      // Adaptive settings based on performance
      const adaptiveSettings = calculateAdaptiveSettings(
        tier,
        isLowEndDevice,
        connectionType,
        supportsWebGL,
      );

      setProfile({
        tier,
        memoryGB,
        cores,
        connectionType,
        batteryLevel,
        isLowEndDevice,
        supportsWebGL,
        ...adaptiveSettings,
      });
    };

    detectDevicePerformance();
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
): "high" | "medium" | "low" {
  if (memoryGB >= 6 && cores >= 6 && connectionType === "fast") return "high";
  if (memoryGB >= 3 && cores >= 4 && connectionType !== "slow") return "medium";
  return "low";
}

function calculateAdaptiveSettings(
  tier: "high" | "medium" | "low",
  isLowEndDevice: boolean,
  connectionType: "fast" | "slow" | "offline",
  supportsWebGL: boolean,
) {
  const settings = {
    maxImageQuality: "high" as "high" | "medium" | "low",
    maxConcurrentImages: 10,
    shouldPreloadImages: true,
    shouldUseAnimations: true,
    shouldUseLazyLoading: false,
  };

  // Adjust based on performance tier
  if (tier === "low" || isLowEndDevice) {
    settings.maxImageQuality = "low";
    settings.maxConcurrentImages = 3;
    settings.shouldPreloadImages = false;
    settings.shouldUseAnimations = false;
    settings.shouldUseLazyLoading = true;
  } else if (tier === "medium") {
    settings.maxImageQuality = "medium";
    settings.maxConcurrentImages = 6;
    settings.shouldPreloadImages = connectionType === "fast";
    settings.shouldUseLazyLoading = connectionType === "slow";
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
