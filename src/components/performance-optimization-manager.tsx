"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface DeviceCapabilities {
  tier: 'low' | 'medium' | 'high' | 'ultra';
  fpsTarget: 30 | 60;
  particleCount: number;
  shaderQuality: 'simple' | 'medium' | 'high';
  preloadStrategy: 'minimal' | 'balanced' | 'aggressive';
}

export class PerformanceManager {
  private static instance: PerformanceManager;
  private capabilities: DeviceCapabilities = {
    tier: 'high',
    fpsTarget: 60,
    particleCount: 50,
    shaderQuality: 'medium',
    preloadStrategy: 'balanced'
  };

  private metrics = {
    fps: 60,
    memoryUsage: 0,
    particleCount: 0,
    renderTime: 16, // ~16ms for 60fps
    loadTime: 0
  };

  private observers: ((event: string, data?: any) => void)[] = [];

  static getInstance(): PerformanceManager {
    if (!PerformanceManager.instance) {
      PerformanceManager.instance = new PerformanceManager();
    }
    return PerformanceManager.instance;
  }

  detectCapabilities(): DeviceCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');

    const capabilities: DeviceCapabilities = {
      tier: 'medium',
      fpsTarget: 60,
      particleCount: 50,
      shaderQuality: 'medium',
      preloadStrategy: 'balanced'
    };

    // Detect mobile vs desktop
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
      capabilities.tier = 'low';
      capabilities.fpsTarget = 30;
      capabilities.particleCount = 20;
      capabilities.shaderQuality = 'simple';
    }

    // Hardware concurrency detection
    const cores = navigator.hardwareConcurrency || 4;

    if (cores >= 8) {
      capabilities.tier = 'ultra';
      capabilities.particleCount = 150;
      capabilities.shaderQuality = 'high';
      capabilities.preloadStrategy = 'aggressive';
    } else if (cores >= 6) {
      capabilities.tier = 'high';
      capabilities.particleCount = 80;
      capabilities.shaderQuality = 'high';
    }

    // Memory detection (rough estimate)
    if ('memory' in performance) {
      try {
        const memory = (performance as any).memory;
        if (memory.totalJSHeapSize > 500 * 1024 * 1024) { // > 500MB
          capabilities.tier = 'high';
        }
      } catch (e) {
        // memory API not available
      }
    }

    // WebGL capabilities
    if (gl) {
      try {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          if (renderer && (renderer.includes('X11') || renderer.includes('NVIDIA'))) {
            capabilities.tier = 'ultra';
            capabilities.shaderQuality = 'high';
            capabilities.particleCount = 200;
          }
        }
      } catch (e) {
        // WebGL detection failed
      }
    }

    this.capabilities = capabilities;
    return capabilities;
  }

  // Adaptive particle count adjustment
  adjustParticleCount(currentFps: number): number {
    const targetFps = this.capabilities.fpsTarget;
    const variance = Math.abs(currentFps - targetFps) / targetFps;

    if (variance > 0.3) { // > 30% fps variance
      const adjustment = variance * (this.capabilities.particleCount * 0.3);
      return Math.max(10, currentFps < targetFps
        ? this.capabilities.particleCount - adjustment
        : this.capabilities.particleCount + adjustment * 0.5
      );
    }

    return this.capabilities.particleCount;
  }

  // Memory management hook
  enforceMemoryLimits() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      if (memory.usedJSHeapSize > memory.totalJSHeapSize * 0.8) {
        // Force garbage collection if possible
        if (window.gc && typeof window.gc === 'function') {
          window.gc();
        }

        // Dispatch memory pressure event
        this.emit('memory-pressure', memory);
      }
    }
  }

  // FPS monitoring and adjustment
  monitorFps(callback: (fps: number) => void): () => void {
    let lastTime = performance.now();
    let frameCount = 0;

    const monitor = () => {
      const currentTime = performance.now();
      frameCount++;

      // Update FPS every 1 second
      if (currentTime - lastTime >= 1000) {
        const fps = frameCount / ((currentTime - lastTime) / 1000);
        this.metrics.fps = fps;
        callback(fps);
        frameCount = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(monitor);
    };

    const frameId = requestAnimationFrame(monitor);

    return () => {
      cancelAnimationFrame(frameId);
    };
  }

  // Optimization strategies
  getOptimizationSettings() {
    const { tier } = this.capabilities;

    const optimizations = {
      low: {
        particles: false,
        complexShaders: false,
        highFrequencyUpdates: false,
        backgroundAnimations: 'minimal'
      },
      medium: {
        particles: 'simple',
        complexShaders: false,
        highFrequencyUpdates: true,
        backgroundAnimations: 'balanced'
      },
      high: {
        particles: 'enhanced',
        complexShaders: true,
        highFrequencyUpdates: true,
        backgroundAnimations: 'full'
      },
      ultra: {
        particles: 'ultra',
        complexShaders: true,
        highFrequencyUpdates: true,
        backgroundAnimations: 'full'
      }
    };

    return optimizations[tier] || optimizations.medium;
  }

  // Event system
  on(event: string, callback: (data?: any) => void) {
    this.observers.push((e: string, data?: any) => {
      if (e === event) callback(data);
    });
  }

  private emit(event: string, data?: any) {
    this.observers.forEach(observer => observer(event, data));
  }

  // Public getters for private properties
  getMetrics() {
    return { ...this.metrics };
  }

  getCapabilities() {
    return { ...this.capabilities };
  }

  emitEvent(event: string, data?: any) {
    this.emit(event, data);
  }
}

// Adaptive Performance Hook
export function useAdaptivePerformance() {
  const [capabilities, setCapabilities] = useState<DeviceCapabilities>({
    tier: 'medium',
    fpsTarget: 60,
    particleCount: 50,
    shaderQuality: 'medium',
    preloadStrategy: 'balanced'
  });

  useEffect(() => {
    const pm = PerformanceManager.getInstance();
    const detected = pm.detectCapabilities();
    setCapabilities(detected);

    // Memory monitoring
    const interval = setInterval(() => {
      pm.enforceMemoryLimits();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return capabilities;
}

// Optimized Canvas Component
export function OptimizedCanvas({ children, className }: { children: React.ReactNode, className?: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px'
      }
    );

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={canvasRef}
      className={`${className} ${isVisible ? 'optimize-visible' : 'optimize-hidden'}`}
      style={{
        willChange: isVisible ? 'transform, opacity' : 'auto',
        backfaceVisibility: 'hidden',
        perspective: 1000
      }}
    >
      {isVisible && children}
    </div>
  );
}

// Loading State Manager
export function LoadingManager({ children, isLoading, fallback }: {
  children: React.ReactNode;
  isLoading: boolean;
  fallback?: React.ReactNode;
}) {
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    if (isLoading) {
      let progress = 0;
      const interval = setInterval(() => {
        progress = Math.min(90, progress + Math.random() * 10);
        setLoadProgress(progress);
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isLoading]);

  if (!isLoading) return <>{children}</>;

  if (fallback) return <>{fallback}</>;

  return (
    <motion.div
      className="fixed inset-0 bg-black/90 backdrop-blur-xl flex items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center">
        <motion.div
          className="w-20 h-20 border-4 border-purple-400/50 border-t-purple-400 rounded-full mb-6"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />

        <motion.div
          className="text-white text-2xl font-bold mb-4"
          animate={{
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
          }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{
            backgroundImage: 'linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            color: 'transparent'
          }}
        >
          Loading Vibes...
        </motion.div>

        <motion.div
          className="w-80 h-2 bg-white/20 rounded-full overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <motion.div
            className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 rounded-full"
            style={{ width: `${loadProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>

        <motion.p
          className="text-white/60 mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          Crafting your musical experience...
        </motion.p>
      </div>
    </motion.div>
  );
}

// Error Boundary Component
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): { hasError: boolean; error: Error } {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Player Error:', error, errorInfo);

    // Send error analytics
    const pm = PerformanceManager.getInstance();
    pm.emitEvent('error', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return <>{this.props.fallback}</>;

      return (
        <motion.div
          className="bg-red-900/20 backdrop-blur-xl border border-red-500/50 rounded-2xl p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h3 className="text-white text-xl font-bold mb-2">Oops! Something went wrong</h3>
          <p className="text-white/70 mb-6">
            Your music experience encountered an issue, but don't worry - we're fixing it!
          </p>

          <motion.button
            className="px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white font-semibold rounded-xl transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
          >
            Reload Player
          </motion.button>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Performance Stats Component
export function PerformanceStats({ show }: { show: boolean }) {
  const [stats, setStats] = useState({
    fps: 0,
    memory: 0,
    particles: 0,
    renderTime: 0
  });

  useEffect(() => {
    if (!show) return;

    const pm = PerformanceManager.getInstance();

    const cleanup = pm.monitorFps((fps) => {
      setStats(prev => ({ ...prev, fps: Math.round(fps) }));
    });

    // Update memory stats
    const memoryInterval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setStats(prev => ({
          ...prev,
          memory: Math.round(memory.usedJSHeapSize / 1024 / 1024)
        }));
      }
    }, 2000);

    return () => {
      cleanup();
      clearInterval(memoryInterval);
    };
  }, [show]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed top-4 right-4 bg-black/80 backdrop-blur-xl border border-white/20 rounded-xl p-4 text-white text-sm font-mono"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.3 }}
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-white/60">FPS</div>
          <div className={`font-bold ${stats.fps >= 55 ? 'text-green-400' : stats.fps >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
            {stats.fps}
          </div>
        </div>

        <div>
          <div className="text-white/60">Memory</div>
          <div className={`font-bold ${stats.memory < 50 ? 'text-green-400' : stats.memory < 100 ? 'text-yellow-400' : 'text-red-400'}`}>
            {stats.memory}MB
          </div>
        </div>

        <div>
          <div className="text-white/60">Target</div>
          <div className="font-bold text-cyan-400">60fps</div>
        </div>

        <div>
          <div className="text-white/60">Device</div>
          <div className="font-bold text-purple-400">Adaptive</div>
        </div>
      </div>
    </motion.div>
  );
}

// Performance monitoring React component
export function usePerformance() {
  const pm = PerformanceManager.getInstance();
  const [performanceMetrics, setPerformanceMetrics] = useState(pm.getMetrics());

  useEffect(() => {
    const updateMetrics = () => {
      setPerformanceMetrics(pm.getMetrics());
    };

    // Update every second
    const interval = setInterval(updateMetrics, 1000);

    return () => clearInterval(interval);
  }, []);

  return performanceMetrics;
}
