"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Battery,
  Cpu,
  Download,
  Zap,
  Monitor,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Image as ImageIcon,
  Wifi,
} from "lucide-react";
import { usePerformanceMonitoring } from "@/hooks/use-performance-monitoring";
import { useAutomaticPerformanceOptimization } from "@/hooks/use-automatic-performance-optimization";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useBatteryAwarePerformance } from "@/hooks/use-battery-aware-performance";
import { useNetworkAware } from "@/hooks/use-network-aware-loading";

// Performance score indicator component
function PerformanceScoreIndicator({ score }: { score: number }) {
  let variant: "default" | "destructive" | "secondary" = "default";
  let icon = <AlertTriangle className="w-4 h-4" />;
  
  if (score >= 80) {
    variant = "secondary";
    icon = <CheckCircle className="w-4 h-4" />;
  } else if (score < 50) {
    variant = "destructive";
    icon = <XCircle className="w-4 h-4" />;
  }
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={variant} className="flex items-center gap-1">
        {icon}
        <span>{score}/100</span>
      </Badge>
      <Progress value={score} className="w-32" />
    </div>
  );
}

// Metric card component
function MetricCard({ 
  title, 
  value, 
  unit, 
  icon, 
  status = "normal" 
}: {
  title: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  status?: "good" | "warning" | "bad" | "normal";
}) {
  let badgeVariant: "default" | "destructive" | "secondary" = "default";
  
  if (status === "good") badgeVariant = "secondary";
  else if (status === "bad") badgeVariant = "destructive";
  
  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-slate-300 flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          {value}
          {unit && <span className="text-sm font-normal text-slate-400 ml-1">{unit}</span>}
        </div>
        <Badge variant={badgeVariant} className="mt-2">
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
      </CardContent>
    </Card>
  );
}

// Optimization recommendation component
function OptimizationRecommendation({ recommendation }: { recommendation: string }) {
  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
      <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
      <div>
        <p className="text-sm text-slate-200">{recommendation}</p>
      </div>
    </div>
  );
}

export default function PerformanceDashboard() {
  const [isClient, setIsClient] = useState(false);
  const performanceMonitoring = usePerformanceMonitoring({ samplingRate: 1.0 }); // 100% sampling for dashboard
  const autoOptimization = useAutomaticPerformanceOptimization();
  const deviceProfile = useDevicePerformance();
  const batteryAware = useBatteryAwarePerformance();
  const networkAware = useNetworkAware();
  
  // Ensure we only render on client side
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Get performance status for metrics
  const getMetricStatus = useCallback((value: number | undefined, good: number, warning: number): "good" | "warning" | "bad" | "normal" => {
    if (value === undefined) return "normal";
    if (value <= good) return "good";
    if (value <= warning) return "warning";
    return "bad";
  }, []);
  
  if (!isClient) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="animate-pulse">
            <div className="h-8 bg-slate-800 rounded w-1/3 mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-slate-800 rounded"></div>
              ))}
            </div>
            <div className="h-64 bg-slate-800 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  const metrics = performanceMonitoring.metrics;
  
  return (
    <div className="min-h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Performance Dashboard</h1>
            <p className="text-slate-400 mt-1">Real-time monitoring and optimization insights</p>
          </div>
          <div className="flex items-center gap-4">
            <PerformanceScoreIndicator score={autoOptimization.performanceScore} />
            {autoOptimization.isOptimizing && (
              <Badge variant="outline" className="bg-amber-500/20 text-amber-300 border-amber-500/30">
                <Zap className="w-3 h-3 mr-1" />
                Optimizing
              </Badge>
            )}
          </div>
        </div>
        
        {/* Core Web Vitals */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Core Web Vitals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="First Contentful Paint"
              value={metrics.coreWebVitals.fcp !== undefined ? `${Math.round(metrics.coreWebVitals.fcp)}ms` : "N/A"}
              icon={<Clock className="w-4 h-4" />}
              status={getMetricStatus(metrics.coreWebVitals.fcp, 1800, 3000)}
            />
            <MetricCard
              title="Largest Contentful Paint"
              value={metrics.coreWebVitals.lcp !== undefined ? `${Math.round(metrics.coreWebVitals.lcp)}ms` : "N/A"}
              icon={<Monitor className="w-4 h-4" />}
              status={getMetricStatus(metrics.coreWebVitals.lcp, 2500, 4000)}
            />
            <MetricCard
              title="First Input Delay"
              value={metrics.coreWebVitals.fid !== undefined ? `${Math.round(metrics.coreWebVitals.fid)}ms` : "N/A"}
              icon={<Activity className="w-4 h-4" />}
              status={getMetricStatus(metrics.coreWebVitals.fid, 100, 300)}
            />
            <MetricCard
              title="Cumulative Layout Shift"
              value={metrics.coreWebVitals.cls !== undefined ? metrics.coreWebVitals.cls.toFixed(3) : "N/A"}
              icon={<TrendingUp className="w-4 h-4" />}
              status={getMetricStatus(metrics.coreWebVitals.cls, 0.1, 0.25)}
            />
          </div>
        </div>
        
        {/* Device & Network */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Cpu className="w-5 h-5" />
            Device & Network
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Device Tier"
              value={deviceProfile.tier}
              icon={<Monitor className="w-4 h-4" />}
            />
            <MetricCard
              title="Battery Level"
              value={deviceProfile.batteryLevel !== undefined ? `${Math.round(deviceProfile.batteryLevel)}%` : "N/A"}
              icon={<Battery className="w-4 h-4" />}
              status={deviceProfile.batteryLevel !== undefined && deviceProfile.batteryLevel < 20 ? "bad" : "good"}
            />
            <MetricCard
              title="Network Quality"
              value={networkAware.networkState.connectionQuality}
              icon={<Wifi className="w-4 h-4" />}
              status={networkAware.networkState.connectionQuality === "excellent" ? "good" : 
                     networkAware.networkState.connectionQuality === "poor" ? "bad" : "warning"}
            />
            <MetricCard
              title="Memory Usage"
              value={metrics.resourceUsage.memoryPressure !== undefined ? 
                     `${Math.round(metrics.resourceUsage.memoryPressure * 100)}%` : "N/A"}
              icon={<Download className="w-4 h-4" />}
              status={getMetricStatus(metrics.resourceUsage.memoryPressure, 0.7, 0.9)}
            />
          </div>
        </div>
        
        {/* Resource Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Download className="w-5 h-5" />
            Resource Metrics
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Images Loaded"
              value={metrics.resources.imagesLoaded ?? 0}
              unit="images"
              icon={<ImageIcon className="w-4 h-4" />}
            />
            <MetricCard
              title="Failed Requests"
              value={metrics.resources.failedRequests ?? 0}
              icon={<XCircle className="w-4 h-4" />}
              status={(metrics.resources.failedRequests ?? 0) > 0 ? "bad" : "good"}
            />
            <MetricCard
              title="Avg Response Time"
              value={metrics.resources.avgResponseTime !== undefined ? 
                     `${Math.round(metrics.resources.avgResponseTime)}ms` : "N/A"}
              icon={<Clock className="w-4 h-4" />}
              status={getMetricStatus(metrics.resources.avgResponseTime, 200, 500)}
            />
            <MetricCard
              title="Frame Rate"
              value={metrics.resourceUsage.fps !== undefined ? 
                     `${Math.round(metrics.resourceUsage.fps)} FPS` : "N/A"}
              icon={<Activity className="w-4 h-4" />}
              status={getMetricStatus(metrics.resourceUsage.fps, 30, 20)}
            />
          </div>
        </div>
        
        {/* Optimization Status */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Optimization Status
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Current Optimizations</CardTitle>
              </CardHeader>
              <CardContent>
                {autoOptimization.activeOptimizations.length > 0 ? (
                  <div className="space-y-3">
                    {autoOptimization.activeOptimizations.map((optimization, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="font-mono">{optimization}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400">No active optimizations</p>
                )}
              </CardContent>
            </Card>
            
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-lg text-white">Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {autoOptimization.getOptimizationRecommendations().map((recommendation, index) => (
                    <OptimizationRecommendation key={index} recommendation={recommendation} />
                  ))}
                  {performanceMonitoring.getRecommendations().map((recommendation, index) => (
                    <OptimizationRecommendation key={`perf-${index}`} recommendation={recommendation} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Detailed Metrics */}
        <div>
          <h2 className="text-xl font-semibold text-white mb-4">Detailed Metrics</h2>
          <Card className="bg-slate-800/50 border-slate-700">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-slate-300 mb-3">Component Performance</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Avg Render Time:</span>
                      <span className="text-white">
                        {metrics.components.avgRenderTime !== undefined ? 
                         `${Math.round(metrics.components.avgRenderTime)}ms` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Max Render Time:</span>
                      <span className="text-white">
                        {metrics.components.maxRenderTime !== undefined ? 
                         `${Math.round(metrics.components.maxRenderTime)}ms` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Slow Renders:</span>
                      <span className="text-white">{metrics.components.slowRenders ?? 0}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-medium text-slate-300 mb-3">Network Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Connection Type:</span>
                      <span className="text-white capitalize">{networkAware.networkState.effectiveType}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Downlink:</span>
                      <span className="text-white">
                        {networkAware.networkState.downlink > 0 ? 
                         `${networkAware.networkState.downlink} Mbps` : "N/A"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RTT:</span>
                      <span className="text-white">
                        {networkAware.networkState.rtt > 0 ? 
                         `${networkAware.networkState.rtt} ms` : "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
