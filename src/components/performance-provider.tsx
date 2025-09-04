"use client";

// Simplified Performance Provider to avoid conflicts with navigation fixes
export function PerformanceProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
