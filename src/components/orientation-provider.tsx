"use client";

import React, { useEffect, useState } from "react";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";

interface OrientationProviderProps {
  children: React.ReactNode;
  config?: {
    enableLayoutOptimization?: boolean;
    enableResponsiveSpacing?: boolean;
    trackOrientationChanges?: boolean;
  };
}

export function OrientationProvider({ children, config = {} }: OrientationProviderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only initialize on the client side after hydration
    if (!isClient) return;

    // Update service configuration
    mobileOrientationService.updateConfig({
      enableLayoutOptimization: config.enableLayoutOptimization ?? true,
      enableResponsiveSpacing: config.enableResponsiveSpacing ?? true,
      trackOrientationChanges: config.trackOrientationChanges ?? true,
      debounceDelay: 150,
    });

    // Force initial optimization
    mobileOrientationService.forceRefresh();

    // Log initialization
    console.log("📱 Orientation Provider initialized");
  }, [
    isClient,
    config.enableLayoutOptimization,
    config.enableResponsiveSpacing,
    config.trackOrientationChanges,
  ]);

  return <>{children}</>;
}
