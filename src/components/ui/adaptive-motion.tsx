"use client";

import React from "react";
import { motion } from "framer-motion";

interface AdaptiveMotionProps extends React.HTMLAttributes<HTMLDivElement> {
  as?: React.ElementType;
  initial?: any;
  animate?: any;
  transition?: any;
}

/**
 * AdaptiveMotion wrapper for Framer Motion with device performance considerations
 */
export function AdaptiveMotion({
  as: Component = "div",
  children,
  initial,
  animate,
  transition = {},
  ...props
}: AdaptiveMotionProps) {
  // Use motion.div as the base component for all cases
  const MotionComponent = motion.div;

  // Simplify animations for better performance
  const simplifiedTransition = {
    duration: 0.3,
    ease: "easeOut",
    ...transition,
  };

  return (
    <MotionComponent
      as={Component}
      initial={initial}
      animate={animate}
      transition={simplifiedTransition}
      style={Component !== "div" ? { display: "block" } : undefined}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
