"use client";

import { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamic import to improve loading performance
const PerformanceDashboard = dynamic(() => import('@/components/ui/performance-dashboard'), {
  ssr: false, // Disable SSR for this component as it contains client-side only features
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold text-white mb-2">Loading System Dashboard</h2>
        <p className="text-gray-400">Initializing monitoring infrastructure...</p>
      </div>
    </div>
  )
});

export default function SystemDashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-20 h-20 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Initializing Performance Data</h2>
          <p className="text-gray-400">Connecting to infrastructure monitoring...</p>
        </div>
      </div>
    }>
      <PerformanceDashboard />
    </Suspense>
  );
}
