"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { usePlayback } from "@/context/playback-context";
import { useRegen } from "@/context/regen-context";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mobileOrientationService, OrientationState } from "@/lib/mobile-orientation-service";
import { SpotifyPremiumGate } from "@/components/spotify-premium-gate";

export function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { current, isPlaying, togglePlay, isSpotifyReady, isSpotifyPremium } = usePlayback();
  const { jobs } = useRegen();
  const hasActiveRegen = Object.values(jobs || {}).some((j) => j.status === "running");

  // Initialize with default state to prevent hydration mismatch
  const [orientationState, setOrientationState] = useState<OrientationState>({
    orientation: "portrait",
    angle: 0,
    isSupported: false,
    screenWidth: 375,
    screenHeight: 812,
    availableWidth: 375,
    availableHeight: 812,
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  });
  const [isClient, setIsClient] = useState(false);

  // Set client-side flag
  useEffect(() => {
    setIsClient(true);
    // Only set real orientation state on client
    setOrientationState(mobileOrientationService.getState());
  }, []);

  // Subscribe to orientation changes only on client
  useEffect(() => {
    if (!isClient) return;
    const unsubscribe = mobileOrientationService.onOrientationChange(setOrientationState);
    return unsubscribe;
  }, [isClient]);

  // Runtime guard – ensure layout CSS vars have sane fallbacks (client-side only)
  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    const root = document.documentElement;
    const navHeight = getComputedStyle(root).getPropertyValue("--nav-height").trim();
    if (!navHeight || navHeight === "0px") {
      console.warn("[mini-player] --nav-height missing; applying fallback 80px");
      root.style.setProperty("--nav-height", "80px");
    }
    const navGap = getComputedStyle(root).getPropertyValue("--nav-gap").trim();
    if (!navGap) {
      root.style.setProperty("--nav-gap", "16px");
    }
    const miniHeight = getComputedStyle(root).getPropertyValue("--mini-height").trim();
    if (!miniHeight || miniHeight === "0px") {
      console.warn("[mini-player] --mini-height missing; applying fallback 68px");
      root.style.setProperty("--mini-height", "68px");
    }
    const miniIcon = getComputedStyle(root).getPropertyValue("--mini-icon").trim();
    if (!miniIcon) {
      root.style.setProperty("--mini-icon", "44px");
    }
  }, [isClient]);

  // Apply orientation-specific CSS variables (client-side only)
  useEffect(() => {
    if (!isClient || typeof window === "undefined") return;
    const root = document.documentElement;
    const orientationCSS = mobileOrientationService.getOrientationCSS();

    Object.entries(orientationCSS).forEach(([property, value]) => {
      root.style.setProperty(property, value);
    });
  }, [orientationState, isClient]);

  if (!current) return null;

  // Show premium gate if Spotify is ready but user is not premium
  const showPremiumGate = isSpotifyReady && !isSpotifyPremium;

  // Use consistent default values during SSR and initial client render to prevent hydration mismatch
  const isLandscape = isClient && orientationState.orientation === "landscape";
  const optimalSize = isClient
    ? mobileOrientationService.getOptimalMiniPlayerSize()
    : {
        width: 343,
        height: 68,
        iconSize: 44,
      };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={cn(
            "fixed z-[58]",
            // Use consistent positioning during SSR to prevent hydration mismatch
            !isClient ? "left-4 right-4" : isLandscape ? "left-3 right-3" : "left-4 right-4",
          )}
          // Mini Player offset derives from CSS vars to avoid hardcoded spacing. Safe area included.
          style={{
            bottom: `var(--mini-offset-bottom, calc(var(--nav-height, 80px) + var(--nav-gap, 16px) + env(safe-area-inset-bottom, 0px)))`,
            maxWidth: `${optimalSize.width}px`,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          <div
            onClick={() => {
              try {
                navigator?.vibrate?.(6);
              } catch {}
              onExpand();
            }}
            role="button"
            aria-label="Mini player — expand full player"
            tabIndex={0}
            className={cn(
              "backdrop-blur-xl border border-white/10 shadow-2xl cursor-pointer transition-all duration-200 flex items-center justify-center bg-black/90 hover:bg-black/95",
              isPlaying && "mini--playing",
              // Orientation-specific styling
              isLandscape ? "rounded-2xl" : "rounded-2xl",
            )}
            style={{
              height: `var(--mini-height, ${optimalSize.height}px)`,
              borderRadius: `var(--mini-border-radius, 20px)`, // Use consistent default
            }}
          >
            {/* Centered Play/Pause button only */}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={(e) => {
                e.stopPropagation();
                // If user is not premium, show a message instead of playing
                if (showPremiumGate) {
                  // The premium gate will be shown by the SpotifyPremiumGate component
                  return;
                }
                togglePlay();
              }}
              aria-label={isPlaying ? "Pause" : "Play"}
              role="button"
              className="bg-white text-black rounded-full flex items-center justify-center hover:bg-white/90 transition-colors relative"
              style={{
                width: `var(--mini-icon, ${optimalSize.iconSize}px)`,
                height: `var(--mini-icon, ${optimalSize.iconSize}px)`,
              }}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}

              {hasActiveRegen && (
                <div
                  className="absolute"
                  style={{
                    top: "-6px",
                    right: "-6px",
                  }}
                >
                  <span className="relative inline-flex">
                    <span
                      className="absolute inline-flex rounded-full bg-[#9FFFA2]/70 opacity-75 animate-ping"
                      style={{
                        width: "12px",
                        height: "12px",
                      }}
                    />
                    <span
                      className="relative inline-flex rounded-full bg-[#9FFFA2] shadow-[0_0_0_1px_rgba(255,255,255,0.25)]"
                      style={{
                        width: "12px",
                        height: "12px",
                      }}
                    />
                  </span>
                </div>
              )}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
      <SpotifyPremiumGate />
    </>
  );
}
