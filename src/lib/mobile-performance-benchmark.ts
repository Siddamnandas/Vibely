/**
 * Mobile Performance Benchmarking Service
 * Measures and analyzes performance metrics across different mobile devices
 */

import { deviceCompatibilityService } from "./device-compatibility-service";

export interface PerformanceMetrics {
  deviceInfo: {
    platform: string;
    device: string;
    browser: string;
    version: string;
  };
  hardwareSpecs: {
    deviceMemory?: number;
    hardwareConcurrency?: number;
    pixelRatio: number;
    screenResolution: string;
  };
  renderingPerformance: {
    frameRate: number;
    averageFrameTime: number;
    jankFrames: number;
    paintTime: number;
    layoutTime: number;
  };
  memoryUsage: {
    initialMemory: number;
    peakMemory: number;
    memoryLeaks: number;
    garbageCollections: number;
  };
  networkPerformance: {
    connectionType: string;
    downloadSpeed: number;
    latency: number;
    resourceLoadTimes: Record<string, number>;
  };
  // Top-level shortcut used by tests
  resourceLoadTimes?: Record<string, number>;
  interactionMetrics: {
    touchLatency: number;
    scrollPerformance: number;
    gestureRecognition: number;
    inputLag: number;
  };
  batteryImpact: {
    cpuUsage: number;
    estimatedBatteryDrain: number;
    thermalState?: string;
  };
  loadTimes: {
    initialLoad: number;
    routeTransition: number;
    componentMount: number;
    imageLoad: number;
  };
  score: {
    overall: number;
    rendering: number;
    memory: number;
    network: number;
    interaction: number;
    battery: number;
  };
}

export interface BenchmarkConfig {
  duration: number; // Test duration in milliseconds
  iterations: number;
  testRoutes: string[];
  testImages: string[];
  testInteractions: Array<{
    type: "tap" | "swipe" | "pinch" | "scroll";
    target: string;
    duration: number;
  }>;
}

class MobilePerformanceBenchmark {
  private isRunning = false;
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private startTime = 0;

  /**
   * Reset benchmark state (useful for testing)
   */
  reset() {
    this.isRunning = false;
    this.metrics = {};
    this.stopPerformanceObservers();
    
    // Clean up the shared canvas element if it exists
    if ((window as any).__performanceBenchmarkCanvas) {
      try {
        // Remove the canvas from the DOM if it was added
        if ((window as any).__performanceBenchmarkCanvas.parentNode) {
          (window as any).__performanceBenchmarkCanvas.parentNode.removeChild((window as any).__performanceBenchmarkCanvas);
        }
        // Clear the reference
        (window as any).__performanceBenchmarkCanvas = null;
      } catch (error) {
        console.warn("Failed to clean up performance benchmark canvas:", error);
      }
    }
  }

  /**
   * Run comprehensive performance benchmark
   */
  async runBenchmark(config: BenchmarkConfig): Promise<PerformanceMetrics> {
    if (this.isRunning) {
      throw new Error("Benchmark already running");
    }

    this.isRunning = true;
    this.startTime = performance.now();

    try {
      console.log("🏁 Starting mobile performance benchmark...");

      // Initialize metrics
      this.metrics = {
        deviceInfo: this.getDeviceInfo(),
        hardwareSpecs: this.getHardwareSpecs(),
        renderingPerformance: {
          frameRate: 0,
          averageFrameTime: 0,
          jankFrames: 0,
          paintTime: 0,
          layoutTime: 0,
        },
        memoryUsage: {
          initialMemory: 0,
          peakMemory: 0,
          memoryLeaks: 0,
          garbageCollections: 0,
        },
        networkPerformance: {
          connectionType: "",
          downloadSpeed: 0,
          latency: 0,
          resourceLoadTimes: {},
        },
        interactionMetrics: {
          touchLatency: 0,
          scrollPerformance: 0,
          gestureRecognition: 0,
          inputLag: 0,
        },
        batteryImpact: {
          cpuUsage: 0,
          estimatedBatteryDrain: 0,
        },
        loadTimes: {
          initialLoad: 0,
          routeTransition: 0,
          componentMount: 0,
          imageLoad: 0,
        },
        score: {
          overall: 0,
          rendering: 0,
          memory: 0,
          network: 0,
          interaction: 0,
          battery: 0,
        },
      };

      // Start performance observers
      this.startPerformanceObservers();

      // Run benchmarks in parallel where possible
      const results = await Promise.allSettled([
        this.benchmarkRendering(config),
        this.benchmarkMemory(config),
        this.benchmarkNetwork(config),
        this.benchmarkInteractions(config),
        this.benchmarkLoadTimes(config),
      ]);

      // Check for failed benchmarks
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          console.warn(`Benchmark ${index} failed:`, result.reason);
        }
      });

      // Measure battery impact
      await this.benchmarkBattery(config);

      // Calculate final scores
      this.calculateScores();

      console.log("✅ Performance benchmark completed");
      return this.metrics as PerformanceMetrics;
    } finally {
      this.stopPerformanceObservers();
      this.isRunning = false;
    }
  }

  /**
   * Get device information
   */
  private getDeviceInfo() {
    const deviceInfo = deviceCompatibilityService.getDeviceInfo();
    return {
      platform: deviceInfo.platform,
      device: deviceInfo.device,
      browser: deviceInfo.browser,
      version: deviceInfo.version,
    };
  }

  /**
   * Get hardware specifications
   */
  private getHardwareSpecs() {
    return {
      deviceMemory: (navigator as any).deviceMemory,
      hardwareConcurrency: navigator.hardwareConcurrency,
      pixelRatio: window.devicePixelRatio,
      screenResolution: `${screen.width}x${screen.height}`,
    };
  }

  /**
   * Start performance observers
   */
  private startPerformanceObservers() {
    try {
      // Frame timing observer
      const frameObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "frame") {
            this.updateRenderingMetrics(entry as any);
          }
        });
      });

      if ("frame" in PerformanceObserver.supportedEntryTypes) {
        frameObserver.observe({ entryTypes: ["frame"] });
        this.observers.push(frameObserver);
      }

      // Paint observer
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.name === "first-contentful-paint") {
            this.metrics.loadTimes!.initialLoad = entry.startTime;
          }
        });
      });

      paintObserver.observe({ entryTypes: ["paint"] });
      this.observers.push(paintObserver);

      // Navigation observer
      const navObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === "navigation") {
            const navEntry = entry as PerformanceNavigationTiming;
            this.metrics.loadTimes!.initialLoad = navEntry.loadEventEnd - navEntry.fetchStart;
          }
        });
      });

      navObserver.observe({ entryTypes: ["navigation"] });
      this.observers.push(navObserver);
    } catch (error) {
      console.warn("Failed to start some performance observers:", error);
    }
  }

  /**
   * Stop performance observers
   */
  private stopPerformanceObservers() {
    this.observers.forEach((observer) => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn("Failed to disconnect observer:", error);
      }
    });
    this.observers = [];
  }

  /**
   * Update rendering metrics from performance entries
   */
  private updateRenderingMetrics(entry: any) {
    if (!this.metrics.renderingPerformance) return;

    const frameTime = entry.duration || 16.67; // 60fps baseline
    this.metrics.renderingPerformance.averageFrameTime =
      (this.metrics.renderingPerformance.averageFrameTime + frameTime) / 2;

    if (frameTime > 16.67) {
      this.metrics.renderingPerformance.jankFrames++;
    }

    this.metrics.renderingPerformance.frameRate = Math.round(1000 / frameTime);
  }

  /**
   * Benchmark rendering performance
   */
  private async benchmarkRendering(config: BenchmarkConfig): Promise<void> {
    return new Promise((resolve) => {
      let frameCount = 0;
      let totalFrameTime = 0;
      let jankFrames = 0;
      
      // Reuse a single canvas element throughout the application lifecycle
      // to prevent WebGL context leaks
      let canvas: HTMLCanvasElement;
      if (!(window as any).__performanceBenchmarkCanvas) {
        canvas = document.createElement("canvas");
        (window as any).__performanceBenchmarkCanvas = canvas;
      } else {
        canvas = (window as any).__performanceBenchmarkCanvas;
      }
      
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const ctx = canvas.getContext("2d");

      const measureFrame = () => {
        const frameStart = performance.now();

        // Simulate rendering work with error handling
        try {
          if (ctx) {
            // Clear canvas for reuse
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw complex shapes to stress test
            for (let i = 0; i < 100; i++) {
              ctx.fillStyle = `hsl(${Math.random() * 360}, 50%, 50%)`;
              ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 50, 50);
            }
          }
        } catch (error) {
          // Canvas not available in test environment
          console.error(error);
        }

        const frameTime = performance.now() - frameStart;
        totalFrameTime += frameTime;
        frameCount++;

        if (frameTime > 16.67) {
          jankFrames++;
        }

        if (frameCount < config.iterations) {
          requestAnimationFrame(measureFrame);
        } else {
          this.metrics.renderingPerformance = {
            frameRate: Math.round(1000 / (totalFrameTime / frameCount)),
            averageFrameTime: totalFrameTime / frameCount,
            jankFrames,
            paintTime: totalFrameTime,
            layoutTime: 0, // Would need more sophisticated measurement
          };
          resolve();
        }
      };

      requestAnimationFrame(measureFrame);
    });
  }

  /**
   * Benchmark memory usage
   */
  private async benchmarkMemory(config: BenchmarkConfig): Promise<void> {
    const initialMemory = this.getMemoryUsage();
    let peakMemory = initialMemory;
    let garbageCollections = 0;

    // Create memory pressure
    const memoryStressTest = () => {
      const arrays: number[][] = [];

      for (let i = 0; i < 1000; i++) {
        arrays.push(new Array(1000).fill(Math.random()));
      }

      const currentMemory = this.getMemoryUsage();
      peakMemory = Math.max(peakMemory, currentMemory);

      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
        garbageCollections++;
      }

      // Clean up
      arrays.length = 0;
    };

    return new Promise((resolve) => {
      let iterations = 0;
      const maxIterations = 10;

      const runTest = () => {
        memoryStressTest();
        iterations++;

        if (iterations < maxIterations) {
          setTimeout(runTest, 100);
        } else {
          const finalMemory = this.getMemoryUsage();
          this.metrics.memoryUsage = {
            initialMemory,
            peakMemory,
            memoryLeaks: Math.max(0, finalMemory - initialMemory),
            garbageCollections,
          };
          resolve();
        }
      };

      runTest();
    });
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if ("memory" in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0;
  }

  /**
   * Benchmark network performance
   */
  private async benchmarkNetwork(config: BenchmarkConfig): Promise<void> {
    const connection = (navigator as any).connection;
    const connectionType = connection?.effectiveType || "unknown";

    // Test resource loading
    const resourceLoadTimes: Record<string, number> = {};

    for (const imageUrl of config.testImages) {
      const loadTime = await this.measureImageLoadTime(imageUrl);
      resourceLoadTimes[imageUrl] = loadTime;
    }

    // Measure latency with a ping test
    const latency = await this.measureLatency();

    this.metrics.networkPerformance = {
      connectionType,
      downloadSpeed: connection?.downlink || 0,
      latency,
      resourceLoadTimes,
    };
    // Also expose at the top level for compatibility with tests
    (this.metrics as any).resourceLoadTimes = resourceLoadTimes;
  }

  /**
   * Measure image load time
   */
  private measureImageLoadTime(url: string): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();
      const img = new Image();

      img.onload = () => {
        resolve(performance.now() - startTime);
      };

      img.onerror = () => {
        resolve(-1); // Error loading
      };

      img.src = url;

      // Timeout after 10 seconds
      setTimeout(() => resolve(-1), 10000);
    });
  }

  /**
   * Measure network latency
   */
  private async measureLatency(): Promise<number> {
    try {
      const startTime = performance.now();
      await fetch("/api/ping", { method: "HEAD" });
      return performance.now() - startTime;
    } catch {
      return -1;
    }
  }

  /**
   * Benchmark interaction performance
   */
  private async benchmarkInteractions(config: BenchmarkConfig): Promise<void> {
    return new Promise((resolve) => {
      let touchLatency = 0;
      let scrollPerformance = 0;
      let testCount = 0;

      // Create test element
      const testElement = document.createElement("div");
      testElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 100px;
        height: 100px;
        background: red;
        transform: translate(-50%, -50%);
        z-index: 9999;
      `;
      document.body.appendChild(testElement);

      // Test touch latency
      const testTouch = () => {
        const startTime = performance.now();

        const handler = () => {
          touchLatency += performance.now() - startTime;
          testCount++;
          testElement.removeEventListener("touchstart", handler);

          if (testCount < 5) {
            setTimeout(testTouch, 100);
          } else {
            // Clean up and resolve
            document.body.removeChild(testElement);
            this.metrics.interactionMetrics = {
              touchLatency: touchLatency / testCount,
              scrollPerformance,
              gestureRecognition: 0, // Would need more complex testing
              inputLag: touchLatency / testCount,
            };
            resolve();
          }
        };

        testElement.addEventListener("touchstart", handler);

        // Simulate touch
        const touchEvent = new TouchEvent("touchstart", {
          touches: [{ clientX: 50, clientY: 50 } as Touch],
        });
        testElement.dispatchEvent(touchEvent);
      };

      testTouch();
    });
  }

  /**
   * Benchmark load times
   */
  private async benchmarkLoadTimes(config: BenchmarkConfig): Promise<void> {
    // Component mount time
    const componentMountTime = await this.measureComponentMount();

    // Route transition time (simulated)
    const routeTransitionTime = await this.measureRouteTransition();

    this.metrics.loadTimes = {
      ...this.metrics.loadTimes!,
      componentMount: componentMountTime,
      routeTransition: routeTransitionTime,
    };
  }

  /**
   * Measure component mount time
   */
  private async measureComponentMount(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // Create and mount a complex component
      const testComponent = document.createElement("div");
      testComponent.innerHTML = `
        <div>
          ${Array.from({ length: 100 }, (_, i) => `<div class="item-${i}">Item ${i}</div>`).join(
            "",
          )}
        </div>
      `;

      document.body.appendChild(testComponent);

      // Use requestAnimationFrame to measure after render
      requestAnimationFrame(() => {
        const mountTime = performance.now() - startTime;
        document.body.removeChild(testComponent);
        resolve(mountTime);
      });
    });
  }

  /**
   * Measure route transition time (simulated)
   */
  private async measureRouteTransition(): Promise<number> {
    return new Promise((resolve) => {
      const startTime = performance.now();

      // Simulate route change work
      setTimeout(
        () => {
          resolve(performance.now() - startTime);
        },
        Math.random() * 100 + 50,
      ); // Random transition time
    });
  }

  /**
   * Benchmark battery impact
   */
  private async benchmarkBattery(config: BenchmarkConfig): Promise<void> {
    let cpuUsage = 0;
    let estimatedBatteryDrain = 0;

    // CPU intensive task to measure impact
    const cpuIntensiveTask = () => {
      const startTime = performance.now();

      // Simulate CPU work
      let result = 0;
      for (let i = 0; i < 1000000; i++) {
        result += Math.sqrt(i * Math.random());
      }

      const duration = performance.now() - startTime;
      cpuUsage = duration;

      // Estimate battery drain (very rough approximation)
      estimatedBatteryDrain = duration * 0.1; // Placeholder formula
    };

    return new Promise((resolve) => {
      cpuIntensiveTask();

      // Check battery API if available
      if ("getBattery" in navigator) {
        (navigator as any)
          .getBattery()
          .then((battery: any) => {
            this.metrics.batteryImpact = {
              cpuUsage,
              estimatedBatteryDrain,
              thermalState: "normal", // Would need actual thermal API
            };
            resolve();
          })
          .catch(() => {
            this.metrics.batteryImpact = {
              cpuUsage,
              estimatedBatteryDrain,
            };
            resolve();
          });
      } else {
        this.metrics.batteryImpact = {
          cpuUsage,
          estimatedBatteryDrain,
        };
        resolve();
      }
    });
  }

  /**
   * Calculate performance scores
   */
  private calculateScores() {
    const metrics = this.metrics as PerformanceMetrics;

    // Rendering score (0-100)
    const renderingScore = Math.min(
      100,
      Math.max(0, 100 - (metrics.renderingPerformance.averageFrameTime - 16.67) * 2),
    );

    // Memory score (0-100)
    const memoryScore = Math.min(
      100,
      Math.max(0, 100 - (metrics.memoryUsage.memoryLeaks / 1000000) * 10),
    );

    // Network score (0-100)
    const networkScore = Math.min(100, Math.max(0, 100 - metrics.networkPerformance.latency / 10));

    // Interaction score (0-100)
    const interactionScore = Math.min(
      100,
      Math.max(0, 100 - metrics.interactionMetrics.touchLatency),
    );

    // Battery score (0-100)
    const batteryScore = Math.min(100, Math.max(0, 100 - metrics.batteryImpact.cpuUsage / 100));

    // Overall score
    const overallScore =
      (renderingScore + memoryScore + networkScore + interactionScore + batteryScore) / 5;

    metrics.score = {
      overall: Math.round(overallScore),
      rendering: Math.round(renderingScore),
      memory: Math.round(memoryScore),
      network: Math.round(networkScore),
      interaction: Math.round(interactionScore),
      battery: Math.round(batteryScore),
    };
  }

  /**
   * Get benchmark results summary
   */
  getBenchmarkSummary(metrics: PerformanceMetrics): string {
    return `
📱 Device: ${metrics.deviceInfo.platform} ${metrics.deviceInfo.device}
🏆 Overall Score: ${metrics.score.overall}/100
📊 Breakdown:
  • Rendering: ${metrics.score.rendering}/100 (${metrics.renderingPerformance.frameRate} fps)
  • Memory: ${metrics.score.memory}/100 (${Math.round(metrics.memoryUsage.peakMemory / 1000000)}MB peak)
  • Network: ${metrics.score.network}/100 (${metrics.networkPerformance.latency}ms latency)
  • Interaction: ${metrics.score.interaction}/100 (${metrics.interactionMetrics.touchLatency.toFixed(1)}ms touch)
  • Battery: ${metrics.score.battery}/100 (${metrics.batteryImpact.cpuUsage.toFixed(1)}ms CPU)
    `;
  }
}

export const mobilePerformanceBenchmark = new MobilePerformanceBenchmark();
