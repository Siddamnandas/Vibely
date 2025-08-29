"use client";

import { useEffect, useRef, useCallback } from "react";
import { useOptimizedImageCache } from "@/lib/image-cache";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useBatteryAwareAudio } from "@/hooks/use-battery-aware-audio";
import { track as trackEvent } from "@/lib/analytics";

interface PreloadableImage {
  url: string;
  priority: "high" | "medium" | "low";
  index?: number;
}

interface SmartPreloadOptions {
  preloadDistance?: number;
  prioritizeVisible?: boolean;
  delayMs?: number;
  maxConcurrent?: number;
}

export function useSmartImagePreload(
  images: PreloadableImage[],
  currentIndex: number = 0,
  options: SmartPreloadOptions = {}
) {
  const { preloadImages } = useOptimizedImageCache();
  const deviceProfile = useDevicePerformance();
  const { batteryStatus, audioSettings } = useBatteryAwareAudio();
  
  const preloadQueueRef = useRef<Set<string>>(new Set());
  const isPreloadingRef = useRef(false);
  const preloadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const {
    preloadDistance = 3,
    prioritizeVisible = true,
    delayMs = 100,
    maxConcurrent = 2,
  } = options;

  // Calculate adaptive preload settings
  const getAdaptivePreloadDistance = useCallback(() => {
    if (audioSettings.shouldReduceQuality) return 0;
    if (deviceProfile.isLowEndDevice) return 1;
    if (deviceProfile.connectionType === "slow") return 1;
    if (batteryStatus.isLowBattery && !batteryStatus.charging) return 1;
    return preloadDistance;
  }, [audioSettings, deviceProfile, batteryStatus, preloadDistance]);

  const shouldPreload = useCallback(() => {
    return (
      images.length > 0 &&
      !audioSettings.shouldReduceQuality &&
      deviceProfile.connectionType !== "offline" &&
      (!batteryStatus.isCriticalBattery || batteryStatus.charging)
    );
  }, [audioSettings, deviceProfile, batteryStatus, images.length]);

  // Smart preload function that considers network conditions and user behavior
  const smartPreload = useCallback(async () => {
    if (!shouldPreload() || isPreloadingRef.current) return;

    const adaptiveDistance = getAdaptivePreloadDistance();
    if (adaptiveDistance === 0) return;

    isPreloadingRef.current = true;
    
    try {
      // Get images to preload
      const imagesToPreload = getImagesToPreload(
        images,
        currentIndex,
        adaptiveDistance,
        prioritizeVisible
      );

      // Filter out already preloaded images
      const newImagesToPreload = imagesToPreload.filter(
        img => !preloadQueueRef.current.has(img.url)
      );

      if (newImagesToPreload.length === 0) {
        isPreloadingRef.current = false;
        return;
      }

      // Track preload attempt
      trackEvent("image_preload_started", {
        count: newImagesToPreload.length,
        current_index: currentIndex,
        preload_distance: adaptiveDistance,
        device_tier: deviceProfile.tier,
        connection_type: deviceProfile.connectionType,
        battery_level: Math.round(batteryStatus.level * 100),
      });

      // Add to preload queue
      newImagesToPreload.forEach(img => preloadQueueRef.current.add(img.url));

      // Preload in batches to avoid overwhelming the network
      await preloadInBatches(newImagesToPreload, maxConcurrent);

    } catch (error) {
      console.warn("Smart preload failed:", error);
      trackEvent("image_preload_failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        current_index: currentIndex,
      });
    } finally {
      isPreloadingRef.current = false;
    }
  }, [
    shouldPreload,
    getAdaptivePreloadDistance,
    images,
    currentIndex,
    prioritizeVisible,
    preloadImages,
    maxConcurrent,
    deviceProfile,
    batteryStatus,
  ]);

  // Preload images in batches to control network load
  const preloadInBatches = async (imagesToPreload: PreloadableImage[], batchSize: number) => {
    const batches = chunkArray(imagesToPreload, batchSize);
    
    for (const batch of batches) {
      const batchPromises = batch.map(async (img) => {
        try {
          await preloadImages([img.url], {
            priority: img.priority,
            quality: getQualityForPriority(img.priority),
          });
        } catch (error) {
          console.warn(`Failed to preload image: ${img.url}`, error);
          // Remove from queue on failure
          preloadQueueRef.current.delete(img.url);
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to avoid overwhelming the network
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  };

  // Get quality setting based on priority
  const getQualityForPriority = (priority: "high" | "medium" | "low"): "high" | "medium" | "low" => {
    if (deviceProfile.connectionType === "slow") return "low";
    if (audioSettings.shouldReduceQuality) return "low";
    
    switch (priority) {
      case "high": return deviceProfile.maxImageQuality;
      case "medium": return deviceProfile.maxImageQuality === "high" ? "medium" : "low";
      case "low": return "low";
      default: return "medium";
    }
  };

  // Debounced preload trigger
  const triggerPreload = useCallback(() => {
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }
    
    preloadTimeoutRef.current = setTimeout(() => {
      smartPreload();
    }, delayMs);
  }, [smartPreload, delayMs]);

  // Effect to trigger preload when current index changes
  useEffect(() => {
    triggerPreload();
    
    return () => {
      if (preloadTimeoutRef.current) {
        clearTimeout(preloadTimeoutRef.current);
      }
    };
  }, [currentIndex, triggerPreload]);

  // Clean up preload queue when images change
  useEffect(() => {
    // Remove URLs that are no longer in the images array
    const currentUrls = new Set(images.map(img => img.url));
    preloadQueueRef.current.forEach(url => {
      if (!currentUrls.has(url)) {
        preloadQueueRef.current.delete(url);
      }
    });
  }, [images]);

  // Manual preload trigger for specific images
  const preloadSpecific = useCallback(async (urls: string[], priority: "high" | "medium" | "low" = "medium") => {
    if (!shouldPreload()) return;

    try {
      await preloadImages(urls, {
        priority,
        quality: getQualityForPriority(priority),
      });
      
      urls.forEach(url => preloadQueueRef.current.add(url));
    } catch (error) {
      console.warn("Manual preload failed:", error);
    }
  }, [shouldPreload, preloadImages]);

  // Cleanup function
  const clearPreloadQueue = useCallback(() => {
    preloadQueueRef.current.clear();
    if (preloadTimeoutRef.current) {
      clearTimeout(preloadTimeoutRef.current);
    }
  }, []);

  return {
    preloadSpecific,
    clearPreloadQueue,
    isPreloading: isPreloadingRef.current,
    preloadedCount: preloadQueueRef.current.size,
  };
}

// Helper function to determine which images to preload
function getImagesToPreload(
  images: PreloadableImage[],
  currentIndex: number,
  distance: number,
  prioritizeVisible: boolean
): PreloadableImage[] {
  const result: PreloadableImage[] = [];
  
  // Preload upcoming images
  for (let i = 1; i <= distance; i++) {
    const nextIndex = currentIndex + i;
    if (nextIndex < images.length) {
      const priority = i === 1 ? "high" : i === 2 ? "medium" : "low";
      result.push({
        ...images[nextIndex],
        priority,
        index: nextIndex,
      });
    }
  }
  
  // If prioritizing visible images, also preload previous images
  if (prioritizeVisible) {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      result.push({
        ...images[prevIndex],
        priority: "medium",
        index: prevIndex,
      });
    }
  }
  
  return result;
}

// Helper function to split array into chunks
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}