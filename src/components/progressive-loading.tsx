"use client";

import React, { useState, useEffect, useRef, ReactNode } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";

// Progressive content loading hook
export function useProgressiveLoading<T>({
  loadData,
  chunkSize = 10,
  initialDelay = 100,
  subsequentDelay = 50,
}: {
  loadData: () => Promise<T[]>;
  chunkSize?: number;
  initialDelay?: number;
  subsequentDelay?: number;
}) {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const deviceProfile = useDevicePerformance();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Adjust chunk size based on device performance
  const adaptiveChunkSize = deviceProfile.isLowEndDevice ? Math.max(chunkSize / 2, 3) : chunkSize;
  const adaptiveDelay = deviceProfile.isLowEndDevice ? subsequentDelay * 2 : subsequentDelay;

  useEffect(() => {
    let isMounted = true;
    abortControllerRef.current = new AbortController();

    const loadProgressively = async () => {
      try {
        // Load all data first
        const allData = await loadData();
        
        if (!isMounted || abortControllerRef.current?.signal.aborted) return;

        // Load in chunks progressively
        for (let i = 0; i < allData.length; i += adaptiveChunkSize) {
          if (!isMounted || abortControllerRef.current?.signal.aborted) break;

          const chunk = allData.slice(i, i + adaptiveChunkSize);
          
          // Add chunk to displayed data
          setData(prev => [...prev, ...chunk]);
          
          // Delay between chunks (except for first chunk)
          if (i === 0) {
            await new Promise(resolve => setTimeout(resolve, initialDelay));
          } else {
            await new Promise(resolve => setTimeout(resolve, adaptiveDelay));
          }
        }
        
        setHasMore(false);
      } catch (error) {
        console.warn('Progressive loading error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgressively();

    return () => {
      isMounted = false;
      abortControllerRef.current?.abort();
    };
  }, [loadData, adaptiveChunkSize, adaptiveDelay, initialDelay]);

  const loadMore = () => {
    // This would be used for manual \"load more\" functionality
    // Currently handled automatically
  };

  return { data, isLoading, hasMore, loadMore };
}

// Progressive list component
interface ProgressiveListProps<T> {
  loadData: () => Promise<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  renderSkeleton: () => ReactNode;
  chunkSize?: number;
  className?: string;
}

export function ProgressiveList<T>({
  loadData,
  renderItem,
  renderSkeleton,
  chunkSize = 8,
  className = ""
}: ProgressiveListProps<T>) {
  const { data, isLoading, hasMore } = useProgressiveLoading({ 
    loadData, 
    chunkSize 
  });
  const deviceProfile = useDevicePerformance();

  // Show more skeletons for low-end devices to indicate loading
  const skeletonCount = deviceProfile.isLowEndDevice ? chunkSize / 2 : chunkSize;

  return (
    <div className={className}>
      {/* Render loaded items */}
      {data.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {/* Render loading skeletons */}
      {(isLoading || hasMore) && (
        <>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div key={`skeleton-${i}`}>
              {renderSkeleton()}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Progressive grid component
interface ProgressiveGridProps<T> {
  loadData: () => Promise<T[]>;
  renderItem: (item: T, index: number) => ReactNode;
  renderSkeleton: () => ReactNode;
  chunkSize?: number;
  className?: string;
  gridCols?: number;
}

export function ProgressiveGrid<T>({
  loadData,
  renderItem,
  renderSkeleton,
  chunkSize = 6,
  className = "",
  gridCols = 2
}: ProgressiveGridProps<T>) {
  const { data, isLoading, hasMore } = useProgressiveLoading({ 
    loadData, 
    chunkSize 
  });
  const deviceProfile = useDevicePerformance();

  // Adjust grid columns for low-end devices
  const adaptiveGridCols = deviceProfile.isLowEndDevice ? Math.max(gridCols - 1, 1) : gridCols;
  const skeletonCount = deviceProfile.isLowEndDevice ? chunkSize / 2 : chunkSize;

  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4"
  };

  return (
    <div className={`grid ${gridClasses[adaptiveGridCols as keyof typeof gridClasses]} gap-4 ${className}`}>
      {/* Render loaded items */}
      {data.map((item, index) => (
        <div key={index}>
          {renderItem(item, index)}
        </div>
      ))}
      
      {/* Render loading skeletons */}
      {(isLoading || hasMore) && (
        <>
          {Array.from({ length: skeletonCount }, (_, i) => (
            <div key={`skeleton-${i}`}>
              {renderSkeleton()}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// Intersection observer hook for lazy loading
export function useIntersectionObserver({
  threshold = 0.1,
  rootMargin = "50px",
  enabled = true
}) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);
  const deviceProfile = useDevicePerformance();

  // Adjust root margin based on device performance
  const adaptiveRootMargin = deviceProfile.isLowEndDevice ? "25px" : rootMargin;

  useEffect(() => {
    if (!enabled || !targetRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: adaptiveRootMargin
      }
    );

    observer.observe(targetRef.current);

    return () => observer.disconnect();
  }, [enabled, threshold, adaptiveRootMargin]);

  return { targetRef, isIntersecting };
}

// Progressive section component that loads when visible
interface ProgressiveSectionProps {
  children: ReactNode;
  fallback?: ReactNode;
  threshold?: number;
  rootMargin?: string;
  className?: string;
}

export function ProgressiveSection({
  children,
  fallback,
  threshold = 0.1,
  rootMargin = "100px",
  className = ""
}: ProgressiveSectionProps) {
  const { targetRef, isIntersecting } = useIntersectionObserver({
    threshold,
    rootMargin
  });
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isIntersecting && !hasLoaded) {
      setHasLoaded(true);
    }
  }, [isIntersecting, hasLoaded]);

  return (
    <div ref={targetRef} className={className}>
      {hasLoaded ? children : fallback}
    </div>
  );
}