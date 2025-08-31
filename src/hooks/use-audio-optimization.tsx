"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useBatteryAwareAudio, BatteryAwareAudioSettings } from "./use-battery-aware-audio";
import { useThermalMonitoring, ThermalState } from "./use-thermal-monitoring";
import { useIntelligentAudioBuffer, AudioBufferConfig, BufferStatus } from "./use-intelligent-audio-buffer";
import { useDevicePerformance } from "./use-device-performance";
import { getAudioEngine } from "@/lib/audio-engine";
import { track as trackEvent } from "@/lib/analytics";

export interface AudioOptimizationProfile {
  quality: "high" | "medium" | "low";
  bitrate: number;
  bufferSize: "tiny" | "small" | "medium" | "large" | "adaptive";
  bufferAhead: number;
  concurrentStreams: number;
  effectsEnabled: boolean;
  preloadEnabled: boolean;
  overallPerformance: "critical" | "poor" | "good" | "excellent";
  optimizationReasons: string[];
}

export function useAudioOptimization() {
  const { batteryStatus, audioSettings } = useBatteryAwareAudio();
  const { thermalState, getThermalAwareAudioSettings } = useThermalMonitoring();
  const { 
    bufferConfig, 
    bufferStatus, 
    getOptimizedBufferConfig,
    shouldBufferAggressively 
  } = useIntelligentAudioBuffer();
  const deviceProfile = useDevicePerformance();
  
  const [optimizationProfile, setOptimizationProfile] = useState<AudioOptimizationProfile>({
    quality: "high",
    bitrate: 320,
    bufferSize: "adaptive",
    bufferAhead: 30,
    concurrentStreams: 3,
    effectsEnabled: true,
    preloadEnabled: true,
    overallPerformance: "good",
    optimizationReasons: [],
  });

  // Calculate comprehensive audio optimization profile
  const calculateOptimizationProfile = useCallback((): AudioOptimizationProfile => {
    const reasons: string[] = [];
    
    // Start with device-based defaults
    let profile: AudioOptimizationProfile = {
      quality: "high",
      bitrate: 320,
      bufferSize: "adaptive",
      bufferAhead: 30,
      concurrentStreams: 3,
      effectsEnabled: true,
      preloadEnabled: true,
      overallPerformance: "good",
      optimizationReasons: [],
    };

    // Apply device tier adjustments
    if (deviceProfile.tier === "low" || deviceProfile.isLowEndDevice) {
      profile.quality = "medium";
      profile.bitrate = 192;
      profile.concurrentStreams = 1;
      profile.effectsEnabled = false;
      profile.bufferAhead = 20;
      reasons.push("low_end_device");
    }

    // Apply battery-aware optimizations
    if (audioSettings.shouldReduceQuality) {
      profile.quality = audioSettings.audioBitrate;
      profile.bitrate = audioSettings.audioBitrate === "low" ? 128 :
                      audioSettings.audioBitrate === "medium" ? 192 : 320;
      profile.effectsEnabled = audioSettings.audioEffects;
      profile.preloadEnabled = audioSettings.preloadNext;
      reasons.push("battery_optimization");
    }

    // Apply thermal-aware optimizations (more restrictive)
    if (thermalState.shouldReduceQuality) {
      const thermalBitrate = thermalState.maxAudioBitrate === "low" ? 96 :
                           thermalState.maxAudioBitrate === "medium" ? 128 : 192;
      
      if (thermalBitrate < profile.bitrate) {
        profile.quality = thermalState.maxAudioBitrate;
        profile.bitrate = thermalBitrate;
        profile.concurrentStreams = Math.min(profile.concurrentStreams, thermalState.maxConcurrentProcesses);
        profile.effectsEnabled = false;
        reasons.push("thermal_optimization");
      }
    }

    // Apply buffer-aware optimizations
    if (bufferStatus) {
      profile.bufferAhead = bufferConfig?.bufferAhead || 30;
      profile.bufferSize = bufferConfig?.bufferSize || "adaptive";
      
      if (bufferStatus.bufferHealth === "critical") {
        profile.quality = "low";
        profile.bitrate = 96;
        profile.concurrentStreams = 1;
        profile.preloadEnabled = false;
        reasons.push("critical_buffer");
      } else if (bufferStatus.bufferHealth === "low") {
        profile.quality = profile.quality === "high" ? "medium" : profile.quality;
        profile.bitrate = Math.min(profile.bitrate, 128);
        profile.preloadEnabled = false;
        reasons.push("low_buffer");
      }
    }

    // Determine overall performance
    let overallPerformance: "critical" | "poor" | "good" | "excellent" = "good";
    
    if (profile.quality === "low" || 
        profile.bitrate <= 96 || 
        thermalState.level === "critical" || 
        (bufferStatus?.bufferHealth === "critical")) {
      overallPerformance = "critical";
    } else if (profile.quality === "medium" || 
               thermalState.level === "serious" || 
               (bufferStatus?.bufferHealth === "low")) {
      overallPerformance = "poor";
    } else if (profile.quality === "high" && 
               thermalState.level === "nominal" && 
               (bufferStatus?.bufferHealth === "good" || bufferStatus?.bufferHealth === "excellent")) {
      overallPerformance = "excellent";
    }
    
    profile.overallPerformance = overallPerformance;
    profile.optimizationReasons = reasons;

    return profile;
  }, [
    deviceProfile.tier, 
    deviceProfile.isLowEndDevice,
    audioSettings,
    thermalState,
    bufferConfig,
    bufferStatus
  ]);

  // Apply optimizations to audio engine
  const applyOptimizations = useCallback(() => {
    const profile = calculateOptimizationProfile();
    setOptimizationProfile(profile);
    
    const audioEngine = getAudioEngine();
    
    // Apply all optimizations to audio engine
    audioEngine.applyBatteryOptimizations(audioSettings);
    audioEngine.applyThermalOptimizations(thermalState);
    if (bufferConfig && bufferStatus) {
      audioEngine.applyBufferOptimizations(bufferConfig, bufferStatus);
    }
    
    // Track optimization changes
    if (profile.optimizationReasons.length > 0) {
      trackEvent("audio_optimization_applied", {
        reasons: profile.optimizationReasons,
        quality: profile.quality,
        bitrate: profile.bitrate,
        buffer_ahead: profile.bufferAhead,
        concurrent_streams: profile.concurrentStreams,
        device_tier: deviceProfile.tier,
        battery_level: Math.round(batteryStatus.level * 100),
        thermal_level: thermalState.level,
        buffer_health: bufferStatus?.bufferHealth,
      });
    }
  }, [
    calculateOptimizationProfile,
    audioSettings,
    thermalState,
    bufferConfig,
    bufferStatus,
    deviceProfile.tier,
    batteryStatus.level
  ]);

  // Apply optimizations when any input changes
  useEffect(() => {
    applyOptimizations();
  }, [applyOptimizations]);

  // Trigger emergency buffering if needed
  useEffect(() => {
    // Only trigger emergency buffering if we haven't done so recently
    const now = Date.now();
    const lastEmergencyBufferTime = (window as any).__lastEmergencyBufferTime || 0;
    
    if (shouldBufferAggressively() && (now - lastEmergencyBufferTime > 5000)) {
      // Update the last emergency buffer time
      (window as any).__lastEmergencyBufferTime = now;
      
      const audioEngine = getAudioEngine();
      audioEngine.optimizeBuffering();
      
      trackEvent("emergency_buffering_triggered", {
        buffer_health: bufferStatus?.bufferHealth,
        current_buffer: bufferStatus?.currentBuffer,
        target_buffer: bufferStatus?.targetBuffer,
        download_speed: bufferStatus?.downloadSpeed,
      });
    }
  }, [shouldBufferAggressively, bufferStatus]);

  // Get optimization status from audio engine
  const getEngineOptimizationStatus = useCallback(() => {
    const audioEngine = getAudioEngine();
    return audioEngine.getOptimizationStatus();
  }, []);

  // Reset optimizations to defaults
  const resetOptimizations = useCallback(() => {
    const defaultProfile: AudioOptimizationProfile = {
      quality: "high",
      bitrate: 320,
      bufferSize: "adaptive",
      bufferAhead: 30,
      concurrentStreams: 3,
      effectsEnabled: true,
      preloadEnabled: true,
      overallPerformance: "good",
      optimizationReasons: [],
    };
    
    setOptimizationProfile(defaultProfile);
  }, []);

  // Get optimization recommendations
  const getOptimizationRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (batteryStatus.isCriticalBattery) {
      recommendations.push("Enable battery save mode for maximum power efficiency");
    }
    
    if (thermalState.level === "serious" || thermalState.level === "critical") {
      recommendations.push("Reduce audio quality to prevent overheating");
    }
    
    if (bufferStatus?.bufferHealth === "low" || bufferStatus?.bufferHealth === "critical") {
      recommendations.push("Check network connection or reduce audio quality");
    }
    
    if (deviceProfile.isLowEndDevice) {
      recommendations.push("Device-optimized settings automatically applied");
    }
    
    return recommendations;
  }, [batteryStatus, thermalState, bufferStatus, deviceProfile.isLowEndDevice]);

  return {
    optimizationProfile,
    batterySettings: audioSettings,
    thermalState,
    bufferConfig,
    bufferStatus,
    applyOptimizations,
    getEngineOptimizationStatus,
    resetOptimizations,
    getOptimizationRecommendations,
    isOptimized: optimizationProfile.optimizationReasons.length > 0,
  };
}