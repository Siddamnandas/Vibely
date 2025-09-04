"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "destructive" | "outline";
  size?: "sm" | "md" | "lg";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center font-semibold transition-colors border focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",

          // Size variants
          {
            "px-2 py-0.5 text-xs rounded": size === "sm",
            "px-2.5 py-0.5 text-sm rounded-md": size === "md",
            "px-3 py-1 text-base rounded-lg": size === "lg",
          },

          // Variant styles
          {
            "bg-primary text-primary-foreground border-primary hover:bg-primary/80": variant === "default",
            "bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/80": variant === "secondary",
            "bg-destructive text-destructive-foreground border-destructive hover:bg-destructive/80": variant === "destructive",
            "border-input bg-background hover:bg-accent hover:text-accent-foreground": variant === "outline",
          },
          className
        )}
        {...props}
      />
    );
  }
);

Badge.displayName = "Badge";

export { Badge };
