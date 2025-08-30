"use client";

import React from "react";
import { useDevicePerformance } from "@/hooks/use-device-performance";

// Base skeleton component with performance awareness
interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: "rectangular" | "circular" | "text";
  animation?: boolean;
}

export function Skeleton({ 
  width = "100%", 
  height = "1rem", 
  className = "", 
  variant = "rectangular",
  animation = true 
}: SkeletonProps) {
  const deviceProfile = useDevicePerformance();
  
  // Disable animations on low-end devices
  const shouldAnimate = animation && deviceProfile.shouldUseAnimations;
  
  const baseClasses = "bg-white/5 border border-white/10";
  const animationClasses = shouldAnimate ? "animate-pulse" : "";
  
  const variantClasses = {
    rectangular: "rounded",
    circular: "rounded-full",
    text: "rounded"
  };
  
  return (
    <div 
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses} ${className}`}
      style={{ width, height }}
    />
  );
}

// Music track skeleton
export function TrackSkeleton() {
  return (
    <div className="flex items-center space-x-3 p-3">
      <Skeleton variant="rectangular" width="48px" height="48px" />
      <div className="flex-1 space-y-2">
        <Skeleton width="70%" height="16px" />
        <Skeleton width="50%" height="12px" />
      </div>
      <Skeleton variant="circular" width="24px" height="24px" />
    </div>
  );
}

// Playlist skeleton
export function PlaylistSkeleton() {
  return (
    <div className="rounded-2xl bg-white/5 p-4 space-y-3">
      <Skeleton width="100%" height="120px" />
      <div className="space-y-2">
        <Skeleton width="80%" height="16px" />
        <Skeleton width="60%" height="12px" />
      </div>
    </div>
  );
}

// Navigation skeleton
export function NavSkeleton() {
  return (
    <div className="flex items-center justify-around h-24 bg-white/5 border-t border-white/10">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center space-y-1">
          <Skeleton variant="circular" width="24px" height="24px" />
          <Skeleton width="32px" height="8px" />
        </div>
      ))}
    </div>
  );
}

// Player skeleton
export function PlayerSkeleton() {
  return (
    <div className="fixed bottom-24 left-0 right-0 bg-white/10 backdrop-blur-md border-t border-white/20 p-4">
      <div className="flex items-center space-x-3">
        <Skeleton variant="rectangular" width="48px" height="48px" />
        <div className="flex-1 space-y-2">
          <Skeleton width="60%" height="14px" />
          <Skeleton width="40%" height="10px" />
        </div>
        <div className="flex space-x-2">
          <Skeleton variant="circular" width="32px" height="32px" />
          <Skeleton variant="circular" width="40px" height="40px" />
          <Skeleton variant="circular" width="32px" height="32px" />
        </div>
      </div>
    </div>
  );
}

// Page header skeleton
export function HeaderSkeleton() {
  return (
    <div className="flex items-center justify-between p-6 border-b border-white/10">
      <div className="space-y-2">
        <Skeleton width="120px" height="24px" />
        <Skeleton width="80px" height="14px" />
      </div>
      <Skeleton variant="circular" width="40px" height="40px" />
    </div>
  );
}

// Grid skeleton for music collections
export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 p-6">
      {Array.from({ length: count }, (_, i) => (
        <PlaylistSkeleton key={i} />
      ))}
    </div>
  );
}

// List skeleton for tracks
export function ListSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="space-y-1">
      {Array.from({ length: count }, (_, i) => (
        <TrackSkeleton key={i} />
      ))}
    </div>
  );
}

// Full page skeleton for major loading states
export function PageSkeleton() {
  return (
    <div className="min-h-screen bg-[#0E0F12]">
      <HeaderSkeleton />
      <div className="p-6 space-y-6">
        <div className="space-y-3">
          <Skeleton width="40%" height="20px" />
          <GridSkeleton count={4} />
        </div>
        <div className="space-y-3">
          <Skeleton width="50%" height="20px" />
          <ListSkeleton count={6} />
        </div>
      </div>
      <NavSkeleton />
    </div>
  );
}

// Onboarding skeleton
export function OnboardingSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#9FFFA2] via-[#87CEEB] to-[#FF6F91] p-6 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full space-y-8">
        <div className="text-center space-y-4">
          <Skeleton variant="circular" width="80px" height="80px" className="mx-auto" />
          <Skeleton width="60%" height="24px" className="mx-auto" />
          <Skeleton width="80%" height="16px" className="mx-auto" />
        </div>
        
        <div className="space-y-4">
          <Skeleton width="100%" height="48px" />
          <Skeleton width="100%" height="48px" />
        </div>
        
        <div className="flex justify-center space-x-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="circular" width="8px" height="8px" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Authentication flow skeleton
export function AuthSkeleton() {
  return (
    <div className="min-h-screen bg-[#0E0F12] flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm w-full">
        <Skeleton variant="circular" width="64px" height="64px" className="mx-auto" />
        <div className="space-y-3">
          <Skeleton width="80%" height="20px" className="mx-auto" />
          <Skeleton width="60%" height="14px" className="mx-auto" />
        </div>
        <div className="space-y-3">
          <Skeleton width="100%" height="44px" />
          <Skeleton width="100%" height="44px" />
        </div>
      </div>
    </div>
  );
}
