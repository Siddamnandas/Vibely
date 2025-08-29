"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useOptimizedImageCache } from "@/lib/image-cache";
import { track as trackEvent } from "@/lib/analytics";

interface AdaptiveImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  className?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  loading?: "lazy" | "eager";
  onLoad?: () => void;
  onError?: () => void;
  fallbackSrc?: string;
}

export function AdaptiveImage({
  src,
  alt,
  width,
  height,
  fill,
  className,
  priority = false,
  sizes,
  quality: providedQuality,
  placeholder,
  blurDataURL,
  loading: providedLoading,
  onLoad,
  onError,
  fallbackSrc,
  ...props
}: AdaptiveImageProps) {
  const deviceProfile = useDevicePerformance();
  const { getOptimizedImageUrl, preloadImages } = useOptimizedImageCache();
  const [imageSrc, setImageSrc] = useState(src);
  const [optimizedSrc, setOptimizedSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [cacheHit, setCacheHit] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const loadStartTime = useRef<number>(Date.now());

  // Adaptive quality based on device performance
  const adaptiveQuality = providedQuality || getAdaptiveQuality(deviceProfile.maxImageQuality);

  // Adaptive loading behavior
  const adaptiveLoading =
    providedLoading || (deviceProfile.shouldUseLazyLoading ? "lazy" : "eager");

  // Load optimized image from cache
  useEffect(() => {
    let isMounted = true;

    const loadOptimizedImage = async () => {
      try {
        loadStartTime.current = Date.now();

        const optimizedUrl = await getOptimizedImageUrl(imageSrc, {
          priority: priority ? "high" : "medium",
          quality: deviceProfile.maxImageQuality,
          format: "auto",
        });

        if (isMounted) {
          setOptimizedSrc(optimizedUrl);
          setCacheHit(true);
        }
      } catch (error) {
        console.warn("Failed to load optimized image:", error);
        if (isMounted) {
          setOptimizedSrc(imageSrc); // Fallback to original
          setCacheHit(false);
        }
      }
    };

    if (imageSrc && !deviceProfile.isLowEndDevice) {
      loadOptimizedImage();
    } else {
      setOptimizedSrc(imageSrc);
      setCacheHit(false);
    }

    return () => {
      isMounted = false;
    };
  }, [imageSrc, deviceProfile, getOptimizedImageUrl, priority]);

  // Handle image load
  const handleLoad = () => {
    const loadTime = Date.now() - loadStartTime.current;
    setIsLoading(false);

    // Track image load performance
    trackEvent("optimized_image_loaded", {
      load_time: loadTime,
      cache_hit: cacheHit,
      device_tier: deviceProfile.tier,
      quality: deviceProfile.maxImageQuality,
      network_type: deviceProfile.connectionType,
      was_adaptive: true,
    });

    onLoad?.();
  };

  // Handle image error with fallback
  const handleError = () => {
    setHasError(true);
    setIsLoading(false);

    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }

    onError?.();
  };

  // Progressive loading for low-end devices
  useEffect(() => {
    if (deviceProfile.isLowEndDevice && !priority) {
      // Delay image loading for low-end devices to improve perceived performance
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [deviceProfile.isLowEndDevice, priority]);

  // Intersection Observer for lazy loading enhancement
  useEffect(() => {
    if (!deviceProfile.shouldUseLazyLoading || priority) return;

    const img = imgRef.current;
    if (!img) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading when image comes into view
            setIsLoading(false);
            observer.unobserve(img);
          }
        });
      },
      {
        rootMargin: "100px", // Start loading 100px before image is visible
        threshold: 0.1,
      },
    );

    observer.observe(img);

    return () => observer.disconnect();
  }, [deviceProfile.shouldUseLazyLoading, priority]);

  const imageProps = {
    src: optimizedSrc || imageSrc,
    alt,
    className: `${className || ""} ${isLoading ? "opacity-50" : "opacity-100"} transition-opacity duration-300`,
    quality: adaptiveQuality,
    loading: adaptiveLoading,
    onLoad: handleLoad,
    onError: handleError,
    ref: imgRef,
    ...props,
  };

  if (fill) {
    return (
      <div className="relative w-full h-full">
        <Image {...imageProps} alt={props.alt || ""} fill sizes={sizes || "100vw"} />
        {/* Loading skeleton for low-end devices */}
        {isLoading && deviceProfile.isLowEndDevice && (
          <div className="absolute inset-0 bg-white/10 animate-pulse" />
        )}
        {/* Error state */}
        {hasError && !fallbackSrc && (
          <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
            <div className="text-white/50 text-xs">Image unavailable</div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height }}>
      <Image {...imageProps} alt={props.alt || ""} width={width} height={height} />
      {/* Loading skeleton for low-end devices */}
      {isLoading && deviceProfile.isLowEndDevice && (
        <div className="absolute inset-0 bg-white/10 animate-pulse" style={{ width, height }} />
      )}
      {/* Error state */}
      {hasError && !fallbackSrc && (
        <div
          className="absolute inset-0 bg-white/5 flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-white/50 text-xs">Image unavailable</div>
        </div>
      )}
    </div>
  );
}

function getAdaptiveQuality(maxImageQuality: "high" | "medium" | "low"): number {
  switch (maxImageQuality) {
    case "high":
      return 90;
    case "medium":
      return 75;
    case "low":
      return 60;
    default:
      return 75;
  }
}
