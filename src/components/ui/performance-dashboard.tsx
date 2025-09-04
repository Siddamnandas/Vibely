"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Activity, TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock,
  Zap, Database, Settings, RefreshCw, Play, Pause, Users, Cpu,
  MemoryStick, Shield, AlertTriangle, Info, X, Maximize2,
  Minimize2, Trophy, Target, BarChart3, PieChart as PieChartIcon,
  ActivityIcon, Wifi, WifiOff, HardDrive, DollarSign,
  Timer, Users2, Globe, Eye, EyeOff
} from 'lucide-react';

// Interfaces for dashboard data
interface QueueMetric {
  name: string;
  size: number;
  pendingTasks: number;
  activeWorkers: number;
  avgProcessingTime: number;
  successRate: number;
  throughput: number;
}

interface CircuitBreaker {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  successCount: number;
  lastFailure: Date;
  threshold: number;
  serviceName: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  resolved: boolean;
}

interface SystemMetrics {
  redisMemoryUsage: number;
  activeConnections: number;
  cacheHitRate: number;
  avgResponseTime: number;
  errorRate: number;
  uptime: number;
}

export function PerformanceDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTab, setSelectedTab] = useState<'queues' | 'system' | 'ai' | 'alerts' | 'circuit'>('queues');
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetch('/api/monitoring/queue-stats');
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
        setLastUpdate(new Date());
      } else {
        setError('Failed to fetch dashboard data');
      }
    } catch (err) {
      setError('Network error fetching dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchDashboardData, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 flex items-center justify-center"
      >
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h2>
          <p className="text-gray-400">Fetching real-time performance data...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="min-h-screen bg-gradient-to-br from-red-900/30 via-slate-900 to-purple-900/20 p-8 flex items-center justify-center"
      >
        <div className="text-center bg-red-500/10 border border-red-500/20 rounded-2xl p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Dashboard Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              fetchDashboardData();
            }}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300"
          >
            Retry
          </button>
        </div>
      </motion.div>
    );
  }

  const getStateColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-green-400';
      case 'half-open': return 'text-yellow-400';
      case 'open': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'closed': return CheckCircle;
      case 'half-open': return AlertCircle;
      case 'open': return X;
      default: return Info;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-8 transition-all duration-500 ${!isExpanded ? 'p-8' : 'p-4'}`}
    >
      {/* Header */}
      <motion.div
        className="flex items-center justify-between mb-8"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Performance Dashboard</h1>
            <p className="text-gray-400 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Last update: {lastUpdate.toLocaleTimeString()}
              <Wifi className="w-4 h-4 text-green-400" />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Health Score */}
          <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/20 rounded-xl px-4 py-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-400" />
              <span className="text-white font-semibold">{dashboardData?.overallHealth?.score || 95}%</span>
              <span className="text-gray-400 text-sm">Health</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchDashboardData}
              className={`p-2 rounded-xl transition-colors ${
                autoRefresh ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
              }`}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin' : ''}`} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 bg-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/30 transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <motion.div
        className="flex items-center gap-2 mb-8 bg-white/5 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 max-w-fit"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {[
          { id: 'queues', label: 'Queues', icon: Activity },
          { id: 'system', label: 'System', icon: Database },
          { id: 'ai', label: 'AI', icon: Zap },
          { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
          { id: 'circuit', label: 'Circuit Breakers', icon: Shield }
        ].map(({ id, label, icon: Icon }) => (
          <motion.button
            key={id}
            onClick={() => setSelectedTab(id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
              selectedTab === id
                ? 'bg-gradient-to-r from-purple-500 to-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Icon className="w-4 h-4" />
            {label}
          </motion.button>
        ))}
      </motion.div>

      {/* Dashboard Content */}
      <AnimatePresence mode="wait">
        {/* Queues Tab */}
        {selectedTab === 'queues' && (
          <motion.div
            key="queues"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {/* Queue Status Cards */}
            {Object.values(dashboardData?.queueStats || {}).map((queue: QueueMetric) => (
              <motion.div
                key={queue.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 hover:bg-white/15 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white capitalize">{queue.name} Queue</h3>
                  <div className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs font-medium">
                    Active
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Queue Size</span>
                    <span className="text-white font-semibold">{queue.size}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Active Workers</span>
                    <span className="text-white font-semibold">{queue.activeWorkers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Throughput</span>
                    <span className="text-green-400 font-semibold">{queue.throughput}/min</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">Success Rate</span>
                    <span className="text-blue-400 font-semibold">{(queue.successRate * 100).toFixed(1)}%</span>
                  </div>
                </div>

                {/* Mini Chart Placeholder */}
                <div className="mt-4 h-16 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-purple-400 opacity-50" />
                </div>
              </motion.div>
            ))}

            {/* Queue Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 xl:col-span-3 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Queue Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={Object.values(dashboardData?.queueStats || {})}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(31, 41, 55, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Line type="monotone" dataKey="throughput" stroke="#8B5CF6" strokeWidth={3} />
                  <Line type="monotone" dataKey="activeWorkers" stroke="#10B981" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        {/* System Tab */}
        {selectedTab === 'system' && (
          <motion.div
            key="system"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6"
          >
            {[
              {
                title: 'Memory Usage',
                value: `${(dashboardData?.systemMetrics?.redisMemoryUsage || 0).toFixed(1)} MB`,
                icon: MemoryStick,
                color: 'text-blue-400',
                gradient: 'from-blue-500/10 to-cyan-500/10'
              },
              {
                title: 'Active Connections',
                value: `${dashboardData?.systemMetrics?.activeConnections || 0}`,
                icon: Users,
                color: 'text-green-400',
                gradient: 'from-green-500/10 to-emerald-500/10'
              },
              {
                title: 'Cache Hit Rate',
                value: `${((dashboardData?.systemMetrics?.cacheHitRate || 0) * 100).toFixed(1)}%`,
                icon: Target,
                color: 'text-purple-400',
                gradient: 'from-purple-500/10 to-violet-500/10'
              },
              {
                title: 'Avg Response Time',
                value: `${(dashboardData?.systemMetrics?.avgResponseTime || 0).toFixed(0)}ms`,
                icon: Timer,
                color: 'text-orange-400',
                gradient: 'from-orange-500/10 to-red-500/10'
              }
            ].map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`bg-gradient-to-br ${metric.gradient} border border-white/10 rounded-2xl p-6 hover:bg-white/5 transition-all duration-300`}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl bg-white/10`}>
                    <metric.icon className={`w-6 h-6 ${metric.color}`} />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">{metric.title}</p>
                    <p className="text-white text-2xl font-bold">{metric.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* System Health Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="lg:col-span-2 xl:col-span-4 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">System Performance</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={[
                  { time: '1m', cpu: 35, memory: 65, network: 40 },
                  { time: '2m', cpu: 42, memory: 68, network: 38 },
                  { time: '3m', cpu: 38, memory: 66, network: 42 },
                  { time: '4m', cpu: 45, memory: 70, network: 35 },
                  { time: '5m', cpu: 40, memory: 67, network: 38 }
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(31, 41, 55, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '0.5rem'
                    }}
                  />
                  <Area type="monotone" dataKey="cpu" stroke="#10B981" fill="#10B981" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="memory" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}

        {/* Circuit Breakers Tab */}
        {selectedTab === 'circuit' && (
          <motion.div
            key="circuit"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid gap-6"
          >
            {Object.values(dashboardData?.circuitBreakers || {}).map((breaker: CircuitBreaker) => {
              const StateIcon = getStateIcon(breaker.state);
              const stateColor = getStateColor(breaker.state);

              return (
                <motion.div
                  key={breaker.serviceName}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${breaker.state === 'closed' ? 'bg-green-500/20' : breaker.state === 'open' ? 'bg-red-500/20' : 'bg-yellow-500/20'}`}>
                        <StateIcon className={`w-6 h-6 ${stateColor}`} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{breaker.serviceName}</h3>
                        <p className={`text-sm capitalize ${stateColor}`}>{breaker.state} State</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-gray-400 text-sm">Success/Failures</p>
                      <p className="text-white font-semibold">{breaker.successCount} / {breaker.failures}</p>
                    </div>
                  </div>

                  {breaker.state !== 'closed' && (
                    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <p className="text-yellow-400 text-sm">
                        Service {breaker.state === 'half-open' ? 'recovering' : 'unavailable'}.
                        Last failure: {breaker.lastFailure.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Alerts Tab */}
        {selectedTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            {['critical', 'warning', 'info'].map((type) =>
              dashboardData?.alerts?.[type]?.map((alert: Alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-2xl border backdrop-blur-2xl ${
                    type === 'critical'
                      ? 'bg-red-500/10 border-red-500/20'
                      : type === 'warning'
                        ? 'bg-yellow-500/10 border-yellow-500/20'
                        : 'bg-blue-500/10 border-blue-500/20'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg ${
                      type === 'critical'
                        ? 'bg-red-500/20'
                        : type === 'warning'
                          ? 'bg-yellow-500/20'
                          : 'bg-blue-500/20'
                    }`}>
                      {type === 'critical' ?
                        <AlertTriangle className={`w-5 h-5 ${type === 'critical' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} /> :
                        type === 'warning' ?
                          <AlertCircle className={`w-5 h-5 ${type === 'critical' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} /> :
                          <Info className={`w-5 h-5 ${type === 'critical' ? 'text-red-400' : type === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`} />
                      }
                    </div>
                    <div className="flex-1">
                      <p className="text-white font-medium">{alert.message}</p>
                      <p className="text-gray-400 text-sm mt-1">
                        {alert.timestamp.toLocaleString()}
                      </p>
                    </div>
                    <button className="text-gray-400 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}

            {/* Empty State */}
            {(!dashboardData?.alerts?.critical?.length &&
              !dashboardData?.alerts?.warning?.length &&
              !dashboardData?.alerts?.info?.length) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">All Systems Healthy</h3>
                <p className="text-gray-400">No active alerts detected</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* AI Tab */}
        {selectedTab === 'ai' && (
          <motion.div
            key="ai"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* AI Metrics Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-purple-500/20 rounded-xl">
                  <Zap className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">AI Generatio'ns Today</h3>
                  <p className="text-gray-400 text-sm">Cover creations and processing</p>
                </div>
              </div>
              <p className="text-white text-3xl font-bold">
                {dashboardData?.aiMetrics?.totalGenerationsToday || 0}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-white/10 rounded-2xl p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 bg-green-500/20 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-lg">API Costs Today</h3>
                  <p className="text-gray-400 text-sm">External service expenses</p>
                </div>
              </div>
              <p className="text-white text-3xl font-bold">
                ${(dashboardData?.aiMetrics?.apiCostsToday || 0).toFixed(2)}
              </p>
            </motion.div>

            {/* Model Performance Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2 bg-white/10 backdrop-blur-2xl border border-white/10 rounded-2xl p-6"
            >
              <h3 className="text-xl font-semibold text-white mb-4">Model Performance</h3>
              <ResponsiveContainer width="100%" height={300}>
                <RadarChart data={Object.entries(dashboardData?.aiMetrics?.modelSuccessRates || {}).map(([model, rate]) => ({
                  model: model.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  successRate: (rate as number) * 100
                }))}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="model" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  />
                  <Radar
                    name="Success Rate"
                    dataKey="successRate"
                    stroke="#8B5CF6"
                    fill="#8B5CF6"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default PerformanceDashboard;
