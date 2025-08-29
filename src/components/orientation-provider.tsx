"use client";

import React, { useEffect } from "react";
import { mobileOrientationService } from "@/lib/mobile-orientation-service";

interface OrientationProviderProps {
  children: React.ReactNode;
  config?: {
    enableLayoutOptimization?: boolean;
    enableResponsiveSpacing?: boolean;
    trackOrientationChanges?: boolean;
  };
}

export function OrientationProvider({ 
  children, 
  config = {} 
}: OrientationProviderProps) {
  
  useEffect(() => {
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
    config.enableLayoutOptimization,
    config.enableResponsiveSpacing, 
    config.trackOrientationChanges
  ]);

  return <>{children}</>;
}