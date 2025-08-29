/**
 * @jest-environment jsdom
 */

import { mobilePerformanceBenchmark } from "@/lib/mobile-performance-benchmark";
import { performanceBenchmarkReportGenerator } from "@/lib/performance-benchmark-report";
import { deviceCompatibilityService } from "@/lib/device-compatibility-service";

// Simple integration test to validate the performance benchmarking system
describe("Performance Benchmarking Integration", () => {
  beforeEach(() => {
    deviceCompatibilityService.clearCache();
    mobilePerformanceBenchmark.reset();

    // Mock performance APIs
    Object.defineProperty(performance, "memory", {
      value: {
        usedJSHeapSize: 10000000,
        totalJSHeapSize: 20000000,
        jsHeapSizeLimit: 100000000,
      },
      configurable: true,
    });
  });

  test("performance benchmarking system initializes correctly", () => {
    expect(mobilePerformanceBenchmark).toBeDefined();
    expect(performanceBenchmarkReportGenerator).toBeDefined();
    expect(deviceCompatibilityService).toBeDefined();
  });

  test("device compatibility service works", () => {
    const deviceInfo = deviceCompatibilityService.getDeviceInfo();

    expect(deviceInfo).toBeDefined();
    expect(deviceInfo.platform).toBeTruthy();
    expect(deviceInfo.isMobile).toBeDefined();
  });

  test("performance report generator can create reports", () => {
    const mockMetrics = {
      deviceInfo: {
        platform: "iOS",
        device: "iPhone 12",
        browser: "Safari",
        version: "15.0",
      },
      hardwareSpecs: {
        deviceMemory: 6,
        hardwareConcurrency: 6,
        pixelRatio: 3,
        screenResolution: "390x844",
      },
      renderingPerformance: {
        frameRate: 60,
        averageFrameTime: 16.67,
        jankFrames: 5,
        paintTime: 100,
        layoutTime: 50,
      },
      memoryUsage: {
        initialMemory: 10000000,
        peakMemory: 20000000,
        memoryLeaks: 1000000,
        garbageCollections: 3,
      },
      networkPerformance: {
        connectionType: "4g",
        downloadSpeed: 10,
        latency: 50,
        resourceLoadTimes: {},
      },
      interactionMetrics: {
        touchLatency: 20,
        scrollPerformance: 80,
        gestureRecognition: 90,
        inputLag: 25,
      },
      batteryImpact: {
        cpuUsage: 50,
        estimatedBatteryDrain: 5,
      },
      loadTimes: {
        initialLoad: 1500,
        routeTransition: 300,
        componentMount: 100,
        imageLoad: 200,
      },
      score: {
        overall: 85,
        rendering: 90,
        memory: 80,
        network: 85,
        interaction: 85,
        battery: 85,
      },
    };

    const report = performanceBenchmarkReportGenerator.generateReport([mockMetrics as any]);

    expect(report).toBeDefined();
    expect(report.summary).toBeDefined();
    expect(report.analysis).toBeDefined();
    expect(report.detailedMetrics).toBeDefined();
    expect(report.summary.totalDevicesTested).toBe(1);
    expect(report.summary.overallAverageScore).toBe(85);
  });

  test("can generate markdown report", () => {
    const mockMetrics = {
      deviceInfo: { platform: "iOS", device: "iPhone 12", browser: "Safari", version: "15.0" },
      hardwareSpecs: {
        deviceMemory: 6,
        hardwareConcurrency: 6,
        pixelRatio: 3,
        screenResolution: "390x844",
      },
      renderingPerformance: {
        frameRate: 60,
        averageFrameTime: 16.67,
        jankFrames: 5,
        paintTime: 100,
        layoutTime: 50,
      },
      memoryUsage: {
        initialMemory: 10000000,
        peakMemory: 20000000,
        memoryLeaks: 1000000,
        garbageCollections: 3,
      },
      networkPerformance: {
        connectionType: "4g",
        downloadSpeed: 10,
        latency: 50,
        resourceLoadTimes: {},
      },
      interactionMetrics: {
        touchLatency: 20,
        scrollPerformance: 80,
        gestureRecognition: 90,
        inputLag: 25,
      },
      batteryImpact: { cpuUsage: 50, estimatedBatteryDrain: 5 },
      loadTimes: { initialLoad: 1500, routeTransition: 300, componentMount: 100, imageLoad: 200 },
      score: { overall: 85, rendering: 90, memory: 80, network: 85, interaction: 85, battery: 85 },
    };

    const report = performanceBenchmarkReportGenerator.generateReport([mockMetrics as any]);
    const markdownReport = performanceBenchmarkReportGenerator.generateMarkdownReport(report);

    expect(markdownReport).toContain("# Mobile Performance Benchmark Report");
    expect(markdownReport).toContain("Overall Average Score");
    expect(markdownReport).toContain("iPhone 12");
  });

  test("system handles missing APIs gracefully", () => {
    // Remove performance APIs
    delete (performance as any).memory;

    expect(() => {
      deviceCompatibilityService.getDeviceInfo();
    }).not.toThrow();

    expect(() => {
      const mockMetrics = {
        deviceInfo: { platform: "iOS", device: "iPhone 12", browser: "Safari", version: "15.0" },
        hardwareSpecs: {
          deviceMemory: 6,
          hardwareConcurrency: 6,
          pixelRatio: 3,
          screenResolution: "390x844",
        },
        renderingPerformance: {
          frameRate: 60,
          averageFrameTime: 16.67,
          jankFrames: 5,
          paintTime: 100,
          layoutTime: 50,
        },
        memoryUsage: { initialMemory: 0, peakMemory: 0, memoryLeaks: 0, garbageCollections: 0 },
        networkPerformance: {
          connectionType: "unknown",
          downloadSpeed: 0,
          latency: -1,
          resourceLoadTimes: {},
        },
        interactionMetrics: {
          touchLatency: 0,
          scrollPerformance: 0,
          gestureRecognition: 0,
          inputLag: 0,
        },
        batteryImpact: { cpuUsage: 0, estimatedBatteryDrain: 0 },
        loadTimes: { initialLoad: 0, routeTransition: 0, componentMount: 0, imageLoad: 0 },
        score: {
          overall: 50,
          rendering: 50,
          memory: 50,
          network: 50,
          interaction: 50,
          battery: 50,
        },
      };

      performanceBenchmarkReportGenerator.generateReport([mockMetrics as any]);
    }).not.toThrow();
  });
});
