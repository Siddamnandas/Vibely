/**
 * Server-side Performance Metrics Collection for Vibely
 * Tracks backend performance, API response times, and system health
 */

import type { NextRequest } from 'next/server';

interface PerformanceLog {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  userId?: string;
  userAgent?: string;
  error?: string;
}

interface SystemMetrics {
  totalRequests: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
  memoryUsage?: number;
}

class ServerPerformanceMonitor {
  private static instance: ServerPerformanceMonitor;
  private logs: PerformanceLog[] = [];
  private maxLogs = 1000;
  private startTime = Date.now();

  constructor() {
    if (ServerPerformanceMonitor.instance) {
      return ServerPerformanceMonitor.instance;
    }

    this.instance = this;
    this.startCleanupInterval();
  }

  /**
   * Track API endpoint performance
   */
  trackRequest(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    request?: NextRequest,
    error?: Error
  ) {
    const log: PerformanceLog = {
      timestamp: Date.now(),
      endpoint,
      method,
      responseTime,
      statusCode,
      userId: this.extractUserId(request),
      userAgent: request?.headers.get('user-agent') || undefined,
      error: error?.message
    };

    this.logs.push(log);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log slow requests
    if (responseTime > 2000) {
      console.warn(`🐌 Slow API request: ${method} ${endpoint} - ${responseTime}ms`);
    }

    // Log errors
    if (statusCode >= 500) {
      console.error(`🚨 Server error: ${method} ${endpoint} - ${statusCode}`, error);
    }
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): SystemMetrics {
    const recentLogs = this.getRecentLogs(5 * 60 * 1000); // Last 5 minutes

    if (recentLogs.length === 0) {
      return {
        totalRequests: 0,
        avgResponseTime: 0,
        errorRate: 0,
        uptime: (Date.now() - this.startTime) / 1000
      };
    }

    const totalRequests = recentLogs.length;
    const avgResponseTime = recentLogs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests;
    const errors = recentLogs.filter(log => log.statusCode >= 400).length;
    const errorRate = (errors / totalRequests) * 100;

    return {
      totalRequests,
      avgResponseTime: Math.round(avgResponseTime),
      errorRate: Math.round(errorRate * 100) / 100,
      uptime: Math.round((Date.now() - this.startTime) / 1000)
    };
  }

  /**
   * Get performance trends over time
   */
  getTrends(hours: number = 24): Array<{
    timestamp: number;
    avgResponseTime: number;
    errorRate: number;
    requestCount: number;
  }> {
    const timeRange = hours * 60 * 60 * 1000;
    const startTimestamp = Date.now() - timeRange;

    // Group logs by hour
    const hourlyData = new Map<number, PerformanceLog[]>();

    this.logs
      .filter(log => log.timestamp >= startTimestamp)
      .forEach(log => {
        const hourKey = Math.floor(log.timestamp / (60 * 60 * 1000));
        const hour = hourKey * 60 * 60 * 1000;

        if (!hourlyData.has(hour)) {
          hourlyData.set(hour, []);
        }
        hourlyData.get(hour)?.push(log);
      });

    return Array.from(hourlyData.entries())
      .map(([timestamp, logs]) => {
        const totalRequests = logs.length;
        const avgResponseTime = logs.reduce((sum, log) => sum + log.responseTime, 0) / totalRequests;
        const errors = logs.filter(log => log.statusCode >= 400).length;
        const errorRate = (errors / totalRequests) * 100;

        return {
          timestamp,
          avgResponseTime: Math.round(avgResponseTime),
          errorRate: Math.round(errorRate * 100) / 100,
          requestCount: totalRequests
        };
      })
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Get most problematic endpoints
   */
  getProblematicEndpoints(): Array<{
    endpoint: string;
    avgResponseTime: number;
    errorRate: number;
    requestCount: number;
  }> {
    const recentLogs = this.getRecentLogs(60 * 60 * 1000); // Last hour

    const endpointStats = new Map<string, {
      totalResponseTime: number;
      totalRequests: number;
      errors: number;
    }>();

    recentLogs.forEach(log => {
      const stats = endpointStats.get(log.endpoint) || {
        totalResponseTime: 0,
        totalRequests: 0,
        errors: 0
      };

      stats.totalResponseTime += log.responseTime;
      stats.totalRequests += 1;
      if (log.statusCode >= 400) {
        stats.errors += 1;
      }

      endpointStats.set(log.endpoint, stats);
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        avgResponseTime: Math.round(stats.totalResponseTime / stats.totalRequests),
        errorRate: Math.round((stats.errors / stats.totalRequests) * 100),
        requestCount: stats.totalRequests
      }))
      .filter(stats => stats.avgResponseTime > 100 || stats.errorRate > 5)
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 10);
  }

  /**
   * Extract user ID from request (assuming JWT or similar)
   */
  private extractUserId(request?: NextRequest): string | undefined {
    return request?.cookies.get('userId')?.value ||
           request?.headers.get('x-user-id') ||
           undefined;
  }

  /**
   * Get logs from recent time window
   */
  private getRecentLogs(windowMs: number): PerformanceLog[] {
    const startTime = Date.now() - windowMs;
    return this.logs.filter(log => log.timestamp >= startTime);
  }

  /**
   * Start periodic cleanup of old logs
   */
  private startCleanupInterval() {
    setInterval(() => {
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      this.logs = this.logs.filter(log => log.timestamp > oneWeekAgo);
    }, 60 * 60 * 1000); // Clean up hourly
  }
}

export const serverPerformanceMonitor = new ServerPerformanceMonitor();

// Middleware for tracking API performance
export function trackPerformance(
  handler: (request: NextRequest, context?: any) => Promise<Response> | Response
) {
  return async (request: NextRequest, context?: any): Promise<Response> => {
    const startTime = Date.now();
    const url = new URL(request.url);
    const endpoint = url.pathname;
    const method = request.method;

    try {
      const response = await handler(request, context);
      const responseTime = Date.now() - startTime;

      serverPerformanceMonitor.trackRequest(
        endpoint,
        method,
        responseTime,
        response.status,
        request
      );

      return response;
    } catch (error) {
      const responseTime = Date.now() - startTime;

      serverPerformanceMonitor.trackRequest(
        endpoint,
        method,
        responseTime,
        500,
        request,
        error instanceof Error ? error : new Error(String(error))
      );

      throw error;
    }
  };
}

// Export types for use in other files
