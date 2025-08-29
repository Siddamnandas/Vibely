"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import Image from "next/image";
import { VibelyTrack } from "@/lib/data";
import { cn } from "@/lib/utils";
import { usePlayback } from "@/context/playback-context";
import { Play, Pause, Loader2 } from "lucide-react";

interface SwipeableCardsProps {
  tracks: VibelyTrack[];
  onCardTap?: (songId: string) => void;
  onSwipeLeft?: (songId: string) => void;
  onSwipeRight?: (songId: string) => void;
  className?: string;
  isLoading?: boolean;
}

const SWIPE_THRESHOLD = 150;
const ROTATION_VALUES = [-8, 0, 8, -5]; // Alternating rotations for depth

export function SwipeableCards({
  tracks,
  onCardTap,
  onSwipeLeft,
  onSwipeRight,
  className,
  isLoading = false,
}: SwipeableCardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const { current: currentTrack, isPlaying } = usePlayback();

  // Reset index when tracks change
  useEffect(() => {
    if (tracks.length > 0 && currentIndex >= tracks.length) {
      setCurrentIndex(0);
    }
  }, [tracks, currentIndex]);

  // Sync with playback context when track changes
  useEffect(() => {
    if (currentTrack && tracks.length > 0) {
      const trackIndex = tracks.findIndex((track) => track.id === currentTrack.id);
      if (trackIndex !== -1 && trackIndex !== currentIndex) {
        setCurrentIndex(trackIndex);
      }
    }
  }, [currentTrack, currentIndex, tracks]);

  const handleDragEnd = useCallback(
    (event: any, info: PanInfo) => {
      const swipeThreshold = SWIPE_THRESHOLD;

      if (Math.abs(info.offset.x) > swipeThreshold) {
        if (info.offset.x > 0) {
          // Swiped right - previous track
          setDirection("right");
          onSwipeRight?.(tracks[currentIndex]?.id);
          setCurrentIndex((prev) => (prev > 0 ? prev - 1 : tracks.length - 1));
        } else {
          // Swiped left - next track
          setDirection("left");
          onSwipeLeft?.(tracks[currentIndex]?.id);
          setCurrentIndex((prev) => (prev + 1) % tracks.length);
        }

        // Reset direction after animation
        setTimeout(() => setDirection(null), 300);
      }
    },
    [currentIndex, onSwipeLeft, onSwipeRight, tracks],
  );

  const handleCardTap = useCallback(
    (songId: string) => {
      onCardTap?.(songId);
    },
    [onCardTap],
  );

  const getVisibleCards = () => {
    if (tracks.length === 0) return [];

    const visibleCards = [];
    for (let i = 0; i < Math.min(4, tracks.length); i++) {
      const trackIndex = (currentIndex + i) % tracks.length;
      visibleCards.push({
        ...tracks[trackIndex],
        stackIndex: i,
      });
    }
    return visibleCards.reverse(); // Render back to front for proper z-index
  };

  const visibleCards = getVisibleCards();

  if (isLoading) {
    return (
      <div
        className={cn(
          "relative w-full h-[500px] mx-auto max-w-sm flex items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-[#9FFFA2]" />
          <p className="text-white/60 text-lg font-medium">Loading your music...</p>
        </div>
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div
        className={cn(
          "relative w-full h-[500px] mx-auto max-w-sm flex items-center justify-center",
          className,
        )}
      >
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 bg-white/10 rounded-full flex items-center justify-center">
            <Play className="w-12 h-12 text-white/40" />
          </div>
          <p className="text-white/60 text-lg font-medium">No tracks available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-[500px] mx-auto max-w-sm", className)}>
      <AnimatePresence mode="wait">
        {visibleCards.map((song, index) => {
          const isTopCard = song.stackIndex === 0;
          const zIndex = 10 + song.stackIndex;
          const scale = 1 - song.stackIndex * 0.05;
          const yOffset = song.stackIndex * -8;
          const rotation = ROTATION_VALUES[song.stackIndex % ROTATION_VALUES.length];

          return (
            <motion.div
              key={`${song.id}-${currentIndex}-${song.stackIndex}`}
              className="absolute inset-0 cursor-pointer"
              style={{ zIndex }}
              initial={{
                scale,
                y: yOffset,
                rotate: rotation,
                opacity: song.stackIndex < 3 ? 1 : 0,
              }}
              animate={{
                scale,
                y: yOffset,
                rotate: rotation,
                opacity: song.stackIndex < 3 ? 1 : 0,
              }}
              exit={{
                x: direction === "left" ? -400 : direction === "right" ? 400 : 0,
                opacity: 0,
                scale: 0.8,
                transition: { duration: 0.3 },
              }}
              drag={isTopCard ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.7}
              onDragEnd={isTopCard ? handleDragEnd : undefined}
              onTap={() => handleCardTap(song.id)}
              whileDrag={
                isTopCard
                  ? {
                      scale: 1.05,
                      rotate: 0,
                      zIndex: 50,
                      transition: { duration: 0.1 },
                    }
                  : {}
              }
              transition={{
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
            >
              <motion.div
                className="w-full h-full rounded-[32px] overflow-hidden shadow-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-sm border border-white/10"
                whileHover={isTopCard ? { scale: 1.02 } : {}}
                transition={{ duration: 0.2 }}
              >
                {/* Background Image */}
                <div className="absolute inset-0">
                  <div className="relative w-full h-full">
                    <Image
                      src={song.originalCoverUrl}
                      alt={`${song.title} cover`}
                      fill
                      className="object-cover"
                      sizes="(max-width: 384px) 100vw, 384px"
                      priority={song.stackIndex === 0}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=500&h=500&q=80";
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  </div>
                </div>

                {/* Content Overlay */}
                <div className="relative z-10 h-full flex flex-col justify-end p-8">
                  {/* Playing Indicator */}
                  {currentTrack?.id === song.id && (
                    <div className="absolute top-6 right-6 w-12 h-12 bg-[#9FFFA2]/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                      {isPlaying ? (
                        <Pause className="w-5 h-5 text-black" />
                      ) : (
                        <Play className="w-5 h-5 text-black ml-0.5" />
                      )}
                    </div>
                  )}

                  {/* Song Info */}
                  <div className="text-white">
                    <h2 className="text-3xl font-black leading-tight mb-2 drop-shadow-lg">
                      {song.title}
                    </h2>
                    <p className="text-xl font-semibold opacity-90 drop-shadow-md">{song.artist}</p>

                    {/* Mood Badge */}
                    <div className="mt-4 inline-flex">
                      <span
                        className={cn(
                          "px-4 py-2 backdrop-blur-sm rounded-full text-sm font-bold border",
                          currentTrack?.id === song.id
                            ? "bg-[#9FFFA2]/30 border-[#9FFFA2]/50 text-[#9FFFA2]"
                            : "bg-white/20 border-white/30 text-white",
                        )}
                      >
                        {song.mood} • {song.tempo} BPM
                      </span>
                    </div>
                  </div>

                  {/* Swipe Indicator (only on top card) */}
                  {isTopCard && (
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-2 text-white/60 text-sm font-medium">
                      <span>←</span>
                      <span>SWIPE</span>
                      <span>→</span>
                    </div>
                  )}
                </div>

                {/* Glassmorphic overlay for depth on background cards */}
                {!isTopCard && <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]" />}
              </motion.div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Progress Dots */}
      <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {tracks.map((_, index) => (
          <motion.div
            key={index}
            className={cn(
              "w-2 h-2 rounded-full transition-all duration-300",
              index === currentIndex ? "bg-primary w-8" : "bg-white/30",
            )}
            animate={{
              scale: index === currentIndex ? 1.2 : 1,
            }}
          />
        ))}
      </div>
    </div>
  );
}
