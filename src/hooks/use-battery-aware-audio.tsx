"use client";

import { useState, useEffect, useCallback } from "react";
import { useDevicePerformance } from "./use-device-performance";
import { track as trackEvent } from "@/lib/analytics";

interface BatteryManager {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener: (event: string, handler: () => void) => void;
  removeEventListener: (event: string, handler: () => void) => void;
}

interface NavigatorWithBattery extends Navigator {
  getBattery?: () => Promise<BatteryManager>;
}

export interface BatteryAwareAudioSettings {
  audioBitrate: "high" | "medium" | "low";
  bufferSize: "large" | "medium" | "small";
  preloadNext: boolean;
  backgroundAudioProcessing: boolean;
  audioEffects: boolean;
  visualEffects: boolean;
  autoSaveMode: boolean;
  volumeLimit: number;
  shouldReduceQuality: boolean;
}

export interface BatteryStatus {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  isLowBattery: boolean;
  isCriticalBattery: boolean;
  isSupported: boolean;
}

export function useBatteryAwareAudio() {
  const deviceProfile = useDevicePerformance();
  const [batteryStatus, setBatteryStatus] = useState<BatteryStatus>({
    level: 1,
    charging: false,
    chargingTime: Infinity,
    dischargingTime: Infinity,
    isLowBattery: false,
    isCriticalBattery: false,
    isSupported: false,
  });

  const [audioSettings, setAudioSettings] = useState<BatteryAwareAudioSettings>({
    audioBitrate: "high",
    bufferSize: "large",
    preloadNext: true,
    backgroundAudioProcessing: true,
    audioEffects: true,
    visualEffects: true,
    autoSaveMode: false,
    volumeLimit: 1.0,
    shouldReduceQuality: false,
  });

  // Battery status monitoring
  useEffect(() => {
    let battery: BatteryManager | null = null;

    const updateBatteryStatus = (batteryManager: BatteryManager) => {
      const level = batteryManager.level;
      const isLowBattery = level <= 0.2; // 20% or below
      const isCriticalBattery = level <= 0.1; // 10% or below

      const newStatus: BatteryStatus = {
        level,
        charging: batteryManager.charging,
        chargingTime: batteryManager.chargingTime,
        dischargingTime: batteryManager.dischargingTime,
        isLowBattery,
        isCriticalBattery,
        isSupported: true,
      };

      setBatteryStatus(newStatus);

      // Track battery changes for analytics
      trackEvent("battery_status_change", {
        battery_level: Math.round(level * 100),
        charging: batteryManager.charging,
        is_low_battery: isLowBattery,
        is_critical_battery: isCriticalBattery,
      });
    };

    const initBatteryAPI = async () => {
      try {
        const nav = navigator as NavigatorWithBattery;
        if (nav.getBattery) {
          battery = await nav.getBattery();
          updateBatteryStatus(battery);

          // Set up event listeners
          const handleBatteryChange = () => updateBatteryStatus(battery!);
          battery.addEventListener("chargingchange", handleBatteryChange);
          battery.addEventListener("levelchange", handleBatteryChange);
          battery.addEventListener("chargingtimechange", handleBatteryChange);
          battery.addEventListener("dischargingtimechange", handleBatteryChange);
        }
      } catch (error) {
        console.warn("Battery API not supported:", error);
      }
    };

    initBatteryAPI();

    return () => {
      if (battery) {
        battery.removeEventListener("chargingchange", () => {});
        battery.removeEventListener("levelchange", () => {});
        battery.removeEventListener("chargingtimechange", () => {});
        battery.removeEventListener("dischargingtimechange", () => {});
      }
    };
  }, []);

  // Calculate adaptive audio settings based on battery and device performance
  useEffect(() => {
    const newSettings = calculateAdaptiveAudioSettings(batteryStatus, deviceProfile, audioSettings);

    if (settingsChanged(audioSettings, newSettings)) {
      setAudioSettings(newSettings);

      // Track audio quality adjustments
      trackEvent("audio_quality_adjusted", {
        reason: batteryStatus.isCriticalBattery
          ? "critical_battery"
          : batteryStatus.isLowBattery
            ? "low_battery"
            : deviceProfile.isLowEndDevice
              ? "low_end_device"
              : "optimization",
        old_bitrate: audioSettings.audioBitrate,
        new_bitrate: newSettings.audioBitrate,
        battery_level: Math.round(batteryStatus.level * 100),
        device_tier: deviceProfile.tier,
        charging: batteryStatus.charging,
      });
    }
  }, [batteryStatus, deviceProfile, audioSettings]);

  // Force battery save mode
  const enableBatterySaveMode = useCallback(() => {
    const batterySaveSettings: BatteryAwareAudioSettings = {
      audioBitrate: "low",
      bufferSize: "small",
      preloadNext: false,
      backgroundAudioProcessing: false,
      audioEffects: false,
      visualEffects: false,
      autoSaveMode: true,
      volumeLimit: 0.7,
      shouldReduceQuality: true,
    };

    setAudioSettings(batterySaveSettings);

    trackEvent("battery_save_mode_enabled", {
      battery_level: Math.round(batteryStatus.level * 100),
      manual_activation: true,
    });
  }, [batteryStatus.level]);

  // Disable battery save mode
  const disableBatterySaveMode = useCallback(() => {
    const normalSettings = calculateAdaptiveAudioSettings(
      { ...batteryStatus, isLowBattery: false, isCriticalBattery: false },
      deviceProfile,
      audioSettings,
    );

    setAudioSettings({ ...normalSettings, autoSaveMode: false });

    trackEvent("battery_save_mode_disabled", {
      battery_level: Math.round(batteryStatus.level * 100),
      manual_deactivation: true,
    });
  }, [batteryStatus, deviceProfile, audioSettings]);

  // Get recommended audio format based on current settings
  const getRecommendedAudioFormat = useCallback(() => {
    if (audioSettings.audioBitrate === "low") {
      return { format: "mp3", bitrate: 128 };
    } else if (audioSettings.audioBitrate === "medium") {
      return { format: "mp3", bitrate: 256 };
    } else {
      return { format: "mp3", bitrate: 320 };
    }
  }, [audioSettings.audioBitrate]);

  return {
    batteryStatus,
    audioSettings,
    enableBatterySaveMode,
    disableBatterySaveMode,
    getRecommendedAudioFormat,
  };
}

function calculateAdaptiveAudioSettings(
  batteryStatus: BatteryStatus,
  deviceProfile: any,
  currentSettings: BatteryAwareAudioSettings,
): BatteryAwareAudioSettings {
  // Start with high-quality defaults
  let settings: BatteryAwareAudioSettings = {
    audioBitrate: "high",
    bufferSize: "large",
    preloadNext: true,
    backgroundAudioProcessing: true,
    audioEffects: true,
    visualEffects: true,
    autoSaveMode: false,
    volumeLimit: 1.0,
    shouldReduceQuality: false,
  };

  // Apply device-based optimizations
  if (deviceProfile.isLowEndDevice || deviceProfile.tier === "low") {
    settings.audioBitrate = "medium";
    settings.bufferSize = "medium";
    settings.audioEffects = false;
    settings.visualEffects = false;
  }

  // Apply connection-based optimizations
  if (deviceProfile.connectionType === "slow") {
    settings.audioBitrate = settings.audioBitrate === "high" ? "medium" : "low";
    settings.bufferSize = "small";
    settings.preloadNext = false;
  }

  // Apply battery-based optimizations
  if (batteryStatus.isCriticalBattery) {
    // Critical battery: maximum power saving
    settings.audioBitrate = "low";
    settings.bufferSize = "small";
    settings.preloadNext = false;
    settings.backgroundAudioProcessing = false;
    settings.audioEffects = false;
    settings.visualEffects = false;
    settings.autoSaveMode = true;
    settings.volumeLimit = 0.6;
    settings.shouldReduceQuality = true;
  } else if (batteryStatus.isLowBattery && !batteryStatus.charging) {
    // Low battery but not critical: moderate power saving
    settings.audioBitrate = settings.audioBitrate === "high" ? "medium" : settings.audioBitrate;
    settings.bufferSize = settings.bufferSize === "large" ? "medium" : settings.bufferSize;
    settings.preloadNext = false;
    settings.audioEffects = false;
    settings.visualEffects = false;
    settings.volumeLimit = 0.8;
    settings.shouldReduceQuality = true;
  }

  // If charging, allow higher quality even with low battery
  if (batteryStatus.charging && batteryStatus.level > 0.1) {
    settings.backgroundAudioProcessing = true;
    if (!batteryStatus.isCriticalBattery) {
      settings.audioBitrate = deviceProfile.connectionType === "fast" ? "medium" : "low";
      settings.audioEffects = !deviceProfile.isLowEndDevice;
      settings.volumeLimit = 0.9;
    }
  }

  return settings;
}

function settingsChanged(
  oldSettings: BatteryAwareAudioSettings,
  newSettings: BatteryAwareAudioSettings,
): boolean {
  return (
    oldSettings.audioBitrate !== newSettings.audioBitrate ||
    oldSettings.bufferSize !== newSettings.bufferSize ||
    oldSettings.preloadNext !== newSettings.preloadNext ||
    oldSettings.backgroundAudioProcessing !== newSettings.backgroundAudioProcessing ||
    oldSettings.audioEffects !== newSettings.audioEffects ||
    oldSettings.visualEffects !== newSettings.visualEffects ||
    oldSettings.shouldReduceQuality !== newSettings.shouldReduceQuality
  );
}
