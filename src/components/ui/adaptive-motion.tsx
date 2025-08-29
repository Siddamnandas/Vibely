"use client";

import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useDevicePerformance } from "@/hooks/use-device-performance";

interface AdaptiveMotionProps {
  children: React.ReactNode;
  className?: string;
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  whileHover?: any;
  whileTap?: any;
  drag?: boolean | "x" | "y";
  dragConstraints?: any;
  onDragEnd?: (event: any, info: any) => void;
  layout?: boolean;
  layoutId?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  as?: keyof JSX.IntrinsicElements;
}

export function AdaptiveMotion({
  children,
  className,
  initial,
  animate,
  exit,
  transition,
  whileHover,
  whileTap,
  drag,
  dragConstraints,
  onDragEnd,
  layout,
  layoutId,
  style,
  onClick,
  as = "div",
  ...props
}: AdaptiveMotionProps) {
  const deviceProfile = useDevicePerformance();
  const prefersReducedMotion = useReducedMotion();

  // Determine if animations should be reduced or disabled
  const shouldReduceAnimations = !deviceProfile.shouldUseAnimations || !!prefersReducedMotion;
  const shouldDisableComplexAnimations =
    deviceProfile.isLowEndDevice || deviceProfile.tier === "low";

  // Adaptive animation settings
  const adaptiveProps = getAdaptiveAnimationProps({
    initial,
    animate,
    exit,
    transition,
    whileHover,
    whileTap,
    shouldReduceAnimations,
    shouldDisableComplexAnimations,
  });

  // For very low-end devices, just render a plain div
  if (shouldReduceAnimations && shouldDisableComplexAnimations) {
    const Component = as as any;
    return (
      <Component className={className} style={style} onClick={onClick} {...props}>
        {children}
      </Component>
    );
  }

  const MotionComponent = motion[as as keyof typeof motion] as any;

  return (
    <MotionComponent
      className={className}
      style={style}
      onClick={onClick}
      drag={shouldDisableComplexAnimations ? false : drag}
      dragConstraints={shouldDisableComplexAnimations ? undefined : dragConstraints}
      onDragEnd={shouldDisableComplexAnimations ? undefined : onDragEnd}
      layout={shouldDisableComplexAnimations ? false : layout}
      layoutId={shouldDisableComplexAnimations ? undefined : layoutId}
      {...adaptiveProps}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

interface AdaptiveAnimatePresenceProps {
  children: React.ReactNode;
  mode?: "wait" | "sync" | "popLayout";
  initial?: boolean;
}

export function AdaptiveAnimatePresence({
  children,
  mode,
  initial = true,
}: AdaptiveAnimatePresenceProps) {
  const deviceProfile = useDevicePerformance();
  const prefersReducedMotion = useReducedMotion();

  const shouldReduceAnimations = !deviceProfile.shouldUseAnimations || prefersReducedMotion;

  // For low-end devices, just render children without AnimatePresence
  if (shouldReduceAnimations && deviceProfile.isLowEndDevice) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence mode={mode} initial={initial}>
      {children}
    </AnimatePresence>
  );
}

function getAdaptiveAnimationProps({
  initial,
  animate,
  exit,
  transition,
  whileHover,
  whileTap,
  shouldReduceAnimations,
  shouldDisableComplexAnimations,
}: {
  initial?: any;
  animate?: any;
  exit?: any;
  transition?: any;
  whileHover?: any;
  whileTap?: any;
  shouldReduceAnimations: boolean;
  shouldDisableComplexAnimations: boolean;
}) {
  if (shouldReduceAnimations) {
    return {
      initial: false,
      animate: false,
      exit: false,
      transition: { duration: 0 },
      whileHover: undefined,
      whileTap: shouldDisableComplexAnimations ? undefined : { scale: 0.98 }, // Keep minimal tap feedback
    };
  }

  if (shouldDisableComplexAnimations) {
    // Simplify animations for low-end devices
    return {
      initial: simplifyAnimation(initial),
      animate: simplifyAnimation(animate),
      exit: simplifyAnimation(exit),
      transition: simplifyTransition(transition),
      whileHover: simplifyAnimation(whileHover),
      whileTap: whileTap || { scale: 0.95 },
    };
  }

  return {
    initial,
    animate,
    exit,
    transition,
    whileHover,
    whileTap,
  };
}

function simplifyAnimation(animation: any): any {
  if (!animation || typeof animation !== "object") return animation;

  // Remove complex animations, keep only opacity and scale
  const simplified: any = {};

  if ("opacity" in animation) {
    simplified.opacity = animation.opacity;
  }

  if ("scale" in animation) {
    simplified.scale = animation.scale;
  }

  // Convert complex transforms to simple ones
  if ("y" in animation) {
    simplified.y = typeof animation.y === "string" ? "0%" : 0;
  }

  if ("x" in animation) {
    simplified.x = typeof animation.x === "string" ? "0%" : 0;
  }

  return Object.keys(simplified).length > 0 ? simplified : false;
}

function simplifyTransition(transition: any): any {
  if (!transition || typeof transition !== "object") {
    return { duration: 0.2, ease: "easeOut" };
  }

  return {
    duration: Math.min(transition.duration || 0.2, 0.3), // Cap duration
    ease: "easeOut", // Use simple easing
    type: "tween", // Avoid spring animations on low-end devices
  };
}

// Hook for conditional animation rendering
export function useAdaptiveAnimations() {
  const deviceProfile = useDevicePerformance();
  const prefersReducedMotion = useReducedMotion();

  return {
    shouldUseAnimations: deviceProfile.shouldUseAnimations && !prefersReducedMotion,
    shouldSimplifyAnimations: deviceProfile.isLowEndDevice,
    maxAnimationDuration:
      deviceProfile.tier === "low" ? 200 : deviceProfile.tier === "medium" ? 300 : 500,
  };
}
