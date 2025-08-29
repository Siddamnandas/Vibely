"use client";

import React from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useBatteryAwareAudio } from "@/hooks/use-battery-aware-audio";
import { track as trackEvent } from "@/lib/analytics";

interface CachedImage {
  url: string;
  blob: Blob;
  lastAccessed: number;
  priority: "high" | "medium" | "low";
  size: number;
}

interface ImageCacheConfig {
  maxCacheSize: number; // in MB
  maxCacheEntries: number;
  prefetchDistance: number; // how many images ahead to prefetch
  retryAttempts: number;
  networkTimeoutMs: number;
}

interface NetworkOptimizedImageOptions {
  priority?: "high" | "medium" | "low";
  preload?: boolean;
  quality?: "high" | "medium" | "low";
  format?: "webp" | "jpeg" | "png" | "auto";
  placeholder?: string;
}

class ImageCacheManager {
  private cache: Map<string, CachedImage> = new Map();
  private loadingPromises: Map<string, Promise<string>> = new Map();
  private config: ImageCacheConfig;
  private totalCacheSize = 0;
  private deviceProfile: any = null;
  private batterySettings: any = null;

  constructor(config: ImageCacheConfig) {
    this.config = config;
    this.initializeCache();
  }

  private async initializeCache() {
    // Check for existing cache in IndexedDB
    try {
      await this.loadCacheFromIndexedDB();
    } catch (error) {
      console.warn("Failed to load image cache from IndexedDB:", error);
    }

    // Set up cache cleanup on memory pressure
    if ('memory' in (navigator as any)) {
      this.setupMemoryPressureHandling();
    }
  }

  setDeviceProfile(profile: any) {
    this.deviceProfile = profile;
    this.adjustConfigForDevice();
  }

  setBatterySettings(settings: any) {
    this.batterySettings = settings;
    this.adjustConfigForBattery();
  }

  private adjustConfigForDevice() {
    if (!this.deviceProfile) return;

    if (this.deviceProfile.isLowEndDevice) {
      this.config.maxCacheSize = Math.min(this.config.maxCacheSize, 50); // 50MB max
      this.config.maxCacheEntries = Math.min(this.config.maxCacheEntries, 100);
      this.config.prefetchDistance = Math.min(this.config.prefetchDistance, 2);
    }

    if (this.deviceProfile.connectionType === "slow") {
      this.config.prefetchDistance = 1; // Only prefetch next image
      this.config.networkTimeoutMs = 15000; // Longer timeout for slow connections
    }
  }

  private adjustConfigForBattery() {
    if (!this.batterySettings) return;

    if (this.batterySettings.shouldReduceQuality) {
      this.config.prefetchDistance = 0; // Disable prefetching
      this.config.maxCacheSize = Math.min(this.config.maxCacheSize, 25); // 25MB max
    }
  }

  async getOptimizedImageUrl(
    originalUrl: string,
    options: NetworkOptimizedImageOptions = {}
  ): Promise<string> {
    const cacheKey = this.generateCacheKey(originalUrl, options);
    
    // Check if image is already cached
    const cached = this.cache.get(cacheKey);
    if (cached) {
      cached.lastAccessed = Date.now();
      return URL.createObjectURL(cached.blob);
    }

    // Check if image is currently being loaded
    const loadingPromise = this.loadingPromises.get(cacheKey);
    if (loadingPromise) {
      return loadingPromise;
    }

    // Start loading the image
    const promise = this.loadAndCacheImage(originalUrl, options, cacheKey);
    this.loadingPromises.set(cacheKey, promise);

    try {
      const result = await promise;
      this.loadingPromises.delete(cacheKey);
      return result;
    } catch (error) {
      this.loadingPromises.delete(cacheKey);
      throw error;
    }
  }

  private async loadAndCacheImage(
    url: string,
    options: NetworkOptimizedImageOptions,
    cacheKey: string
  ): Promise<string> {
    const startTime = performance.now();
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.config.retryAttempts) {
      try {
        const optimizedUrl = this.getOptimizedUrl(url, options);
        const response = await this.fetchWithTimeout(optimizedUrl, this.config.networkTimeoutMs);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const blob = await response.blob();
        const loadTime = performance.now() - startTime;

        // Cache the image
        await this.cacheImage(cacheKey, blob, options.priority || "medium");

        // Track successful load
        trackEvent("image_cache_loaded", {
          load_time: loadTime,
          attempt: attempt + 1,
          size_bytes: blob.size,
          cache_hit: false,
          network_type: this.deviceProfile?.connectionType,
          quality: options.quality,
        });

        return URL.createObjectURL(blob);
      } catch (error) {
        lastError = error as Error;
        attempt++;
        
        if (attempt < this.config.retryAttempts) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Track failed load
    trackEvent("image_cache_failed", {
      attempts: attempt,
      error: lastError?.message,
      url: url,
    });

    throw lastError || new Error("Failed to load image after retries");
  }

  private getOptimizedUrl(url: string, options: NetworkOptimizedImageOptions): string {
    try {
      const urlObj = new URL(url);
      
      // Apply quality optimizations based on network and device
      if (this.deviceProfile?.connectionType === "slow" || this.batterySettings?.shouldReduceQuality) {
        options.quality = "low";
      }

      // Add quality parameters for supported CDNs
      if (this.isOptimizableUrl(url)) {
        this.addQualityParams(urlObj, options);
      }

      return urlObj.toString();
    } catch {
      return url; // Return original URL if parsing fails
    }
  }

  private isOptimizableUrl(url: string): boolean {
    const optimizableDomains = [
      'picsum.photos',
      'unsplash.com',
      'images.unsplash.com',
      'cloudinary.com',
      'imgix.net',
    ];
    
    return optimizableDomains.some(domain => url.includes(domain));
  }

  private addQualityParams(urlObj: URL, options: NetworkOptimizedImageOptions) {
    // Quality parameter
    const qualityValue = this.getQualityValue(options.quality);
    urlObj.searchParams.set('q', qualityValue.toString());

    // Format parameter
    const format = this.getOptimalFormat(options.format);
    if (format !== 'auto') {
      urlObj.searchParams.set('fm', format);
    }

    // Add responsive parameters for mobile
    if (this.deviceProfile?.isLowEndDevice) {
      urlObj.searchParams.set('w', '800'); // Max width 800px
      urlObj.searchParams.set('dpr', '1'); // Standard DPR for low-end devices
    }
  }

  private getQualityValue(quality?: string): number {
    switch (quality) {
      case "high": return 90;
      case "medium": return 75;
      case "low": return 60;
      default: return this.batterySettings?.shouldReduceQuality ? 60 : 80;
    }
  }

  private getOptimalFormat(preferredFormat?: string): string {
    if (preferredFormat && preferredFormat !== 'auto') {
      return preferredFormat;
    }

    // Check browser support for modern formats
    if (this.supportsWebP()) {
      return 'webp';
    }

    return 'jpeg';
  }

  private supportsWebP(): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    } catch {
      return false;
    }
  }

  private async fetchWithTimeout(url: string, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'image/webp,image/avif,image/jpeg,image/png,*/*',
        },
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async cacheImage(cacheKey: string, blob: Blob, priority: "high" | "medium" | "low") {
    const imageSize = blob.size;
    
    // Check if we need to free up space
    while (this.shouldEvictCache(imageSize)) {
      this.evictLeastRecentlyUsed();
    }

    // Add to cache
    const cachedImage: CachedImage = {
      url: cacheKey,
      blob,
      lastAccessed: Date.now(),
      priority,
      size: imageSize,
    };

    this.cache.set(cacheKey, cachedImage);
    this.totalCacheSize += imageSize;

    // Persist to IndexedDB for offline access
    try {
      await this.saveCacheToIndexedDB(cacheKey, cachedImage);
    } catch (error) {
      console.warn("Failed to persist image to IndexedDB:", error);
    }
  }

  private shouldEvictCache(newImageSize: number): boolean {
    const maxSizeBytes = this.config.maxCacheSize * 1024 * 1024;
    return (
      this.cache.size >= this.config.maxCacheEntries ||
      this.totalCacheSize + newImageSize > maxSizeBytes
    );
  }

  private evictLeastRecentlyUsed() {
    let oldestKey: string | null = null;
    let oldestTime = Date.now();

    // Find the least recently used low priority image first
    for (const [key, image] of this.cache.entries()) {
      if (image.priority === "low" && image.lastAccessed < oldestTime) {
        oldestTime = image.lastAccessed;
        oldestKey = key;
      }
    }

    // If no low priority images, find any least recently used
    if (!oldestKey) {
      for (const [key, image] of this.cache.entries()) {
        if (image.lastAccessed < oldestTime) {
          oldestTime = image.lastAccessed;
          oldestKey = key;
        }
      }
    }

    if (oldestKey) {
      const evicted = this.cache.get(oldestKey);
      if (evicted) {
        this.cache.delete(oldestKey);
        this.totalCacheSize -= evicted.size;
        URL.revokeObjectURL(evicted.url);
      }
    }
  }

  private generateCacheKey(url: string, options: NetworkOptimizedImageOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}_${btoa(optionsStr)}`;
  }

  async preloadImages(urls: string[], options: NetworkOptimizedImageOptions = {}) {
    if (!this.shouldPreload()) return;

    const preloadPromises = urls.slice(0, this.config.prefetchDistance).map(async (url) => {
      try {
        await this.getOptimizedImageUrl(url, { ...options, priority: "low" });
      } catch (error) {
        console.warn(`Failed to preload image: ${url}`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  private shouldPreload(): boolean {
    return (
      this.config.prefetchDistance > 0 &&
      (!this.batterySettings || !this.batterySettings.shouldReduceQuality) &&
      this.deviceProfile?.connectionType !== "slow"
    );
  }

  clearCache() {
    for (const image of this.cache.values()) {
      URL.revokeObjectURL(image.url);
    }
    this.cache.clear();
    this.totalCacheSize = 0;
  }

  getCacheStats() {
    return {
      entries: this.cache.size,
      sizeMB: Math.round(this.totalCacheSize / (1024 * 1024) * 100) / 100,
      maxSizeMB: this.config.maxCacheSize,
      hitRate: this.calculateHitRate(),
    };
  }

  private calculateHitRate(): number {
    // This would need to be tracked over time
    return 0; // Placeholder implementation
  }

  // IndexedDB persistence methods
  private async loadCacheFromIndexedDB() {
    // Implementation for loading cache from IndexedDB
    // This would restore the cache after page reload
  }

  private async saveCacheToIndexedDB(key: string, image: CachedImage) {
    // Implementation for saving to IndexedDB
    // This would persist images for offline access
  }

  private setupMemoryPressureHandling() {
    // Listen for memory pressure events and clear cache if needed
    if ('addEventListener' in navigator && 'memory' in navigator) {
      (navigator as any).addEventListener('memorypressure', () => {
        this.clearCache();
        trackEvent("image_cache_cleared", { reason: "memory_pressure" });
      });
    }
  }
}

// Default configuration
const defaultConfig: ImageCacheConfig = {
  maxCacheSize: 100, // 100MB
  maxCacheEntries: 200,
  prefetchDistance: 3,
  retryAttempts: 3,
  networkTimeoutMs: 10000,
};

// Singleton instance
let imageCacheManager: ImageCacheManager | null = null;

export function getImageCacheManager(): ImageCacheManager {
  if (!imageCacheManager) {
    imageCacheManager = new ImageCacheManager(defaultConfig);
  }
  return imageCacheManager;
}

// Hook for using image cache with device awareness
export function useOptimizedImageCache() {
  const deviceProfile = useDevicePerformance();
  const { batteryStatus, audioSettings } = useBatteryAwareAudio();
  const cacheManager = getImageCacheManager();

  // Update cache manager with current device and battery settings
  React.useEffect(() => {
    cacheManager.setDeviceProfile(deviceProfile);
  }, [deviceProfile, cacheManager]);

  React.useEffect(() => {
    cacheManager.setBatterySettings(audioSettings);
  }, [audioSettings, cacheManager]);

  return {
    getOptimizedImageUrl: cacheManager.getOptimizedImageUrl.bind(cacheManager),
    preloadImages: cacheManager.preloadImages.bind(cacheManager),
    clearCache: cacheManager.clearCache.bind(cacheManager),
    getCacheStats: cacheManager.getCacheStats.bind(cacheManager),
  };
}