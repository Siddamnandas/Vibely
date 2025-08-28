"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause } from "lucide-react";
import { usePlayback } from "@/context/playback-context";
import { useRegen } from "@/context/regen-context";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

export function MiniPlayer({ onExpand }: { onExpand: () => void }) {
  const { current, isPlaying, togglePlay } = usePlayback();
  const { jobs } = useRegen();
  const hasActiveRegen = Object.values(jobs || {}).some((j) => j.status === "running");

  // Runtime guard – ensure layout CSS vars have sane fallbacks
  useEffect(() => {
    if (typeof window === "undefined") return;
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
  }, []);

  if (!current) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-4 right-4 z-[58]"
        // Mini Player offset derives from CSS vars to avoid hardcoded spacing. Safe area included.
        style={{
          bottom: `var(--mini-offset-bottom, calc(var(--nav-height, 80px) + var(--nav-gap, 16px) + env(safe-area-inset-bottom, 0px)))`,
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
            "backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl cursor-pointer transition-colors flex items-center justify-center bg-black/90 hover:bg-black/95",
            isPlaying && "mini--playing",
          )}
          style={{ height: "var(--mini-height, 68px)" }}
        >
          {/* Centered Play/Pause button only */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            aria-label={isPlaying ? "Pause" : "Play"}
            role="button"
            className="bg-white text-black rounded-full flex items-center justify-center hover:bg-white/90 transition-colors relative"
            style={{ width: "var(--mini-icon, 44px)", height: "var(--mini-icon, 44px)" }}
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} />}

            {/* Regen indicator at top-right of the circular button (subtle pulse) */}
            {hasActiveRegen && (
              <div className="absolute" style={{ top: "-6px", right: "-6px" }}>
                <span className="relative inline-flex">
                  <span className="absolute inline-flex h-3 w-3 rounded-full bg-[#9FFFA2]/70 opacity-75 animate-ping" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#9FFFA2] shadow-[0_0_0_1px_rgba(255,255,255,0.25)]" />
                </span>
              </div>
            )}
          </motion.button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
