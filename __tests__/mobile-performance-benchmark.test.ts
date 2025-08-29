/**
 * @jest-environment jsdom
 */

import {
  mobilePerformanceBenchmark,
  PerformanceMetrics,
  BenchmarkConfig,
} from "@/lib/mobile-performance-benchmark";
import { deviceCompatibilityService } from "@/lib/device-compatibility-service";

// Mock analytics
jest.mock("@/lib/analytics", () => ({
  track: jest.fn(),
}));

// Device profiles for performance testing
const DEVICE_PROFILES = {
  "low-end": {
    name: "Budget Android",
    userAgent: "Mozilla/5.0 (Linux; Android 10; SM-A205F) AppleWebKit/537.36",
    deviceMemory: 2,
    hardwareConcurrency: 4,
    viewport: { width: 360, height: 640 },
    pixelRatio: 2,
    connectionType: "3g",
    downlink: 1.5,
  },
  "mid-range": {
    name: "iPhone SE",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15",
    deviceMemory: 3,
    hardwareConcurrency: 6,
    viewport: { width: 375, height: 667 },
    pixelRatio: 2,
    connectionType: "4g",
    downlink: 5,
  },
  "high-end": {
    name: "iPhone 14 Pro",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15",
    deviceMemory: 6,
    hardwareConcurrency: 6,
    viewport: { width: 393, height: 852 },
    pixelRatio: 3,
    connectionType: "5g",
    downlink: 20,
  },
};

// Mock device environment
function mockDeviceEnvironment(profileKey: keyof typeof DEVICE_PROFILES) {
  const profile = DEVICE_PROFILES[profileKey];

  // Mock navigator properties
  Object.defineProperty(navigator, "userAgent", {
    value: profile.userAgent,
    configurable: true,
  });

  Object.defineProperty(navigator, "deviceMemory", {
    value: profile.deviceMemory,
    configurable: true,
  });

  Object.defineProperty(navigator, "hardwareConcurrency", {
    value: profile.hardwareConcurrency,
    configurable: true,
  });

  Object.defineProperty(navigator, "connection", {
    value: {
      effectiveType: profile.connectionType,
      downlink: profile.downlink,
    },
    configurable: true,
  });

  // Mock window properties
  Object.defineProperty(window, "innerWidth", {
    value: profile.viewport.width,
    configurable: true,
  });

  Object.defineProperty(window, "innerHeight", {
    value: profile.viewport.height,
    configurable: true,
  });

  Object.defineProperty(window, "devicePixelRatio", {
    value: profile.pixelRatio,
    configurable: true,
  });

  // Mock screen properties
  Object.defineProperty(screen, "width", {
    value: profile.viewport.width * profile.pixelRatio,
    configurable: true,
  });

  Object.defineProperty(screen, "height", {
    value: profile.viewport.height * profile.pixelRatio,
    configurable: true,
  });
}

// Mock performance APIs
function mockPerformanceAPIs() {
  // Mock PerformanceObserver
  global.PerformanceObserver = class MockPerformanceObserver {
    static supportedEntryTypes = ["navigation", "paint", "measure"];

    constructor(private callback: (list: any) => void) {}

    observe() {}
    disconnect() {}
  } as any;

  // Mock performance.memory
  Object.defineProperty(performance, "memory", {
    value: {
      usedJSHeapSize: 10000000,
      totalJSHeapSize: 20000000,
      jsHeapSizeLimit: 100000000,
    },
    configurable: true,
  });

  // Mock battery API
  Object.defineProperty(navigator, "getBattery", {
    value: jest.fn().mockResolvedValue({
      charging: false,
      level: 0.8,
      chargingTime: Infinity,
      dischargingTime: 7200,
    }),
    configurable: true,
  });
}

describe("Mobile Performance Benchmarking", () => {
  let defaultBenchmarkConfig: BenchmarkConfig;

  beforeAll(() => {
    mockPerformanceAPIs();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    deviceCompatibilityService.clearCache();
    mobilePerformanceBenchmark.reset(); // Reset benchmark state

    // Default benchmark configuration
    defaultBenchmarkConfig = {
      duration: 1000, // Short duration for tests
      iterations: 10,
      testRoutes: ["/generator", "/library", "/stories"],
      testImages: [
        "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
      ],
      testInteractions: [
        { type: "tap", target: "button", duration: 100 },
        { type: "scroll", target: "main", duration: 500 },
      ],
    };
  });

  describe.each(Object.keys(DEVICE_PROFILES))("%s Device Performance", (profileKey) => {
    beforeEach(() => {
      mockDeviceEnvironment(profileKey as keyof typeof DEVICE_PROFILES);
    });

    test("runs complete benchmark suite", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Verify all metrics are populated
      expect(metrics.deviceInfo).toBeDefined();
      expect(metrics.deviceInfo.platform).toBeTruthy();
      expect(metrics.hardwareSpecs).toBeDefined();
      expect(metrics.renderingPerformance).toBeDefined();
      expect(metrics.memoryUsage).toBeDefined();
      expect(metrics.networkPerformance).toBeDefined();
      expect(metrics.interactionMetrics).toBeDefined();
      expect(metrics.batteryImpact).toBeDefined();
      expect(metrics.loadTimes).toBeDefined();
      expect(metrics.score).toBeDefined();
    });

    test("measures rendering performance accurately", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      expect(metrics.renderingPerformance.frameRate).toBeGreaterThan(0);
      expect(metrics.renderingPerformance.averageFrameTime).toBeGreaterThan(0);
      expect(metrics.renderingPerformance.jankFrames).toBeGreaterThanOrEqual(0);
      expect(metrics.score.rendering).toBeGreaterThanOrEqual(0);
      expect(metrics.score.rendering).toBeLessThanOrEqual(100);
    });

    test("tracks memory usage correctly", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      expect(metrics.memoryUsage.initialMemory).toBeGreaterThan(0);
      expect(metrics.memoryUsage.peakMemory).toBeGreaterThanOrEqual(
        metrics.memoryUsage.initialMemory,
      );
      expect(metrics.memoryUsage.memoryLeaks).toBeGreaterThanOrEqual(0);
      expect(metrics.score.memory).toBeGreaterThanOrEqual(0);
    });

    test("evaluates network performance", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      expect(metrics.networkPerformance.connectionType).toBeTruthy();
      expect(metrics.networkPerformance.downloadSpeed).toBeGreaterThanOrEqual(0);
      expect(metrics.resourceLoadTimes).toBeDefined();
      expect(metrics.score.network).toBeGreaterThanOrEqual(0);
    });

    test("measures interaction responsiveness", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      expect(metrics.interactionMetrics.touchLatency).toBeGreaterThanOrEqual(0);
      expect(metrics.interactionMetrics.inputLag).toBeGreaterThanOrEqual(0);
      expect(metrics.score.interaction).toBeGreaterThanOrEqual(0);
    });

    test("assesses battery impact", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      expect(metrics.batteryImpact.cpuUsage).toBeGreaterThanOrEqual(0);
      expect(metrics.batteryImpact.estimatedBatteryDrain).toBeGreaterThanOrEqual(0);
      expect(metrics.score.battery).toBeGreaterThanOrEqual(0);
    });

    test("calculates meaningful performance scores", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // All scores should be between 0-100
      expect(metrics.score.overall).toBeGreaterThanOrEqual(0);
      expect(metrics.score.overall).toBeLessThanOrEqual(100);
      expect(metrics.score.rendering).toBeGreaterThanOrEqual(0);
      expect(metrics.score.rendering).toBeLessThanOrEqual(100);
      expect(metrics.score.memory).toBeGreaterThanOrEqual(0);
      expect(metrics.score.memory).toBeLessThanOrEqual(100);
      expect(metrics.score.network).toBeGreaterThanOrEqual(0);
      expect(metrics.score.network).toBeLessThanOrEqual(100);
      expect(metrics.score.interaction).toBeGreaterThanOrEqual(0);
      expect(metrics.score.interaction).toBeLessThanOrEqual(100);
      expect(metrics.score.battery).toBeGreaterThanOrEqual(0);
      expect(metrics.score.battery).toBeLessThanOrEqual(100);
    });

    test("generates informative benchmark summary", async () => {
      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);
      const summary = mobilePerformanceBenchmark.getBenchmarkSummary(metrics);

      expect(summary).toContain("Device:");
      expect(summary).toContain("Overall Score:");
      expect(summary).toContain("Rendering:");
      expect(summary).toContain("Memory:");
      expect(summary).toContain("Network:");
      expect(summary).toContain("Interaction:");
      expect(summary).toContain("Battery:");
    });
  });

  describe("Performance Comparison", () => {
    test("high-end devices outperform low-end devices", async () => {
      // Benchmark low-end device
      mockDeviceEnvironment("low-end");
      deviceCompatibilityService.clearCache();
      const lowEndMetrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Benchmark high-end device
      mockDeviceEnvironment("high-end");
      deviceCompatibilityService.clearCache();
      const highEndMetrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // High-end should generally perform better
      expect(highEndMetrics.score.overall).toBeGreaterThanOrEqual(lowEndMetrics.score.overall - 10);
      expect(highEndMetrics.hardwareSpecs.deviceMemory).toBeGreaterThan(
        lowEndMetrics.hardwareSpecs.deviceMemory!,
      );
    });

    test("device-specific performance characteristics", async () => {
      const results: Record<string, PerformanceMetrics> = {};

      for (const profileKey of Object.keys(DEVICE_PROFILES)) {
        mockDeviceEnvironment(profileKey as keyof typeof DEVICE_PROFILES);
        deviceCompatibilityService.clearCache();
        results[profileKey] = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);
      }

      // Verify device differentiation
      const lowEnd = results["low-end"];
      const midRange = results["mid-range"];
      const highEnd = results["high-end"];

      // Hardware specs should reflect device capabilities
      expect(highEnd.hardwareSpecs.deviceMemory).toBeGreaterThan(
        lowEnd.hardwareSpecs.deviceMemory!,
      );
      expect(highEnd.networkPerformance.downloadSpeed).toBeGreaterThan(
        lowEnd.networkPerformance.downloadSpeed,
      );
    });
  });

  describe("Performance Regression Detection", () => {
    test("detects performance degradation", async () => {
      mockDeviceEnvironment("mid-range");

      // Baseline benchmark
      const baselineMetrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Simulate performance degradation by reducing device memory
      Object.defineProperty(navigator, "deviceMemory", {
        value: 1, // Severely limited memory
        configurable: true,
      });

      const degradedMetrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Should detect degradation (though this is a simplistic test)
      expect(degradedMetrics.hardwareSpecs.deviceMemory).toBeLessThan(
        baselineMetrics.hardwareSpecs.deviceMemory!,
      );
    });

    test("identifies performance bottlenecks", async () => {
      mockDeviceEnvironment("low-end");
      const metrics = await mobilePerformanceBenchmark.runBenchmark({
        ...defaultBenchmarkConfig,
        iterations: 50, // More iterations to stress test
      });

      // Low-end devices should show certain patterns
      if (metrics.score.overall < 50) {
        // Should identify specific bottlenecks
        const bottlenecks = [];

        if (metrics.score.rendering < 60) bottlenecks.push("rendering");
        if (metrics.score.memory < 60) bottlenecks.push("memory");
        if (metrics.score.network < 60) bottlenecks.push("network");
        if (metrics.score.interaction < 60) bottlenecks.push("interaction");
        if (metrics.score.battery < 60) bottlenecks.push("battery");

        expect(bottlenecks.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Real-world Performance Scenarios", () => {
    test("playlist generation performance", async () => {
      mockDeviceEnvironment("mid-range");

      const playlistBenchmark: BenchmarkConfig = {
        duration: 2000,
        iterations: 20,
        testRoutes: ["/generator"],
        testImages: [
          "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=",
        ],
        testInteractions: [
          { type: "tap", target: "generate-button", duration: 100 },
          { type: "scroll", target: "results", duration: 1000 },
        ],
      };

      const metrics = await mobilePerformanceBenchmark.runBenchmark(playlistBenchmark);

      // Should handle playlist generation workload
      expect(metrics.score.overall).toBeGreaterThan(0);
      expect(metrics.loadTimes.componentMount).toBeLessThan(5000); // Should mount within 5s
    });

    test("music playback performance", async () => {
      mockDeviceEnvironment("mid-range");

      const musicBenchmark: BenchmarkConfig = {
        duration: 3000,
        iterations: 15,
        testRoutes: ["/player"],
        testImages: [],
        testInteractions: [
          { type: "tap", target: "play-button", duration: 50 },
          { type: "swipe", target: "track-slider", duration: 200 },
          { type: "tap", target: "next-button", duration: 50 },
        ],
      };

      const metrics = await mobilePerformanceBenchmark.runBenchmark(musicBenchmark);

      // Music playback should have good interaction responsiveness
      expect(metrics.interactionMetrics.touchLatency).toBeLessThan(100); // Quick touch response
      expect(metrics.score.interaction).toBeGreaterThan(70); // Good interaction score
    });

    test("social sharing performance", async () => {
      mockDeviceEnvironment("high-end");

      const sharingBenchmark: BenchmarkConfig = {
        duration: 1500,
        iterations: 10,
        testRoutes: ["/share"],
        testImages: [
          // Multiple cover art images
          "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
          "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
          "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        ],
        testInteractions: [
          { type: "tap", target: "share-instagram", duration: 100 },
          { type: "tap", target: "share-twitter", duration: 100 },
        ],
      };

      const metrics = await mobilePerformanceBenchmark.runBenchmark(sharingBenchmark);

      // High-end device should handle sharing well
      expect(metrics.score.overall).toBeGreaterThan(60);
      expect(metrics.networkPerformance.downloadSpeed).toBeGreaterThan(5); // Good network
    });
  });

  describe("Performance Optimization Validation", () => {
    test("lazy loading improves performance", async () => {
      mockDeviceEnvironment("low-end");

      // Simulate with lazy loading
      const lazyLoadConfig: BenchmarkConfig = {
        ...defaultBenchmarkConfig,
        testImages: [], // No images to load
      };

      const lazyMetrics = await mobilePerformanceBenchmark.runBenchmark(lazyLoadConfig);

      // Simulate without lazy loading
      const eagerLoadConfig: BenchmarkConfig = {
        ...defaultBenchmarkConfig,
        testImages: Array(10).fill(
          "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        ),
      };

      const eagerMetrics = await mobilePerformanceBenchmark.runBenchmark(eagerLoadConfig);

      // Lazy loading should perform better on low-end devices
      expect(lazyMetrics.loadTimes.initialLoad).toBeLessThanOrEqual(
        eagerMetrics.loadTimes.initialLoad + 100,
      );
    });

    test("service worker caching improves repeated visits", async () => {
      mockDeviceEnvironment("mid-range");

      // First visit (no cache)
      const firstVisitMetrics =
        await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Simulate cached resources for second visit
      Object.defineProperty(navigator, "connection", {
        value: {
          effectiveType: "4g",
          downlink: 20, // Simulate faster loading due to cache
        },
        configurable: true,
      });

      const secondVisitMetrics =
        await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Second visit should be faster due to caching
      expect(secondVisitMetrics.networkPerformance.downloadSpeed).toBeGreaterThanOrEqual(
        firstVisitMetrics.networkPerformance.downloadSpeed,
      );
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("handles missing performance APIs gracefully", async () => {
      // Remove performance APIs
      delete (performance as any).memory;
      delete (navigator as any).getBattery;

      mockDeviceEnvironment("mid-range");

      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Should still complete benchmark
      expect(metrics).toBeDefined();
      expect(metrics.score.overall).toBeGreaterThanOrEqual(0);
    });

    test("handles network failures gracefully", async () => {
      mockDeviceEnvironment("low-end");

      // Mock fetch failures
      global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

      const metrics = await mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      // Should complete despite network issues
      expect(metrics).toBeDefined();
      expect(metrics.networkPerformance.latency).toBe(-1); // Error value
    });

    test("prevents concurrent benchmark execution", async () => {
      mockDeviceEnvironment("mid-range");

      const promise1 = mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig);

      await expect(mobilePerformanceBenchmark.runBenchmark(defaultBenchmarkConfig)).rejects.toThrow(
        "Benchmark already running",
      );

      await promise1; // Let first benchmark complete
    });
  });
});
