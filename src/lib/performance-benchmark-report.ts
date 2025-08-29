/**
 * Performance Benchmark Report Generator
 * Generates comprehensive performance analysis reports
 */

import { PerformanceMetrics } from './mobile-performance-benchmark';

export interface BenchmarkReport {
  summary: {
    totalDevicesTested: number;
    testDate: string;
    overallAverageScore: number;
    performanceDistribution: {
      excellent: number; // 80-100
      good: number;      // 60-79
      fair: number;      // 40-59
      poor: number;      // 0-39
    };
  };
  deviceResults: PerformanceMetrics[];
  analysis: {
    topPerformingDevices: PerformanceMetrics[];
    poorlyPerformingDevices: PerformanceMetrics[];
    commonBottlenecks: string[];
    recommendations: string[];
    performanceTrends: {
      byPlatform: Record<string, number>;
      byDeviceCategory: Record<string, number>;
    };
  };
  detailedMetrics: {
    renderingAnalysis: {
      averageFrameRate: number;
      jankFramePercentage: number;
      worstPerformingDevices: string[];
    };
    memoryAnalysis: {
      averageMemoryUsage: number;
      memoryLeakDevices: string[];
      highMemoryDevices: string[];
    };
    networkAnalysis: {
      averageLatency: number;
      slowNetworkDevices: string[];
      fastNetworkDevices: string[];
    };
    interactionAnalysis: {
      averageTouchLatency: number;
      slowResponseDevices: string[];
    };
    batteryAnalysis: {
      averageCpuUsage: number;
      highDrainDevices: string[];
    };
  };
}

class PerformanceBenchmarkReportGenerator {
  /**
   * Generate comprehensive benchmark report
   */
  generateReport(results: PerformanceMetrics[]): BenchmarkReport {
    const report: BenchmarkReport = {
      summary: this.generateSummary(results),
      deviceResults: results,
      analysis: this.generateAnalysis(results),
      detailedMetrics: this.generateDetailedMetrics(results),
    };

    return report;
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(results: PerformanceMetrics[]) {
    const scores = results.map(r => r.score.overall);
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    const distribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
    };

    scores.forEach(score => {
      if (score >= 80) distribution.excellent++;
      else if (score >= 60) distribution.good++;
      else if (score >= 40) distribution.fair++;
      else distribution.poor++;
    });

    return {
      totalDevicesTested: results.length,
      testDate: new Date().toISOString(),
      overallAverageScore: Math.round(averageScore),
      performanceDistribution: distribution,
    };
  }

  /**
   * Generate performance analysis
   */
  private generateAnalysis(results: PerformanceMetrics[]) {
    const sortedResults = [...results].sort((a, b) => b.score.overall - a.score.overall);
    
    const topPerformingDevices = sortedResults.slice(0, 3);
    const poorlyPerformingDevices = sortedResults.slice(-3).reverse();

    // Identify common bottlenecks
    const bottlenecks: Record<string, number> = {};
    results.forEach(result => {
      if (result.score.rendering < 60) bottlenecks['Rendering Performance'] = (bottlenecks['Rendering Performance'] || 0) + 1;
      if (result.score.memory < 60) bottlenecks['Memory Management'] = (bottlenecks['Memory Management'] || 0) + 1;
      if (result.score.network < 60) bottlenecks['Network Performance'] = (bottlenecks['Network Performance'] || 0) + 1;
      if (result.score.interaction < 60) bottlenecks['Touch Responsiveness'] = (bottlenecks['Touch Responsiveness'] || 0) + 1;
      if (result.score.battery < 60) bottlenecks['Battery Efficiency'] = (bottlenecks['Battery Efficiency'] || 0) + 1;
    });

    const commonBottlenecks = Object.entries(bottlenecks)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([bottleneck]) => bottleneck);

    // Generate recommendations
    const recommendations = this.generateRecommendations(results, commonBottlenecks);

    // Performance trends by platform
    const platformScores: Record<string, number[]> = {};
    results.forEach(result => {
      const platform = result.deviceInfo.platform;
      if (!platformScores[platform]) platformScores[platform] = [];
      platformScores[platform].push(result.score.overall);
    });

    const byPlatform: Record<string, number> = {};
    Object.entries(platformScores).forEach(([platform, scores]) => {
      byPlatform[platform] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });

    // Performance trends by device category
    const categoryScores: Record<string, number[]> = {};
    results.forEach(result => {
      const category = this.categorizeDevice(result);
      if (!categoryScores[category]) categoryScores[category] = [];
      categoryScores[category].push(result.score.overall);
    });

    const byDeviceCategory: Record<string, number> = {};
    Object.entries(categoryScores).forEach(([category, scores]) => {
      byDeviceCategory[category] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    });

    return {
      topPerformingDevices,
      poorlyPerformingDevices,
      commonBottlenecks,
      recommendations,
      performanceTrends: {
        byPlatform,
        byDeviceCategory,
      },
    };
  }

  /**
   * Generate detailed metrics analysis
   */
  private generateDetailedMetrics(results: PerformanceMetrics[]) {
    // Rendering analysis
    const frameRates = results.map(r => r.renderingPerformance.frameRate);
    const averageFrameRate = Math.round(frameRates.reduce((a, b) => a + b, 0) / frameRates.length);
    
    const totalFrames = results.reduce((sum, r) => sum + (r.renderingPerformance.jankFrames || 0) + 100, 0);
    const totalJankFrames = results.reduce((sum, r) => sum + (r.renderingPerformance.jankFrames || 0), 0);
    const jankFramePercentage = Math.round((totalJankFrames / totalFrames) * 100);
    
    const worstPerformingDevices = results
      .filter(r => r.renderingPerformance.frameRate < 45)
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);

    // Memory analysis
    const memoryUsages = results.map(r => r.memoryUsage.peakMemory);
    const averageMemoryUsage = Math.round(memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length);
    
    const memoryLeakDevices = results
      .filter(r => r.memoryUsage.memoryLeaks > 5000000) // 5MB+ leaks
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);
    
    const highMemoryDevices = results
      .filter(r => r.memoryUsage.peakMemory > 50000000) // 50MB+ peak usage
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);

    // Network analysis
    const latencies = results.map(r => r.networkPerformance.latency).filter(l => l > 0);
    const averageLatency = latencies.length > 0 
      ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
      : 0;
    
    const slowNetworkDevices = results
      .filter(r => r.networkPerformance.latency > 200)
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);
    
    const fastNetworkDevices = results
      .filter(r => r.networkPerformance.latency > 0 && r.networkPerformance.latency < 50)
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);

    // Interaction analysis
    const touchLatencies = results.map(r => r.interactionMetrics.touchLatency);
    const averageTouchLatency = Math.round(touchLatencies.reduce((a, b) => a + b, 0) / touchLatencies.length * 10) / 10;
    
    const slowResponseDevices = results
      .filter(r => r.interactionMetrics.touchLatency > 50)
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);

    // Battery analysis
    const cpuUsages = results.map(r => r.batteryImpact.cpuUsage);
    const averageCpuUsage = Math.round(cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length * 10) / 10;
    
    const highDrainDevices = results
      .filter(r => r.batteryImpact.cpuUsage > 100)
      .map(r => `${r.deviceInfo.platform} ${r.deviceInfo.device}`)
      .slice(0, 5);

    return {
      renderingAnalysis: {
        averageFrameRate,
        jankFramePercentage,
        worstPerformingDevices,
      },
      memoryAnalysis: {
        averageMemoryUsage,
        memoryLeakDevices,
        highMemoryDevices,
      },
      networkAnalysis: {
        averageLatency,
        slowNetworkDevices,
        fastNetworkDevices,
      },
      interactionAnalysis: {
        averageTouchLatency,
        slowResponseDevices,
      },
      batteryAnalysis: {
        averageCpuUsage,
        highDrainDevices,
      },
    };
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(results: PerformanceMetrics[], bottlenecks: string[]): string[] {
    const recommendations: string[] = [];

    if (bottlenecks.includes('Rendering Performance')) {
      recommendations.push('Optimize animation performance and reduce complex UI updates');
      recommendations.push('Implement frame rate monitoring and adaptive quality settings');
      recommendations.push('Use CSS transforms and hardware acceleration where possible');
    }

    if (bottlenecks.includes('Memory Management')) {
      recommendations.push('Implement aggressive garbage collection and memory cleanup');
      recommendations.push('Use virtual scrolling for large lists and data sets');
      recommendations.push('Optimize image loading and implement progressive enhancement');
    }

    if (bottlenecks.includes('Network Performance')) {
      recommendations.push('Implement network-aware loading strategies');
      recommendations.push('Use service workers for offline caching and resource optimization');
      recommendations.push('Compress and optimize all network resources');
    }

    if (bottlenecks.includes('Touch Responsiveness')) {
      recommendations.push('Optimize touch event handlers and gesture recognition');
      recommendations.push('Implement proper touch feedback and haptic responses');
      recommendations.push('Use passive event listeners where appropriate');
    }

    if (bottlenecks.includes('Battery Efficiency')) {
      recommendations.push('Implement battery-aware performance adjustments');
      recommendations.push('Reduce background processing and optimize CPU-intensive tasks');
      recommendations.push('Use efficient animation and rendering techniques');
    }

    // Add general recommendations based on device distribution
    const lowEndDevices = results.filter(r => this.categorizeDevice(r) === 'low-end').length;
    const totalDevices = results.length;
    
    if (lowEndDevices / totalDevices > 0.3) {
      recommendations.push('Focus on low-end device optimization and graceful degradation');
      recommendations.push('Implement adaptive UI complexity based on device capabilities');
    }

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  /**
   * Categorize device based on performance characteristics
   */
  private categorizeDevice(result: PerformanceMetrics): string {
    const score = result.score.overall;
    const memory = result.hardwareSpecs.deviceMemory || 4;
    
    if (score >= 80 && memory >= 6) return 'high-end';
    if (score >= 60 && memory >= 4) return 'mid-range';
    return 'low-end';
  }

  /**
   * Generate markdown report
   */
  generateMarkdownReport(report: BenchmarkReport): string {
    const { summary, analysis, detailedMetrics } = report;
    
    return `# Mobile Performance Benchmark Report

## Executive Summary
- **Test Date**: ${new Date(summary.testDate).toLocaleDateString()}
- **Devices Tested**: ${summary.totalDevicesTested}
- **Overall Average Score**: ${summary.overallAverageScore}/100

### Performance Distribution
- **Excellent (80-100)**: ${summary.performanceDistribution.excellent} devices
- **Good (60-79)**: ${summary.performanceDistribution.good} devices
- **Fair (40-59)**: ${summary.performanceDistribution.fair} devices
- **Poor (0-39)**: ${summary.performanceDistribution.poor} devices

## Top Performing Devices
${analysis.topPerformingDevices.map((device, index) => 
  `${index + 1}. **${device.deviceInfo.platform} ${device.deviceInfo.device}** - Score: ${device.score.overall}/100`
).join('\n')}

## Performance Issues
### Common Bottlenecks
${analysis.commonBottlenecks.map(bottleneck => `- ${bottleneck}`).join('\n')}

### Poorly Performing Devices
${analysis.poorlyPerformingDevices.map((device, index) => 
  `${index + 1}. **${device.deviceInfo.platform} ${device.deviceInfo.device}** - Score: ${device.score.overall}/100`
).join('\n')}

## Detailed Metrics

### Rendering Performance
- **Average Frame Rate**: ${detailedMetrics.renderingAnalysis.averageFrameRate} fps
- **Jank Frame Percentage**: ${detailedMetrics.renderingAnalysis.jankFramePercentage}%
- **Devices with Rendering Issues**: ${detailedMetrics.renderingAnalysis.worstPerformingDevices.join(', ') || 'None'}

### Memory Usage
- **Average Peak Memory**: ${Math.round(detailedMetrics.memoryAnalysis.averageMemoryUsage / 1000000)}MB
- **Devices with Memory Leaks**: ${detailedMetrics.memoryAnalysis.memoryLeakDevices.join(', ') || 'None'}
- **High Memory Usage Devices**: ${detailedMetrics.memoryAnalysis.highMemoryDevices.join(', ') || 'None'}

### Network Performance
- **Average Latency**: ${detailedMetrics.networkAnalysis.averageLatency}ms
- **Slow Network Devices**: ${detailedMetrics.networkAnalysis.slowNetworkDevices.join(', ') || 'None'}
- **Fast Network Devices**: ${detailedMetrics.networkAnalysis.fastNetworkDevices.join(', ') || 'None'}

### Touch Responsiveness
- **Average Touch Latency**: ${detailedMetrics.interactionAnalysis.averageTouchLatency}ms
- **Slow Response Devices**: ${detailedMetrics.interactionAnalysis.slowResponseDevices.join(', ') || 'None'}

### Battery Impact
- **Average CPU Usage**: ${detailedMetrics.batteryAnalysis.averageCpuUsage}ms
- **High Battery Drain Devices**: ${detailedMetrics.batteryAnalysis.highDrainDevices.join(', ') || 'None'}

## Platform Analysis
${Object.entries(analysis.performanceTrends.byPlatform).map(([platform, score]) => 
  `- **${platform}**: ${score}/100 average`
).join('\n')}

## Device Category Analysis
${Object.entries(analysis.performanceTrends.byDeviceCategory).map(([category, score]) => 
  `- **${category}**: ${score}/100 average`
).join('\n')}

## Recommendations
${analysis.recommendations.map(rec => `- ${rec}`).join('\n')}

---
*Report generated on ${new Date().toLocaleString()}*
`;
  }

  /**
   * Generate JSON report for programmatic analysis
   */
  generateJSONReport(report: BenchmarkReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate CSV summary for spreadsheet analysis
   */
  generateCSVSummary(report: BenchmarkReport): string {
    const headers = [
      'Platform',
      'Device',
      'Browser',
      'Overall Score',
      'Rendering Score',
      'Memory Score',
      'Network Score',
      'Interaction Score',
      'Battery Score',
      'Frame Rate',
      'Memory Usage (MB)',
      'Touch Latency (ms)',
      'Network Latency (ms)',
      'Device Category'
    ];

    const rows = report.deviceResults.map(result => [
      result.deviceInfo.platform,
      result.deviceInfo.device,
      result.deviceInfo.browser,
      result.score.overall,
      result.score.rendering,
      result.score.memory,
      result.score.network,
      result.score.interaction,
      result.score.battery,
      result.renderingPerformance.frameRate,
      Math.round(result.memoryUsage.peakMemory / 1000000),
      result.interactionMetrics.touchLatency.toFixed(1),
      result.networkPerformance.latency,
      this.categorizeDevice(result)
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

export const performanceBenchmarkReportGenerator = new PerformanceBenchmarkReportGenerator();