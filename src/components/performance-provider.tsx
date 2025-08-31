"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  performanceMonitor,
  PerformanceMetrics,
  createPerformanceTimer,
} from "@/lib/performance-monitor";
import { preloadCriticalComponents, analyzeBundleSize } from "@/lib/code-splitting";

interface PerformanceContextValue {
  metrics: PerformanceMetrics;
  performanceScore: number;
  trackCustomMetric: (name: string, duration: number) => void;
  createTimer: (name: string) => ReturnType<typeof createPerformanceTimer>;
}

const PerformanceContext = createContext<PerformanceContextValue | null>(null);

export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [performanceScore, setPerformanceScore] = useState(100);

  useEffect(() => {
    // Initialize performance monitoring
    const initializePerformance = async () => {
      try {
        // Mark app initialization start
        if (typeof window !== "undefined" && "performance" in window) {
          performance.mark("vibely-init-start");
        }

        // Preload critical components
        preloadCriticalComponents();

        // Analyze bundle size in development
        if (process.env.NODE_ENV === "development") {
          analyzeBundleSize();
        }

        // Set up periodic metrics updates
        const updateMetrics = () => {
          const currentMetrics = performanceMonitor.getMetrics();
          setMetrics(currentMetrics);
          setPerformanceScore(performanceMonitor.calculatePerformanceScore());
        };

        // Initial update
        updateMetrics();

        // Update metrics every 2 seconds
        const metricsInterval = setInterval(updateMetrics, 2000);

        // Performance observer for custom events
        const setupCustomObserver = () => {
          if ("PerformanceObserver" in window) {
            try {
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach((entry) => {
                  if (entry.name.startsWith("vibely-")) {
                    console.log(`📊 Custom Performance: ${entry.name}`, {
                      duration: `${Math.round(entry.duration)}ms`,
                      startTime: entry.startTime,
                    });
                  }
                });
              });

              observer.observe({ entryTypes: ["measure"] });
              return observer;
            } catch (error) {
              console.warn("Custom performance observer not supported");
            }
          }
          return null;
        };

        const customObserver = setupCustomObserver();

        // Mark app initialization complete
        setTimeout(() => {
          if (typeof window !== "undefined" && "performance" in window) {
            performance.mark("vibely-init-end");
            performance.measure("vibely-initialization", "vibely-init-start", "vibely-init-end");
          }
        }, 100);

        // Cleanup function
        // Return a cleanup function
        return () => {
          clearInterval(metricsInterval);
          if (customObserver) {
            customObserver.disconnect();
          }
          performanceMonitor.disconnect();
        };
      } catch (error) {
        console.error("Failed to initialize performance monitoring:", error);
      }
    };

    let cleanupFn: (() => void) | null = null;
    (async () => {
      cleanupFn = ((await initializePerformance()) as unknown as (() => void) | void) || null;
    })();

    return () => {
      try {
        cleanupFn?.();
      } catch {}
    };
  }, []);

  // Track memory usage and warn if high
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkMemoryUsage = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        if (usagePercentage > 80) {
          console.warn("⚠️ High memory usage detected:", {
            used: `${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`,
            limit: `${Math.round(memory.jsHeapSizeLimit / 1024 / 1024)}MB`,
            percentage: `${Math.round(usagePercentage)}%`,
          });
        }
      }
    };

    // Check memory usage every 30 seconds
    const memoryInterval = setInterval(checkMemoryUsage, 30000);

    return () => clearInterval(memoryInterval);
  }, []);

  const trackCustomMetric = React.useCallback((name: string, duration: number) => {
    if (typeof window !== "undefined" && "performance" in window) {
      // Use Performance API for custom metrics
      performance.mark(`${name}-start`);
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }

    console.log(`📊 Custom Metric: ${name}`, `${Math.round(duration)}ms`);
  }, []);

  const createTimer = React.useCallback((name: string) => {
    return createPerformanceTimer(name);
  }, []);

  const contextValue: PerformanceContextValue = {
    metrics,
    performanceScore,
    trackCustomMetric,
    createTimer,
  };

  return (
    <PerformanceContext.Provider value={contextValue}>
      {children}
      {/* Performance monitoring UI for development */}
      {process.env.NODE_ENV === "development" && (
        <PerformanceDebugPanel metrics={metrics} score={performanceScore} />
      )}
    </PerformanceContext.Provider>
  );
}

// Development-only performance debug panel
function PerformanceDebugPanel({ metrics, score }: { metrics: PerformanceMetrics; score: number }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-white px-3 py-2 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20"
        style={{ fontSize: "10px" }}
      >
        📊 {score}
      </button>

      {/* Debug panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-[9999] bg-black/90 text-white p-4 rounded-lg text-xs font-mono backdrop-blur-sm border border-white/20 max-w-xs">
          <div className="mb-2 font-bold text-green-400">Performance Metrics</div>

          <div className="space-y-1">
            <div>
              Score: <span className="text-yellow-400">{score}/100</span>
            </div>

            {metrics.LCP && (
              <div>
                LCP: <span className="text-blue-400">{Math.round(metrics.LCP)}ms</span>
              </div>
            )}

            {metrics.FID && (
              <div>
                FID: <span className="text-purple-400">{Math.round(metrics.FID)}ms</span>
              </div>
            )}

            {metrics.CLS && (
              <div>
                CLS: <span className="text-red-400">{metrics.CLS.toFixed(3)}</span>
              </div>
            )}

            {metrics.FCP && (
              <div>
                FCP: <span className="text-green-400">{Math.round(metrics.FCP)}ms</span>
              </div>
            )}

            {metrics.musicLoadTime && (
              <div>
                Music:{" "}
                <span className="text-orange-400">{Math.round(metrics.musicLoadTime)}ms</span>
              </div>
            )}
          </div>

          <div className="mt-2 pt-2 border-t border-white/20 text-[10px] text-gray-400">
            Click outside to close
          </div>
        </div>
      )}
    </>
  );
}

// Hook to use performance context
export function usePerformance() {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error("usePerformance must be used within PerformanceProvider");
  }
  return context;
}

// Hook for component-level performance tracking
export function useComponentPerformance(componentName: string) {
  const { trackCustomMetric, createTimer } = usePerformance();
  const renderTimeRef = React.useRef<number>();

  React.useEffect(() => {
    renderTimeRef.current = performance.now();
  }, []);

  React.useEffect(() => {
    return () => {
      if (renderTimeRef.current) {
        const renderTime = performance.now() - renderTimeRef.current;
        trackCustomMetric(`component-${componentName}-lifecycle`, renderTime);
      }
    };
  }, [componentName, trackCustomMetric]);

  const trackInteraction = React.useCallback(
    (interactionName: string, startTime: number) => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      trackCustomMetric(`${componentName}-${interactionName}`, duration);
    },
    [componentName, trackCustomMetric],
  );

  return {
    trackInteraction,
    createTimer: (name: string) => createTimer(`${componentName}-${name}`),
  };
}
