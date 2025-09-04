"use client";

import { useEffect, useState } from "react";

interface DevicePerformanceProfile {
  tier: "high-end" | "mid-end" | "low-end";
  isLowEndDevice: boolean;
  isMidEndDevice: boolean;
  isHighEndDevice: boolean;
  connectionType: "fast" | "slow" | "unknown";
  maxImageQuality: number;
  shouldUseAnimations: boolean;
  shouldPreloadNext: boolean;
  shouldReduceQuality: boolean;
}

export function useDevicePerformance(): DevicePerformanceProfile {
  const [profile, setProfile] = useState<DevicePerformanceProfile>({
    tier: "high-end",
    isLowEndDevice: false,
    isMidEndDevice: false,
    isHighEndDevice: true,
    connectionType: "fast",
    maxImageQuality: 90,
    shouldUseAnimations: true,
    shouldPreloadNext: true,
    shouldReduceQuality: false,
  });

  useEffect(() => {
    // Basic device detection
    if (typeof window !== "undefined") {
      const isTouchDevice = "ontouchstart" in window;
      const isLowEnd = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;
      const memoryLow = (navigator as any).deviceMemory ? (navigator as any).deviceMemory <= 2 : false;

      let tier: "high-end" | "mid-end" | "low-end" = "high-end";
      if (isLowEnd || memoryLow) {
        tier = "low-end";
      } else if (isTouchDevice) {
        tier = "mid-end";
      }

      setProfile({
        tier,
        isLowEndDevice: tier === "low-end",
        isMidEndDevice: tier === "mid-end",
        isHighEndDevice: tier === "high-end",
        connectionType: "fast", // Default to fast
        maxImageQuality: tier === "low-end" ? 70 : tier === "mid-end" ? 80 : 90,
        shouldUseAnimations: tier !== "low-end",
        shouldPreloadNext: tier !== "low-end",
        shouldReduceQuality: tier === "low-end",
      });
    }
  }, []);

  return profile;
}
