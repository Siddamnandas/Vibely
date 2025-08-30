"use client";
/* eslint-disable @next/next/no-img-element */

import React, { ComponentType, Suspense } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { lazy } from "@/lib/lazy";

// Loading fallback component
function LoadingFallback({ height = "200px" }: { height?: string }) {
  return (
    <div
      className="flex items-center justify-center bg-white/5 rounded-2xl animate-pulse"
      style={{ height }}
    >
      <div className="text-white/50 text-sm">Loading...</div>
    </div>
  );
}

// Simplified performance-optimized component that always uses lazy loading
export function PerformanceOptimizedComponent<T extends ComponentType<any>>({
  Component,
  fallbackHeight = "200px",
  ...props
}: {
  Component: () => Promise<{ default: T }>;
  fallbackHeight?: string;
} & React.ComponentProps<T>) {
  // Always use lazy loading approach to avoid conditional hook calls
  const LazyComp = React.useMemo(() => lazy(Component), [Component]);

  // For all devices, use lazy loading to avoid conditional hook issues
  return (
    <Suspense fallback={<LoadingFallback height={fallbackHeight} />}>
      <LazyComp {...(props as React.ComponentProps<T>)} />
    </Suspense>
  );
}

// Performance-optimized container for heavy sections
export function PerformanceSection({
  children,
  priority = "medium",
  className = "",
  minHeight = "auto",
}: {
  children: React.ReactNode;
  priority?: "high" | "medium" | "low";
  className?: string;
  minHeight?: string;
}) {
  const deviceProfile = useDevicePerformance();
  const [isVisible, setIsVisible] = React.useState(priority === "high");
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (priority === "high" || deviceProfile.tier === "high") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: deviceProfile.tier === "low" ? "50px" : "100px",
        threshold: 0.1,
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [priority, deviceProfile.tier]);

  return (
    <div ref={ref} className={className} style={{ minHeight }}>
      {isVisible ? (
        children
      ) : (
        <div
          className="flex items-center justify-center bg-white/5 rounded-2xl animate-pulse"
          style={{ minHeight }}
        >
          <div className="text-white/50 text-sm">Loading section...</div>
        </div>
      )}
    </div>
  );
}

// Progressive image loading component
export function ProgressiveImage({
  src,
  alt,
  className = "",
  sizes,
  priority = false,
  ...props
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
} & React.ImgHTMLAttributes<HTMLImageElement>) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const deviceProfile = useDevicePerformance();

  // Generate low-quality placeholder
  const placeholderSrc = `${src}?q=10&w=50&blur=10`;

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Low-quality placeholder */}
      <img
        src={placeholderSrc}
        alt=""
        className="absolute inset-0 w-full h-full object-cover filter blur-sm scale-110 transition-opacity duration-300"
        style={{ opacity: isLoaded ? 0 : 1 }}
      />

      {/* High-quality image */}
      <img
        src={src}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        loading={priority ? "eager" : deviceProfile.shouldUseLazyLoading ? "lazy" : "eager"}
        decoding="async"
        sizes={sizes}
        {...props}
      />

      {/* Error fallback */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white/60">
          <span className="text-sm">Image unavailable</span>
        </div>
      )}
    </div>
  );
}
