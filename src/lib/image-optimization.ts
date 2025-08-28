/**
 * Image Optimization Utilities
 * Handles image lazy loading, caching, and optimization for Vibely app
 */

import React from "react";

// Image cache for storing processed images
class ImageCache {
  private cache = new Map<string, string>();
  private maxSize = 50; // Max cached images

  set(key: string, value: string) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  get(key: string): string | undefined {
    const value = this.cache.get(key);
    if (value) {
      // Move to end (LRU)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear() {
    this.cache.clear();
  }
}

export const imageCache = new ImageCache();

// Lazy image loader with intersection observer
export class LazyImageLoader {
  private observer: IntersectionObserver | null = null;
  private imageElements = new Set<HTMLImageElement>();

  constructor() {
    if (typeof window !== "undefined") {
      this.setupObserver();
    }
  }

  private setupObserver() {
    const options = {
      root: null,
      rootMargin: "50px",
      threshold: 0.1,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          this.loadImage(img);
        }
      });
    }, options);
  }

  private async loadImage(img: HTMLImageElement) {
    const src = img.dataset.src;
    if (!src) return;

    try {
      // Check cache first
      const cachedSrc = imageCache.get(src);
      if (cachedSrc) {
        img.src = cachedSrc;
        img.classList.add("loaded");
        this.observer?.unobserve(img);
        return;
      }

      // Create optimized version
      const optimizedSrc = await this.optimizeImage(src);
      imageCache.set(src, optimizedSrc);

      img.src = optimizedSrc;
      img.classList.add("loaded");
      this.observer?.unobserve(img);
    } catch (error) {
      console.warn("Failed to load image:", src, error);
      // Fallback to original
      img.src = src;
      img.classList.add("loaded");
      this.observer?.unobserve(img);
    }
  }

  private async optimizeImage(src: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            resolve(src);
            return;
          }

          // Calculate optimal dimensions
          const maxWidth = 800;
          const maxHeight = 800;
          let { width, height } = img;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }

          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.8);

          resolve(optimizedDataUrl);
        } catch (error) {
          resolve(src);
        }
      };

      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  observe(element: HTMLImageElement) {
    if (this.observer && element.dataset.src) {
      this.imageElements.add(element);
      this.observer.observe(element);
    }
  }

  unobserve(element: HTMLImageElement) {
    if (this.observer) {
      this.imageElements.delete(element);
      this.observer.unobserve(element);
    }
  }

  disconnect() {
    if (this.observer) {
      this.observer.disconnect();
      this.imageElements.clear();
    }
  }
}

export const lazyImageLoader = new LazyImageLoader();

// Image preloader for critical images
export class ImagePreloader {
  private preloadCache = new Set<string>();

  async preload(urls: string[]): Promise<void> {
    const promises = urls
      .filter((url) => !this.preloadCache.has(url))
      .map((url) => this.preloadSingle(url));

    await Promise.allSettled(promises);
  }

  private preloadSingle(url: string): Promise<void> {
    return new Promise((resolve) => {
      if (this.preloadCache.has(url)) {
        resolve();
        return;
      }

      const img = new Image();
      img.onload = () => {
        this.preloadCache.add(url);
        resolve();
      };
      img.onerror = () => {
        resolve(); // Don't fail the whole batch
      };
      img.src = url;
    });
  }
}

export const imagePreloader = new ImagePreloader();

// React hook for optimized images
export function useOptimizedImage(
  src: string,
  options?: {
    preload?: boolean;
    quality?: number;
  },
) {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [optimizedSrc, setOptimizedSrc] = React.useState<string>();

  React.useEffect(() => {
    if (!src) return;

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(false);

        // Check cache
        let finalSrc = imageCache.get(src);

        if (!finalSrc) {
          // If preload requested, use image preloader
          if (options?.preload) {
            await imagePreloader.preload([src]);
          }

          finalSrc = src; // Use original for now
          imageCache.set(src, finalSrc);
        }

        setOptimizedSrc(finalSrc);
        setLoading(false);
      } catch (err) {
        setError(true);
        setLoading(false);
        setOptimizedSrc(src); // Fallback
      }
    };

    loadImage();
  }, [src, options?.preload]);

  return {
    src: optimizedSrc || src,
    loading,
    error,
  };
}

// Utility to generate responsive image sizes
export function generateResponsiveImageProps(src: string, alt: string) {
  return {
    src,
    alt,
    sizes: "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
    loading: "lazy" as const,
    decoding: "async" as const,
    style: {
      objectFit: "cover" as const,
      transition: "opacity 0.3s ease-in-out",
    },
  };
}
