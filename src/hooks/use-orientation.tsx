"use client";

import { useState, useEffect } from "react";
import {
  mobileOrientationService,
  OrientationState,
  OrientationConfig,
} from "@/lib/mobile-orientation-service";

/**
 * React hook for mobile orientation management
 * @param config Optional configuration for orientation handling
 * @returns Orientation state and utility functions
 */
export function useOrientation(config?: Partial<OrientationConfig>) {
  const [orientationState, setOrientationState] = useState<OrientationState>(
    mobileOrientationService.getState(),
  );

  useEffect(() => {
    // Update service config if provided
    if (config) {
      mobileOrientationService.updateConfig(config);
    }

    // Subscribe to orientation changes
    const unsubscribe = mobileOrientationService.onOrientationChange(setOrientationState);

    return unsubscribe;
  }, [config]);

  return {
    // Orientation state
    ...orientationState,

    // Utility functions
    isPortrait: mobileOrientationService.isPortrait(),
    isLandscape: mobileOrientationService.isLandscape(),

    // Layout helpers
    getOptimalMiniPlayerSize:
      mobileOrientationService.getOptimalMiniPlayerSize.bind(mobileOrientationService),
    getOrientationCSS: mobileOrientationService.getOrientationCSS.bind(mobileOrientationService),

    // Control functions
    forceRefresh: mobileOrientationService.forceRefresh.bind(mobileOrientationService),
    updateConfig: mobileOrientationService.updateConfig.bind(mobileOrientationService),
  };
}

/**
 * Hook for responsive design based on screen size and orientation
 */
export function useResponsiveDesign() {
  const orientation = useOrientation();

  const getBreakpoint = () => {
    const { availableWidth, orientation: currentOrientation } = orientation;

    if (currentOrientation === "landscape") {
      if (availableWidth < 568) return "xs-landscape";
      if (availableWidth < 768) return "sm-landscape";
      if (availableWidth < 1024) return "md-landscape";
      return "lg-landscape";
    } else {
      if (availableWidth < 375) return "xs-portrait";
      if (availableWidth < 414) return "sm-portrait";
      if (availableWidth < 768) return "md-portrait";
      return "lg-portrait";
    }
  };

  const isMobile = () => orientation.availableWidth < 768;
  const isTablet = () => orientation.availableWidth >= 768 && orientation.availableWidth < 1024;
  const isDesktop = () => orientation.availableWidth >= 1024;

  const getSpacing = (base: number = 16) => {
    const multiplier = orientation.isLandscape ? 0.75 : 1;
    const sizeMultiplier = orientation.availableWidth < 375 ? 0.85 : 1;
    return Math.round(base * multiplier * sizeMultiplier);
  };

  return {
    ...orientation,
    breakpoint: getBreakpoint(),
    isMobile: isMobile(),
    isTablet: isTablet(),
    isDesktop: isDesktop(),
    getSpacing,
  };
}

/**
 * Hook specifically for mini-player responsive behavior
 */
export function useMiniPlayerResponsive() {
  const orientation = useOrientation({
    enableLayoutOptimization: true,
    trackOrientationChanges: true,
  });

  const getPlayerDimensions = () => {
    const optimal = orientation.getOptimalMiniPlayerSize();
    const isSmallScreen = orientation.availableWidth < 375;

    return {
      ...optimal,
      // Responsive margin adjustments
      marginX: orientation.isLandscape ? (isSmallScreen ? 8 : 12) : isSmallScreen ? 12 : 16,
      // Responsive border radius
      borderRadius: orientation.isLandscape ? 16 : 20,
      // Responsive padding
      padding: orientation.isLandscape ? 2 : 4,
    };
  };

  const getPlayerStyles = () => {
    const dimensions = getPlayerDimensions();

    return {
      height: `${dimensions.height}px`,
      borderRadius: `${dimensions.borderRadius}px`,
      marginLeft: `${dimensions.marginX}px`,
      marginRight: `${dimensions.marginX}px`,
    };
  };

  const getIconStyles = () => {
    const dimensions = getPlayerDimensions();

    return {
      width: `${dimensions.iconSize}px`,
      height: `${dimensions.iconSize}px`,
    };
  };

  return {
    ...orientation,
    dimensions: getPlayerDimensions(),
    playerStyles: getPlayerStyles(),
    iconStyles: getIconStyles(),

    // Icon size helpers
    getIconSize: (defaultSize: number = 18) => {
      return orientation.isLandscape ? Math.max(14, defaultSize - 2) : defaultSize;
    },

    // Animation helpers
    getAnimationConfig: () => ({
      initial: { y: orientation.isLandscape ? 80 : 100, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: orientation.isLandscape ? 80 : 100, opacity: 0 },
      transition: {
        type: "spring",
        stiffness: orientation.isLandscape ? 350 : 300,
        damping: 30,
      },
    }),
  };
}

export type { OrientationState, OrientationConfig };
