/**
 * Advanced Image Caching System for Vibely
 * Intelligent caching with LRU eviction, format optimization, and progressive loading
 */

interface CachedImage {
  url: string;
  blob?: Blob;
  dataUrl?: string;
  lastAccessed: number;
  size: number;
  format: "webp" | "png" | "jpg" | "avif";
  quality: number;
  resolution: "thumbnail" | "medium" | "full" | "original";
  metadata?: {
    width: number;
    height: number;
    aspectRatio: number;
    dominantColor?: string;
  };
}

interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  maxItems: number; // Maximum number of cached items
  ttl: number; // Time to live in milliseconds
  compressionLevel: "high" | "balanced" | "quality";
  enableProgressive: boolean;
  enableWebP: boolean;
  enableAvif: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 500, // 500MB cache
  maxItems: 1000,
  ttl: 7 * 24 * 60 * 60 * 1000, // 7 days
  compressionLevel: "balanced",
  enableProgressive: true,
  enableWebP: true,
  enableAvif: false, // Disabled by default due to browser support
};

export class ImageCacheManager {
  private static instance: ImageCacheManager;
  private cache: Map<string, CachedImage> = new Map();
  private config: CacheConfig = DEFAULT_CONFIG;
  private accessOrder: string[] = [];

  constructor(config?: Partial<CacheConfig>) {
    if (ImageCacheManager.instance) {
      return ImageCacheManager.instance;
    }

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.init();
    ImageCacheManager.instance = this;
  }

  private init() {
    // Load cache metadata from localStorage if available
    this.loadCacheMetadata();

    // Set up cache cleanup interval
    setInterval(() => this.cleanup(), 5 * 60 * 1000); // Every 5 minutes

    // Listen for memory pressure
    if (typeof navigator !== "undefined" && "deviceMemory" in navigator) {
      this.adjustForDeviceMemory();
    }
  }

  /**
   * Store image in cache with optimizations
   */
  async store(key: string, imageData: Blob | string, metadata?: any): Promise<void> {
    try {
      const size = this.getDataSize(imageData);

      // Check if we need to make room
      if (!this.hasCapacity(size)) {
        this.evictToCapacity();
      }

      // Optimize image format and compression
      const optimizedImage = await this.optimizeImage(imageData);

      const cacheEntry: CachedImage = {
        url: typeof imageData === "string" ? imageData : "",
        blob: optimizedImage.blob,
        dataUrl: optimizedImage.dataUrl,
        lastAccessed: Date.now(),
        size: optimizedImage.size,
        format: optimizedImage.format,
        quality: optimizedImage.quality,
        resolution: metadata?.resolution || "medium",
        metadata: {
          width: metadata?.width || 0,
          height: metadata?.height || 0,
          aspectRatio: (metadata?.width || 1) / (metadata?.height || 1),
          dominantColor: metadata?.dominantColor,
        },
      };

      this.cache.set(key, cacheEntry);
      this.updateAccessOrder(key);
      this.saveCacheMetadata();

      // Prefetch related sizes if needed
      if (metadata?.isOriginal && !this.cache.has(`${key}_thumbnail`)) {
        this.generateThumbnail(key, optimizedImage.blob!);
      }
    } catch (error) {
      console.warn("Image cache store failed:", error);
    }
  }

  /**
   * Retrieve cached image with format preference
   */
  async retrieve(key: string): Promise<CachedImage | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Update access order
    entry.lastAccessed = Date.now();
    this.updateAccessOrder(key);
    this.saveCacheMetadata();

    return entry;
  }

  /**
   * Get optimized URL for display with progressive loading
   */
  async getOptimizedUrl(
    key: string,
    resolution: "thumbnail" | "medium" | "full" = "medium",
    format?: "webp" | "png" | "jpg" | "avif",
  ): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    // Generate specific resolution if not available
    const resolutionKey = `${key}_${resolution}`;
    if (!this.cache.has(resolutionKey) && entry.blob) {
      await this.generateResolution(resolutionKey, entry.blob, resolution);
    }

    const resolutionEntry = this.cache.get(resolutionKey) || entry;

    // Return preferred format
    if (format && format !== resolutionEntry.format) {
      return await this.convertFormat(resolutionEntry.blob!, format);
    }

    return resolutionEntry.dataUrl || resolutionEntry.url;
  }

  /**
   * Progressive image loading with blur-to-clear effect
   */
  async getProgressiveImage(
    key: string,
    onLoad?: (url: string) => void,
  ): Promise<{
    thumbnail: string;
    full: string;
    loadProgress: Promise<void>;
  }> {
    const entry = this.cache.get(key);
    if (!entry) {
      throw new Error("Image not in cache");
    }

    const fullUrl = entry.dataUrl || entry.url;

    // Generate or retrieve thumbnail
    const thumbnailKey = `${key}_thumbnail`;
    let thumbnailUrl: string;

    if (this.cache.has(thumbnailKey)) {
      thumbnailUrl = this.cache.get(thumbnailKey)!.dataUrl!;
    } else {
      thumbnailUrl = await this.generateProgressiveThumbnail(entry.blob!);
      this.store(thumbnailKey, thumbnailUrl);
    }

    // Progressive loading promise
    const loadProgress = new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        onLoad?.(fullUrl);
        resolve();
      };
      img.src = fullUrl;
    });

    return {
      thumbnail: thumbnailUrl,
      full: fullUrl,
      loadProgress,
    };
  }

  /**
   * Preload images with priority system
   */
  async preloadImages(
    imageKeys: string[],
    priority: "high" | "medium" | "low" = "medium",
  ): Promise<void> {
    const promises = imageKeys.map(async (key, index) => {
      // Add delay for staggered loading to avoid overwhelming network
      if (priority === "low") {
        await new Promise((resolve) => setTimeout(resolve, index * 100));
      }

      const entry = await this.retrieve(key);
      if (!entry) {
        // Try to fetch from network cache
        return this.prefetchFromNetwork(key);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Advanced memory management
   */
  getCacheStats() {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    const oldestEntry = entries.reduce(
      (oldest, entry) => (entry.lastAccessed < oldest.lastAccessed ? entry : oldest),
      entries[0],
    );

    return {
      itemsCount: this.cache.size,
      totalSize: Math.round(totalSize / (1024 * 1024)), // MB
      maxSize: this.config.maxSize,
      utilization: Math.round((totalSize / (this.config.maxSize * 1024 * 1024)) * 100),
      oldestEntry: oldestEntry?.lastAccessed,
      formatDistribution: this.getFormatDistribution(),
    };
  }

  /**
   * Intelligent cache cleanup
   */
  async cleanup(): Promise<number> {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    let deletedCount = 0;

    // Remove expired entries
    const expiredEntries = entries.filter(
      ([, entry]) => now - entry.lastAccessed > this.config.ttl,
    );

    for (const [key] of expiredEntries) {
      this.cache.delete(key);
      deletedCount++;
    }

    // Remove entries if over capacity (LRU eviction)
    if (!this.hasCapacity(0)) {
      const entriesByAccessTime: [string, CachedImage][] = Array.from(this.cache.entries()).sort(
        ([, a], [, b]) => (a as CachedImage).lastAccessed - (b as CachedImage).lastAccessed,
      );

      for (const [key, entry] of entriesByAccessTime) {
        if (this.hasCapacity(0)) break;
        this.cache.delete(key);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      this.updateAccessOrderAfterCleanup();
      this.saveCacheMetadata();
    }

    return deletedCount;
  }

  // Private helper methods

  private async optimizeImage(imageData: Blob | string): Promise<{
    blob: Blob;
    dataUrl: string;
    size: number;
    format: "webp" | "png" | "jpg" | "avif";
    quality: number;
  }> {
    // For now, return basic optimization. In production, use libraries like sharp
    const blob = typeof imageData === "string" ? await this.urlToBlob(imageData) : imageData;
    const dataUrl = await this.blobToDataUrl(blob);

    let format: "webp" | "png" | "jpg" | "avif" = "png";
    if (this.config.enableWebP && this.supportsWebP()) {
      format = "webp";
    }

    return {
      blob,
      dataUrl,
      size: blob.size,
      format,
      quality: this.getQualityForFormat(format),
    };
  }

  private async generateThumbnail(key: string, blob: Blob): Promise<void> {
    // In production, use canvas or image processing library to resize
    const thumbnailBlob = blob; // Placeholder - would resize to 150x150
    await this.store(`${key}_thumbnail`, thumbnailBlob, { resolution: "thumbnail" });
  }

  private async generateResolution(key: string, blob: Blob, resolution: string): Promise<void> {
    // Placeholder for resolution generation
    await this.store(key, blob, { resolution });
  }

  private async convertFormat(blob: Blob, format: string): Promise<string> {
    // Placeholder for format conversion
    return this.blobToDataUrl(blob);
  }

  private getDataSize(data: Blob | string): number {
    if (typeof data === "string") {
      // Rough estimate for base64 URLs
      return Math.floor(data.length * 0.75);
    }
    return data.size;
  }

  private hasCapacity(additionalSize: number): boolean {
    const currentSize = Array.from(this.cache.values()).reduce((sum, entry) => sum + entry.size, 0);

    return (
      currentSize + additionalSize < this.config.maxSize * 1024 * 1024 &&
      this.cache.size < this.config.maxItems
    );
  }

  private evictToCapacity(): void {
    // LRU eviction
    const entries: [string, CachedImage][] = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => (a as CachedImage).lastAccessed - (b as CachedImage).lastAccessed,
    );

    // Remove oldest entries until we have capacity
    for (const [key] of entries) {
      this.cache.delete(key);
      if (this.hasCapacity(0)) break;
    }
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  private updateAccessOrderAfterCleanup(): void {
    this.accessOrder = this.accessOrder.filter((key) => this.cache.has(key));
  }

  private supportsWebP(): boolean {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    return canvas.toDataURL("image/webp").indexOf("image/webp") === 5;
  }

  private getQualityForFormat(format: string): number {
    const qualities = {
      webp: 0.85,
      png: 0.9,
      jpg: 0.8,
      avif: 0.9,
    };
    return qualities[format as keyof typeof qualities] || 0.8;
  }

  private async urlToBlob(url: string): Promise<Blob> {
    const response = await fetch(url);
    return response.blob();
  }

  private async blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private async generateProgressiveThumbnail(blob: Blob): Promise<string> {
    // Placeholder - in production, would generate tiny thumbnail
    return this.blobToDataUrl(blob);
  }

  private async prefetchFromNetwork(key: string): Promise<void> {
    try {
      // Implement network prefetching logic
      console.log("Prefetching from network:", key);
    } catch (error) {
      console.warn("Network prefetch failed:", error);
    }
  }

  private adjustForDeviceMemory(): void {
    // @ts-ignore - deviceMemory is not in official types
    const deviceMemory = navigator.deviceMemory;
    if (deviceMemory) {
      if (deviceMemory < 2) {
        // Low memory device
        this.config.maxSize = Math.max(this.config.maxSize * 0.3, 100);
        this.config.maxItems = Math.max(this.config.maxItems * 0.3, 200);
      } else if (deviceMemory >= 8) {
        // High memory device
        this.config.maxSize *= 1.5;
        this.config.maxItems *= 1.5;
      }
    }
  }

  private getFormatDistribution() {
    const formats: Record<string, number> = {};
    for (const [, entry] of this.cache) {
      formats[entry.format] = (formats[entry.format] || 0) + 1;
    }
    return formats;
  }

  private saveCacheMetadata(): void {
    if (typeof window === "undefined") return;

    try {
      const metadata = Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        lastAccessed: entry.lastAccessed,
        size: entry.size,
        format: entry.format,
        resolution: entry.resolution,
      }));

      localStorage.setItem("vibely_image_cache_metadata", JSON.stringify(metadata));
      localStorage.setItem("vibely_cache_config", JSON.stringify(this.config));
    } catch (error) {
      console.warn("Failed to save cache metadata:", error);
    }
  }

  private loadCacheMetadata(): void {
    if (typeof window === "undefined") return;

    try {
      // Load configuration
      const configStr = localStorage.getItem("vibely_cache_config");
      if (configStr) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(configStr) };
      }

      // Load metadata (but don't preload actual images)
      const metadataStr = localStorage.getItem("vibely_image_cache_metadata");
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        // We'll rebuild the cache metadata on access
      }
    } catch (error) {
      console.warn("Failed to load cache metadata:", error);
    }
  }
}

// Export singleton instance
export const imageCache = new ImageCacheManager();

// Helper functions for common use cases
export async function cacheCoverImage(coverId: string, imageUrl: string, metadata?: any) {
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  await imageCache.store(coverId, blob, metadata);
}

export async function getOptimizedCoverUrl(
  coverId: string,
  resolution: "thumbnail" | "medium" | "full" = "medium",
  format?: "webp" | "png" | "jpg",
) {
  return imageCache.getOptimizedUrl(coverId, resolution, format);
}

export async function preloadCoverImages(
  coverIds: string[],
  priority: "high" | "medium" | "low" = "medium",
) {
  return imageCache.preloadImages(coverIds, priority);
}

export function getImageCacheStats() {
  return imageCache.getCacheStats();
}
