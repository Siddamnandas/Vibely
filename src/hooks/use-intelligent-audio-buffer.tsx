"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useNetworkAware } from "./use-network-aware-loading";
import { track as trackEvent } from "@/lib/analytics";

export interface AudioBufferConfig {
  bufferSize: "tiny" | "small" | "medium" | "large" | "adaptive";
  bufferAhead: number; // seconds
  bufferBehind: number; // seconds
  chunkSize: number; // bytes
  maxBufferSize: number; // bytes
  connectionAware: boolean;
  adaptiveThreshold: number; // connection speed threshold
}

export interface BufferStatus {
  currentBuffer: number; // seconds buffered
  targetBuffer: number; // seconds we want buffered
  isBuffering: boolean;
  bufferHealth: "critical" | "low" | "good" | "excellent";
  estimatedPlaytime: number; // seconds of playable content
  downloadSpeed: number; // bytes per second
  bufferEfficiency: number; // 0-1 ratio
}

export interface ConnectionMetrics {
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink: number; // Mbps
  rtt: number; // ms
  isStable: boolean;
  averageSpeed: number; // bytes/sec over last 30s
  speedHistory: number[];
}

export function useIntelligentAudioBuffer() {
  const { networkState, config: networkConfig } = useNetworkAware();
  const [bufferConfig, setBufferConfig] = useState<AudioBufferConfig>({
    bufferSize: "adaptive",
    bufferAhead: 30, // 30 seconds ahead
    bufferBehind: 5,  // 5 seconds behind
    chunkSize: 64 * 1024, // 64KB chunks
    maxBufferSize: 10 * 1024 * 1024, // 10MB max
    connectionAware: true,
    adaptiveThreshold: 1.0, // 1 Mbps threshold
  });

  const [bufferStatus, setBufferStatus] = useState<BufferStatus>({
    currentBuffer: 0,
    targetBuffer: 30,
    isBuffering: false,
    bufferHealth: "good",
    estimatedPlaytime: 0,
    downloadSpeed: 0,
    bufferEfficiency: 1.0,
  });

  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics>({
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    isStable: true,
    averageSpeed: 0,
    speedHistory: [],
  });

  const speedHistoryRef = useRef<Array<{ timestamp: number; speed: number }>>([]);
  const lastBufferUpdateRef = useRef<number>(Date.now());
  const bufferConfigRef = useRef(bufferConfig);

  // Keep bufferConfigRef in sync with bufferConfig state
  useEffect(() => {
    bufferConfigRef.current = bufferConfig;
  }, [bufferConfig]);

  // Calculate optimal buffer configuration based on connection
  const calculateOptimalBuffer = useCallback((
    connectionType: string,
    downlink: number,
    rtt: number,
    isStable: boolean
  ): AudioBufferConfig => {
    let config: AudioBufferConfig = { ...bufferConfigRef.current };

    // Adjust based on connection type
    switch (connectionType) {
      case "slow-2g":
        config = {
          ...config,
          bufferSize: "large",
          bufferAhead: 60, // Buffer more on slow connections
          chunkSize: 32 * 1024, // Smaller chunks
          maxBufferSize: 15 * 1024 * 1024, // Allow larger buffer
        };
        break;

      case "2g":
        config = {
          ...config,
          bufferSize: "large",
          bufferAhead: 45,
          chunkSize: 48 * 1024,
          maxBufferSize: 12 * 1024 * 1024,
        };
        break;

      case "3g":
        config = {
          ...config,
          bufferSize: "medium",
          bufferAhead: 30,
          chunkSize: 64 * 1024,
          maxBufferSize: 10 * 1024 * 1024,
        };
        break;

      case "4g":
        config = {
          ...config,
          bufferSize: "medium",
          bufferAhead: 20,
          chunkSize: 128 * 1024, // Larger chunks for fast connections
          maxBufferSize: 8 * 1024 * 1024, // Smaller buffer since we can refill quickly
        };
        break;

      default:
        // Unknown connection - use conservative settings
        config = {
          ...config,
          bufferSize: "medium",
          bufferAhead: 30,
          chunkSize: 64 * 1024,
          maxBufferSize: 10 * 1024 * 1024,
        };
    }

    // Adjust for unstable connections
    if (!isStable) {
      config.bufferAhead = Math.min(config.bufferAhead * 1.5, 90); // Increase buffer but cap at 90s
      config.maxBufferSize = Math.min(config.maxBufferSize * 1.3, 20 * 1024 * 1024);
    }

    // Adjust for high latency
    if (rtt > 500) { // High latency
      config.bufferAhead = Math.min(config.bufferAhead * 1.2, 60);
      config.chunkSize = Math.max(config.chunkSize * 0.8, 32 * 1024); // Smaller chunks for high latency
    }

    return config;
  }, []);

  // Update connection metrics
  useEffect(() => {
    const updateConnectionMetrics = () => {
      const now = Date.now();
      
      // Update basic metrics from network state
      const newMetrics: ConnectionMetrics = {
        effectiveType: networkState.effectiveType,
        downlink: networkState.downlink,
        rtt: networkState.rtt,
        isStable: true, // Will be calculated from speed variance
        averageSpeed: 0,
        speedHistory: [],
      };

      // Calculate average speed from download measurements
      const recentMeasurements = speedHistoryRef.current.filter(
        measurement => now - measurement.timestamp < 30000 // Last 30 seconds
      );

      if (recentMeasurements.length > 0) {
        newMetrics.averageSpeed = recentMeasurements.reduce((sum, m) => sum + m.speed, 0) / recentMeasurements.length;
        newMetrics.speedHistory = recentMeasurements.map(m => m.speed);

        // Check connection stability (coefficient of variation)
        if (recentMeasurements.length > 5) {
          const mean = newMetrics.averageSpeed;
          const variance = recentMeasurements.reduce((sum, m) => sum + Math.pow(m.speed - mean, 2), 0) / recentMeasurements.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = stdDev / mean;
          
          newMetrics.isStable = coefficientOfVariation < 0.3; // Less than 30% variation is considered stable
        }
      }

      setConnectionMetrics(newMetrics);

      // Update buffer configuration based on connection
      if (bufferConfigRef.current.connectionAware) {
        const optimizedConfig = calculateOptimalBuffer(
          newMetrics.effectiveType,
          newMetrics.downlink,
          newMetrics.rtt,
          newMetrics.isStable
        );
        setBufferConfig(optimizedConfig);
      }
    };

    updateConnectionMetrics();
    const interval = setInterval(updateConnectionMetrics, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [networkState, calculateOptimalBuffer]);

  // Record download speed measurement
  const recordDownloadSpeed = useCallback((bytesDownloaded: number, timeMs: number) => {
    const speed = (bytesDownloaded / timeMs) * 1000; // bytes per second
    const now = Date.now();

    speedHistoryRef.current.push({ timestamp: now, speed });

    // Keep only last 60 seconds of measurements
    speedHistoryRef.current = speedHistoryRef.current.filter(
      measurement => now - measurement.timestamp < 60000
    );

    // Update buffer status with new speed info
    setBufferStatus(prev => ({
      ...prev,
      downloadSpeed: speed,
    }));
  }, []);

  // Calculate buffer health and status
  const updateBufferStatus = useCallback((
    currentBufferedSeconds: number,
    targetBufferedSeconds: number,
    isCurrentlyBuffering: boolean
  ) => {
    const bufferRatio = currentBufferedSeconds / targetBufferedSeconds;
    
    let health: BufferStatus["bufferHealth"];
    if (bufferRatio < 0.2) {
      health = "critical";
    } else if (bufferRatio < 0.5) {
      health = "low";
    } else if (bufferRatio < 0.8) {
      health = "good";
    } else {
      health = "excellent";
    }

    // Estimate playable time based on current buffer and download speed
    const currentDownloadSpeed = connectionMetrics.averageSpeed || connectionMetrics.downlink * 125000; // Convert Mbps to bytes/sec
    const estimatedDownloadRate = currentDownloadSpeed / (192 * 1024 / 8); // Assume 192kbps audio, convert to playback rate
    
    let estimatedPlaytime = currentBufferedSeconds;
    if (currentDownloadSpeed > 0 && estimatedDownloadRate > 1) {
      // If we're downloading faster than playback, add potential future buffer
      estimatedPlaytime += (targetBufferedSeconds - currentBufferedSeconds) / (estimatedDownloadRate - 1);
    }

    const bufferEfficiency = Math.min(currentBufferedSeconds / Math.max(targetBufferedSeconds, 1), 1.0);

    setBufferStatus({
      currentBuffer: currentBufferedSeconds,
      targetBuffer: targetBufferedSeconds,
      isBuffering: isCurrentlyBuffering,
      bufferHealth: health,
      estimatedPlaytime: Math.max(estimatedPlaytime, currentBufferedSeconds),
      downloadSpeed: currentDownloadSpeed,
      bufferEfficiency,
    });

    lastBufferUpdateRef.current = Date.now();

    // Track buffer events for analytics
    if (health === "critical" || (health === "low" && bufferStatus.bufferHealth !== "low")) {
      trackEvent("audio_buffer_low", {
        buffer_seconds: currentBufferedSeconds,
        target_seconds: targetBufferedSeconds,
        connection_type: connectionMetrics.effectiveType,
        download_speed: currentDownloadSpeed,
        is_stable: connectionMetrics.isStable,
      });
    }
  }, [connectionMetrics, bufferStatus.bufferHealth]);

  // Get recommended chunk size for downloads based on current conditions
  const getOptimalChunkSize = useCallback((): number => {
    const baseChunkSize = bufferConfig.chunkSize;
    
    // Adjust chunk size based on connection stability
    if (!connectionMetrics.isStable) {
      return Math.max(baseChunkSize * 0.7, 16 * 1024); // Smaller chunks for unstable connections
    }
    
    // Adjust based on RTT
    if (connectionMetrics.rtt > 200) {
      return Math.min(baseChunkSize * 1.5, 256 * 1024); // Larger chunks for high latency
    }
    
    return baseChunkSize;
  }, [bufferConfig.chunkSize, connectionMetrics.isStable, connectionMetrics.rtt]);

  // Determine if we should start aggressive buffering
  const shouldBufferAggressively = useCallback((): boolean => {
    const timeSinceLastUpdate = Date.now() - lastBufferUpdateRef.current;
    
    return (
      bufferStatus.bufferHealth === "critical" ||
      (bufferStatus.bufferHealth === "low" && !connectionMetrics.isStable) ||
      (bufferStatus.currentBuffer < 5 && connectionMetrics.effectiveType === "slow-2g") ||
      timeSinceLastUpdate > 30000 // Haven't updated in 30 seconds
    );
  }, [bufferStatus, connectionMetrics]);

  // Get buffer configuration optimized for current conditions
  const getOptimizedBufferConfig = useCallback((): AudioBufferConfig => {
    return { ...bufferConfig };
  }, [bufferConfig]);

  return {
    bufferConfig,
    bufferStatus,
    connectionMetrics,
    recordDownloadSpeed,
    updateBufferStatus,
    getOptimalChunkSize,
    shouldBufferAggressively,
    getOptimizedBufferConfig,
    setBufferConfig,
  };
}