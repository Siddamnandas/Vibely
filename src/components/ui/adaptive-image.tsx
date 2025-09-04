"use client";

import React, { useState, useCallback } from "react";
import Image, { ImageProps } from "next/image";

interface AdaptiveImageProps extends Omit<ImageProps, "onLoad" | "onError"> {
  fallbackSrc?: string;
  placeholder?: "blur" | "empty";
  blurDataURL?: string;
  onLoadComplete?: () => void;
}

/**
 * AdaptiveImage component that handles loading states and fallbacks
 */
export function AdaptiveImage({
  src,
  alt,
  fallbackSrc,
  onLoadComplete,
  className = "",
  ...props
}: AdaptiveImageProps) {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoadComplete?.();
  }, [onLoadComplete]);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);

    // Try fallback image if available
    if (fallbackSrc && imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(false);
      setIsLoading(true);
    }
  }, [fallbackSrc, imageSrc]);

  // Show placeholder while loading
  if (isLoading && !hasError) {
    return (
      <div
        className={`animate-pulse bg-white/10 ${className}`}
        style={{ width: props.width || "100%", height: props.height || "100%" }}
      />
    );
  }

  // Show fallback if error occurred and no fallback worked
  if (hasError) {
    return (
      <div
        className={`bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center text-white/50 text-sm ${className}`}
        style={{ width: props.width || "100%", height: props.height || "100%" }}
      >
        <span>Image unavailable</span>
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      className={className}
      onLoad={handleLoad}
      onError={handleError}
    />
  );
}
