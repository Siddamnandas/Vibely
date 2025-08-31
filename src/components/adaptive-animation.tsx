"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";
import { useBatteryAwarePerformance } from "@/hooks/use-battery-aware-performance";

interface AnimationConfig {
  duration: number;
  easing: string;
  enabled: boolean;
  reducedMotion: boolean;
}

interface AdaptiveAnimationProfile {
  transitions: AnimationConfig;
  microInteractions: AnimationConfig;
  pageTransitions: AnimationConfig;
  loadingAnimations: AnimationConfig;
  decorativeAnimations: AnimationConfig;
}

interface AnimationContextType {
  profile: AdaptiveAnimationProfile;
  updateConfig: (updates: Partial<AdaptiveAnimationProfile>) => void;
  shouldAnimate: (type: keyof AdaptiveAnimationProfile) => boolean;
  getAnimationStyle: (type: keyof AdaptiveAnimationProfile, customDuration?: number) => React.CSSProperties;
}

const AnimationContext = createContext<AnimationContextType | null>(null);

// Default animation profiles for different performance tiers
const animationProfiles = {
  high: {
    transitions: { duration: 300, easing: "cubic-bezier(0.4, 0, 0.2, 1)", enabled: true, reducedMotion: false },
    microInteractions: { duration: 150, easing: "cubic-bezier(0.4, 0, 0.2, 1)", enabled: true, reducedMotion: false },
    pageTransitions: { duration: 500, easing: "cubic-bezier(0.4, 0, 0.2, 1)", enabled: true, reducedMotion: false },
    loadingAnimations: { duration: 1000, easing: "ease-in-out", enabled: true, reducedMotion: false },
    decorativeAnimations: { duration: 2000, easing: "ease-in-out", enabled: true, reducedMotion: false },
  },
  medium: {
    transitions: { duration: 200, easing: "ease", enabled: true, reducedMotion: false },
    microInteractions: { duration: 100, easing: "ease", enabled: true, reducedMotion: false },
    pageTransitions: { duration: 300, easing: "ease", enabled: true, reducedMotion: false },
    loadingAnimations: { duration: 800, easing: "ease-in-out", enabled: true, reducedMotion: false },
    decorativeAnimations: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
  },
  low: {
    transitions: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
    microInteractions: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
    pageTransitions: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
    loadingAnimations: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
    decorativeAnimations: { duration: 0, easing: "none", enabled: false, reducedMotion: true },
  },
};

export function AdaptiveAnimationProvider({ children }: { children: ReactNode }) {
  const deviceProfile = useDevicePerformance();
  const { performanceProfile, getAnimationConfig } = useBatteryAwarePerformance();
  const [profile, setProfile] = useState<AdaptiveAnimationProfile>(animationProfiles.medium);

  useEffect(() => {
    // Determine base profile from device performance
    let baseProfile = animationProfiles[deviceProfile.tier];
    
    // Apply battery-aware adjustments
    const batteryConfig = getAnimationConfig();
    
    // Apply reduced motion preferences
    if (deviceProfile.isReducedMotion) {
      baseProfile = animationProfiles.low;
    }
    
    // Create adaptive profile
    const adaptiveProfile: AdaptiveAnimationProfile = {
      transitions: {
        ...baseProfile.transitions,
        duration: batteryConfig.enabled ? batteryConfig.duration : 0,
        enabled: batteryConfig.enabled && baseProfile.transitions.enabled,
      },
      microInteractions: {
        ...baseProfile.microInteractions,
        duration: batteryConfig.enabled ? Math.min(batteryConfig.duration, baseProfile.microInteractions.duration) : 0,
        enabled: batteryConfig.enabled && baseProfile.microInteractions.enabled,
      },
      pageTransitions: {
        ...baseProfile.pageTransitions,
        duration: batteryConfig.enabled ? batteryConfig.duration * 1.5 : 0,
        enabled: batteryConfig.enabled && baseProfile.pageTransitions.enabled && !performanceProfile.shouldReduceAnimations,
      },
      loadingAnimations: {
        ...baseProfile.loadingAnimations,
        duration: batteryConfig.enabled ? baseProfile.loadingAnimations.duration : 0,
        enabled: batteryConfig.enabled && baseProfile.loadingAnimations.enabled,
      },
      decorativeAnimations: {
        ...baseProfile.decorativeAnimations,
        duration: batteryConfig.enabled && !performanceProfile.shouldReduceAnimations ? baseProfile.decorativeAnimations.duration : 0,
        enabled: batteryConfig.enabled && baseProfile.decorativeAnimations.enabled && !performanceProfile.shouldReduceAnimations,
      },
    };

    setProfile(adaptiveProfile);
  }, [deviceProfile, performanceProfile, getAnimationConfig]);

  const updateConfig = (updates: Partial<AdaptiveAnimationProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  const shouldAnimate = (type: keyof AdaptiveAnimationProfile): boolean => {
    return profile[type].enabled && profile[type].duration > 0;
  };

  const getAnimationStyle = (
    type: keyof AdaptiveAnimationProfile, 
    customDuration?: number
  ): React.CSSProperties => {
    const config = profile[type];
    
    if (!config.enabled || config.duration === 0) {
      return {
        transition: 'none',
        animation: 'none',
      };
    }

    return {
      transitionDuration: `${customDuration || config.duration}ms`,
      transitionTimingFunction: config.easing,
      animationDuration: `${customDuration || config.duration}ms`,
      animationTimingFunction: config.easing,
    };
  };

  const value: AnimationContextType = {
    profile,
    updateConfig,
    shouldAnimate,
    getAnimationStyle,
  };

  return (
    <AnimationContext.Provider value={value}>
      {children}
    </AnimationContext.Provider>
  );
}

export function useAdaptiveAnimation() {
  const context = useContext(AnimationContext);
  if (!context) {
    throw new Error('useAdaptiveAnimation must be used within AdaptiveAnimationProvider');
  }
  return context;
}

// Adaptive animation components
interface AdaptiveTransitionProps {
  children: ReactNode;
  type?: keyof AdaptiveAnimationProfile;
  className?: string;
  style?: React.CSSProperties;
  customDuration?: number;
  show?: boolean;
}

export function AdaptiveTransition({ 
  children, 
  type = 'transitions', 
  className = '',
  style = {},
  customDuration,
  show = true 
}: AdaptiveTransitionProps) {
  const { getAnimationStyle, shouldAnimate } = useAdaptiveAnimation();
  
  const animationStyle = shouldAnimate(type) 
    ? getAnimationStyle(type, customDuration)
    : { transition: 'none' };

  const transitionStyle = {
    ...animationStyle,
    opacity: show ? 1 : 0,
    transform: show ? 'translateY(0)' : 'translateY(10px)',
    ...style,
  };

  return (
    <div className={className} style={transitionStyle}>
      {children}
    </div>
  );
}

// Adaptive loading spinner
export function AdaptiveLoadingSpinner({ 
  size = 24, 
  className = "" 
}: { 
  size?: number; 
  className?: string; 
}) {
  const { shouldAnimate, getAnimationStyle } = useAdaptiveAnimation();
  
  if (!shouldAnimate('loadingAnimations')) {
    return (
      <div 
        className={`border-2 border-white/20 border-t-white rounded-full ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  const animationStyle = getAnimationStyle('loadingAnimations');
  
  return (
    <div 
      className={`border-2 border-white/20 border-t-white rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        animation: `spin ${animationStyle.animationDuration} linear infinite`,
        ...animationStyle,
      }}
    />
  );
}

// Adaptive hover effects
export function AdaptiveHoverCard({ 
  children, 
  className = "",
  hoverScale = 1.05 
}: { 
  children: ReactNode; 
  className?: string;
  hoverScale?: number;
}) {
  const { shouldAnimate, getAnimationStyle } = useAdaptiveAnimation();
  const [isHovered, setIsHovered] = useState(false);
  
  const animationStyle = shouldAnimate('microInteractions') 
    ? getAnimationStyle('microInteractions')
    : { transition: 'none' };

  const transformStyle = shouldAnimate('microInteractions') && isHovered
    ? { transform: `scale(${hoverScale})` }
    : { transform: 'scale(1)' };

  return (
    <div
      className={className}
      style={{ ...animationStyle, ...transformStyle }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children}
    </div>
  );
}

// Adaptive page transition wrapper
export function AdaptivePageTransition({ 
  children, 
  isVisible = true 
}: { 
  children: ReactNode; 
  isVisible?: boolean; 
}) {
  const { shouldAnimate, getAnimationStyle } = useAdaptiveAnimation();
  
  if (!shouldAnimate('pageTransitions')) {
    return <>{children}</>;
  }

  const animationStyle = getAnimationStyle('pageTransitions');
  
  return (
    <div
      style={{
        ...animationStyle,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateX(0)' : 'translateX(20px)',
      }}
    >
      {children}
    </div>
  );
}

// CSS-in-JS helper for adaptive animations
export function getAdaptiveAnimationCSS(profile: AdaptiveAnimationProfile) {
  return `
    .adaptive-transition {
      transition-duration: ${profile.transitions.duration}ms;
      transition-timing-function: ${profile.transitions.easing};
    }
    
    .adaptive-micro {
      transition-duration: ${profile.microInteractions.duration}ms;
      transition-timing-function: ${profile.microInteractions.easing};
    }
    
    .adaptive-page {
      transition-duration: ${profile.pageTransitions.duration}ms;
      transition-timing-function: ${profile.pageTransitions.easing};
    }
    
    .adaptive-loading {
      animation-duration: ${profile.loadingAnimations.duration}ms;
      animation-timing-function: ${profile.loadingAnimations.easing};
    }
    
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    
    @media (prefers-reduced-motion: reduce) {
      .adaptive-transition,
      .adaptive-micro,
      .adaptive-page,
      .adaptive-loading {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
}