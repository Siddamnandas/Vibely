"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useDevicePerformance } from "./use-device-performance";

interface NetworkState {
  isOnline: boolean;
  effectiveType: "slow-2g" | "2g" | "3g" | "4g" | "unknown";
  downlink: number;
  rtt: number;
  saveData: boolean;
  connectionQuality: "poor" | "fair" | "good" | "excellent";
}

interface NetworkAwareConfig {
  enableAdaptiveQuality: boolean;
  enableDataSaver: boolean;
  enablePrefetch: boolean;
  maxConcurrentRequests: number;
  retryAttempts: number;
  timeoutMs: number;
}

export function useNetworkAware() {
  const deviceProfile = useDevicePerformance();
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    effectiveType: "unknown",
    downlink: 0,
    rtt: 0,
    saveData: false,
    connectionQuality: "good",
  });

  const [config, setConfig] = useState<NetworkAwareConfig>({
    enableAdaptiveQuality: true,
    enableDataSaver: false,
    enablePrefetch: true,
    maxConcurrentRequests: 4,
    retryAttempts: 3,
    timeoutMs: 10000,
  });

  // Update network state
  const updateNetworkState = useCallback(() => {
    if (typeof navigator === "undefined") return;

    const connection = (navigator as any).connection;
    const isOnline = navigator.onLine;

    let effectiveType: NetworkState["effectiveType"] = "unknown";
    let downlink = 0;
    let rtt = 0;
    let saveData = false;

    if (connection) {
      effectiveType = connection.effectiveType || "unknown";
      downlink = connection.downlink || 0;
      rtt = connection.rtt || 0;
      saveData = connection.saveData || false;
    }

    // Determine connection quality
    const connectionQuality = determineConnectionQuality(effectiveType, downlink, rtt);

    const newState: NetworkState = {
      isOnline,
      effectiveType,
      downlink,
      rtt,
      saveData,
      connectionQuality,
    };

    setNetworkState(newState);

    // Auto-adjust config based on network conditions
    setConfig(prev => ({
      ...prev,
      enableDataSaver: saveData || connectionQuality === "poor",
      enablePrefetch: connectionQuality === "excellent" && !saveData,
      maxConcurrentRequests: getOptimalConcurrency(connectionQuality, deviceProfile.tier),
      timeoutMs: getOptimalTimeout(connectionQuality),
    }));

  }, [deviceProfile.tier]);

  // Determine connection quality
  const determineConnectionQuality = (
    effectiveType: string,
    downlink: number,
    rtt: number
  ): NetworkState["connectionQuality"] => {
    if (effectiveType === "slow-2g" || (downlink > 0 && downlink < 0.5)) {
      return "poor";
    }
    if (effectiveType === "2g" || (downlink > 0 && downlink < 1.5)) {
      return "fair";
    }
    if (effectiveType === "3g" || (downlink > 0 && downlink < 5)) {
      return "good";
    }
    return "excellent"; // 4g or better
  };

  // Get optimal concurrency based on network and device
  const getOptimalConcurrency = (
    quality: NetworkState["connectionQuality"],
    deviceTier: string
  ): number => {
    const base = {
      poor: 1,
      fair: 2,
      good: 4,
      excellent: 6,
    }[quality];

    // Reduce for low-end devices
    if (deviceTier === "low") {
      return Math.max(1, Math.floor(base / 2));
    }

    return base;
  };

  // Get optimal timeout based on network quality
  const getOptimalTimeout = (quality: NetworkState["connectionQuality"]): number => {
    return {
      poor: 30000,    // 30 seconds
      fair: 20000,    // 20 seconds
      good: 10000,    // 10 seconds
      excellent: 5000, // 5 seconds
    }[quality];
  };

  // Monitor network changes
  useEffect(() => {
    updateNetworkState();

    const handleOnline = () => updateNetworkState();
    const handleOffline = () => updateNetworkState();
    const handleConnectionChange = () => updateNetworkState();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Monitor connection changes
    if ((navigator as any).connection) {
      (navigator as any).connection.addEventListener("change", handleConnectionChange);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if ((navigator as any).connection) {
        (navigator as any).connection.removeEventListener("change", handleConnectionChange);
      }
    };
  }, [updateNetworkState]);

  return {
    networkState,
    config,
    updateConfig: setConfig,
  };
}

// Network-aware fetch hook
export function useNetworkAwareFetch() {
  const { networkState, config } = useNetworkAware();
  const requestQueueRef = useRef<Array<() => Promise<any>>>([]);
  const activeRequestsRef = useRef(0);

  const adaptiveFetch = useCallback(async (
    url: string,
    options: RequestInit & {
      priority?: "high" | "medium" | "low";
      adaptiveQuality?: boolean;
      skipCache?: boolean;
    } = {}
  ): Promise<Response> => {
    const { priority = "medium", adaptiveQuality = true, skipCache = false, ...fetchOptions } = options;

    // Queue low priority requests when offline or poor connection
    if ((!networkState.isOnline || networkState.connectionQuality === "poor") && priority === "low") {
      throw new Error("Request queued due to poor network conditions");
    }

    // Adapt URL based on network quality
    let adaptedUrl = url;
    if (adaptiveQuality && config.enableAdaptiveQuality) {
      adaptedUrl = adaptUrlForNetwork(url, networkState.connectionQuality, config.enableDataSaver);
    }

    // Add network-aware headers
    const headers: Record<string, string> = {
      ...((fetchOptions.headers as Record<string, string>) || {}),
    };

    // Add save-data header if data saver is enabled
    if (config.enableDataSaver) {
      headers["Save-Data"] = "on";
    }

    // Set timeout based on network quality
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeoutMs);

    try {
      // Wait for available slot in request queue
      await waitForRequestSlot();

      activeRequestsRef.current++;

      const response = await fetch(adaptedUrl, {
        ...fetchOptions,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      activeRequestsRef.current--;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      activeRequestsRef.current--;
      throw error;
    }
  }, [networkState, config]);

  // Wait for available request slot
  const waitForRequestSlot = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (activeRequestsRef.current < config.maxConcurrentRequests) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }, [config.maxConcurrentRequests]);

  // Retry mechanism with exponential backoff
  const fetchWithRetry = useCallback(async (
    url: string,
    options: Parameters<typeof adaptiveFetch>[1] = {},
    maxRetries = config.retryAttempts
  ): Promise<Response> => {
    let lastError: Error;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await adaptiveFetch(url, options);
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry for certain errors
        if (error instanceof Error && (
          error.message.includes("aborted") ||
          error.message.includes("queued")
        )) {
          throw error;
        }

        // Exponential backoff
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError!;
  }, [adaptiveFetch, config.retryAttempts]);

  return {
    fetch: adaptiveFetch,
    fetchWithRetry,
    canMakeRequest: networkState.isOnline,
    networkQuality: networkState.connectionQuality,
  };
}

// Adapt URL based on network conditions
function adaptUrlForNetwork(
  url: string,
  quality: NetworkState["connectionQuality"],
  dataSaver: boolean
): string {
  // For image URLs, adjust quality parameters
  if (url.includes("/api/images/") || url.match(/\.(jpg|jpeg|png|webp)/i)) {
    const separator = url.includes("?") ? "&" : "?";
    
    if (dataSaver || quality === "poor") {
      return `${url}${separator}quality=low&format=webp`;
    } else if (quality === "fair") {
      return `${url}${separator}quality=medium&format=webp`;
    } else if (quality === "good") {
      return `${url}${separator}quality=high&format=webp`;
    }
    // excellent quality gets original URL
  }

  // For API endpoints, add compression preference
  if (url.includes("/api/")) {
    const separator = url.includes("?") ? "&" : "?";
    
    if (dataSaver || quality === "poor") {
      return `${url}${separator}compress=true&limit=10`;
    } else if (quality === "fair") {
      return `${url}${separator}compress=true&limit=25`;
    }
  }

  return url;
}

// Network-aware content loading hook
export function useNetworkAwareContent<T>(
  fetchData: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { fetchWithRetry, canMakeRequest, networkQuality } = useNetworkAwareFetch();
  const { networkState } = useNetworkAware();

  const loadData = useCallback(async () => {
    if (!canMakeRequest) {
      setError(new Error("No network connection available"));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchData();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [fetchData, canMakeRequest]);

  // Load data when dependencies change or network becomes available
  useEffect(() => {
    if (canMakeRequest) {
      loadData();
    }
  }, [loadData, canMakeRequest, ...dependencies]);

  // Retry when coming back online
  useEffect(() => {
    if (networkState.isOnline && error && !loading) {
      console.log("🌐 Network restored, retrying failed request...");
      loadData();
    }
  }, [networkState.isOnline, error, loading, loadData]);

  return {
    data,
    loading,
    error,
    retry: loadData,
    networkQuality,
    canRetry: canMakeRequest && !loading,
  };
}
