"use client";

import { useEffect, useRef, useState } from "react";
import { motion, PanInfo, useReducedMotion } from "framer-motion";
import {
  ChevronDown,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Share2,
  Heart,
  List,
  X,
  Download,
  AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { usePlayback } from "@/context/playback-context";
import { useRegen } from "@/context/regen-context";
import { track as trackEvent } from "@/lib/analytics";
import { SpotifyPremiumGate } from "@/components/spotify-premium-gate";

export function FullPlayer({ onClose, isVisible }: { onClose: () => void; isVisible: boolean }) {
  const {
    current,
    isPlaying,
    togglePlay,
    next,
    previous,
    progress,
    duration,
    setRepeat,
    seek,
    currentIndex,
    queue,
    currentPlaylistId,
    isSpotifyReady,
    isSpotifyPremium,
  } = usePlayback();
  const { jobs } = useRegen();
  const prefersReduced = useReducedMotion();
  const [displayCover, setDisplayCover] = useState<string | null>(null);
  const lastTrackId = useRef<string | null>(null);
  const [trackStartTime, setTrackStartTime] = useState<number | null>(null);
  const [pendingCoverUpdate, setPendingCoverUpdate] = useState<string | null>(null);
  const [showCoverChangeHint, setShowCoverChangeHint] = useState(false);
  const [showQueue, setShowQueue] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Centralized haptic feedback utility
  const hapticFeedback = (intensity: "light" | "medium" | "heavy" = "medium") => {
    try {
      if (navigator?.vibrate) {
        const patterns = {
          light: 5,
          medium: 10,
          heavy: 20,
        };
        navigator.vibrate(patterns[intensity]);
      }
    } catch (error) {
      // Silently ignore vibration errors
    }
  };

  // Track when a new song starts to prevent mid-song cover swaps
  useEffect(() => {
    if (!current) return;
    if (lastTrackId.current !== current.id) {
      setTrackStartTime(Date.now());
      lastTrackId.current = current.id;

      // Apply any pending cover updates from the previous track when changing songs
      if (pendingCoverUpdate) {
        setPendingCoverUpdate(null);
        trackEvent("full_player_cover_updated", {
          track_id: lastTrackId.current || "unknown",
          timing: "track_change_cleanup",
          playlist_id: currentPlaylistId,
        });
      }
    }
  }, [current, pendingCoverUpdate, currentPlaylistId]);

  // Handle cover updates with never-swap-mid-song rule
  useEffect(() => {
    if (!current || !currentPlaylistId) return;

    // Get the updated cover if available
    const updatedCover = jobs[currentPlaylistId]?.rows[current.id]?.newCoverUrl;

    // Only update cover if:
    // 1. Song just started (within first 3 seconds) OR
    // 2. Song is paused OR
    // 3. No track start time recorded (initial load)
    const songJustStarted = trackStartTime && Date.now() - trackStartTime < 3000;
    const canUpdateCover = !isPlaying || songJustStarted || !trackStartTime;

    if (canUpdateCover && updatedCover && updatedCover !== displayCover) {
      setDisplayCover(updatedCover);
      setPendingCoverUpdate(null);

      // Track immediate cover update
      trackEvent("full_player_cover_updated", {
        track_id: current.id,
        timing: songJustStarted ? "song_start" : "paused",
        playlist_id: currentPlaylistId,
      });

      // Show a subtle hint about the cover change
      if (trackStartTime && Date.now() - trackStartTime > 1000) {
        setShowCoverChangeHint(true);
        setTimeout(() => setShowCoverChangeHint(false), 2000);
      }
    } else if (updatedCover && updatedCover !== displayCover && isPlaying) {
      // Store pending update for when song changes or pauses
      if (!pendingCoverUpdate) {
        trackEvent("full_player_cover_deferred", {
          track_id: current.id,
          reason: "mid_song_protection",
          playlist_id: currentPlaylistId,
        });
      }
      setPendingCoverUpdate(updatedCover);
    } else if (!updatedCover) {
      setDisplayCover(current.coverUrl);
      setPendingCoverUpdate(null);
    }

    // Apply pending cover update when song is paused
    if (!isPlaying && pendingCoverUpdate && pendingCoverUpdate !== displayCover) {
      setDisplayCover(pendingCoverUpdate);
      setPendingCoverUpdate(null);
      setShowCoverChangeHint(true);
      setTimeout(() => setShowCoverChangeHint(false), 2000);

      trackEvent("full_player_cover_updated", {
        track_id: current.id,
        timing: "on_pause",
        playlist_id: currentPlaylistId,
      });
    }
  }, [
    current,
    pendingCoverUpdate,
    currentPlaylistId,
    isPlaying,
    displayCover,
    jobs,
    trackStartTime,
  ]);
  const [isShuffleOn, setIsShuffleOn] = useState(false);
  const [repeatMode, setRepeatMode] = useState<"off" | "all" | "one">("off");
  const [isLiked, setIsLiked] = useState(false);

  // Enhanced shuffle toggle with haptic feedback
  const handleShuffleToggle = () => {
    hapticFeedback("light");
    setIsShuffleOn(!isShuffleOn);
  };

  // Enhanced like toggle with haptic feedback
  const handleLikeToggle = () => {
    hapticFeedback(isLiked ? "light" : "medium"); // Different feedback for like/unlike
    setIsLiked(!isLiked);
  };

  // Queue toggle with haptic feedback
  const handleQueueToggle = () => {
    hapticFeedback("light");
    setShowQueue(!showQueue);
    trackEvent("full_player_queue_toggled", {
      action: showQueue ? "close" : "open",
      track_id: current?.id,
      playlist_id: currentPlaylistId,
    });
  };

  // Navigate to specific track in queue
  const navigateToTrack = (targetIndex: number) => {
    if (targetIndex === currentIndex || !queue[targetIndex]) return;

    hapticFeedback("light");
    const fromId = queue[currentIndex]?.id;
    const toId = queue[targetIndex]?.id;

    trackEvent("full_player_swiped", {
      direction: targetIndex > currentIndex ? "next" : "prev",
      from_track_id: fromId,
      to_track_id: toId,
      source: "queue_navigation",
      jump_distance: Math.abs(targetIndex - currentIndex),
    });

    // Use playback context's method to navigate directly to the track
    if (targetIndex > currentIndex) {
      for (let i = 0; i < targetIndex - currentIndex; i++) {
        next();
      }
    } else {
      for (let i = 0; i < currentIndex - targetIndex; i++) {
        previous();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Enhanced repeat cycle with haptic feedback
  const handleRepeatCycle = () => {
    hapticFeedback("light");

    const modes: ("off" | "all" | "one")[] = ["off", "all", "one"];
    const currentIndex = modes.indexOf(repeatMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    setRepeatMode(nextMode);
    setRepeat(nextMode);
  };

  // Enhanced play/pause with haptic feedback
  const handleTogglePlay = () => {
    // Haptic feedback for play/pause
    hapticFeedback("medium");
    togglePlay();
  };

  // Enhanced navigation with haptic feedback
  const handlePrevious = () => {
    hapticFeedback("light");
    previous();
  };

  const handleNext = () => {
    hapticFeedback("light");
    next();
  };

  const handleSwipe = (event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const swipeVelocityThreshold = 300;

    // Check if it's a significant swipe (either by distance or velocity)
    const isSignificantSwipe =
      Math.abs(info.offset.x) > swipeThreshold ||
      Math.abs(info.velocity.x) > swipeVelocityThreshold;

    if (isSignificantSwipe) {
      // Haptic feedback for swipe gesture
      hapticFeedback("heavy");

      if (info.offset.x > 0 || info.velocity.x > swipeVelocityThreshold) {
        const fromId = queue[currentIndex]?.id;
        const toIndex = currentIndex > 0 ? currentIndex - 1 : queue.length - 1;
        const toId = queue[toIndex]?.id;
        trackEvent("full_player_swiped", {
          direction: "prev",
          from_track_id: fromId,
          to_track_id: toId,
          swipe_distance: Math.abs(info.offset.x),
          swipe_velocity: Math.abs(info.velocity.x),
        });
        previous();
      } else {
        const fromId = queue[currentIndex]?.id;
        const toIndex = (currentIndex + 1) % queue.length;
        const toId = queue[toIndex]?.id;
        trackEvent("full_player_swiped", {
          direction: "next",
          from_track_id: fromId,
          to_track_id: toId,
          swipe_distance: Math.abs(info.offset.x),
          swipe_velocity: Math.abs(info.velocity.x),
        });
        next();
      }
    }
  };

  const handleShare = async () => {
    if (!current) return;

    // Haptic feedback for share action
    hapticFeedback("light");

    const coverToShare = displayCover || current.coverUrl;
    const shareData = {
      title: `${current.title} - ${current.artist}`,
      text: `Check out this AI-generated cover for "${current.title}" by ${current.artist} on Vibely! ✨`,
      url: window.location.origin + "/share/cover/" + current.id,
    };

    trackEvent("share_opened", {
      track_id: current?.id,
      playlist_id: currentPlaylistId,
      share_type: "current_cover",
      cover_type: displayCover !== current.coverUrl ? "ai_generated" : "original",
    });

    try {
      // Try native sharing first (mobile)
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        trackEvent("share_completed", {
          track_id: current?.id,
          playlist_id: currentPlaylistId,
          destination: "native_share",
          share_type: "current_cover",
        });
      } else {
        // Try Instagram Stories sharing
        const instagramUrl = `instagram://story-camera?source_url=${encodeURIComponent(coverToShare)}`;
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
          // Try to open Instagram Stories
          window.open(instagramUrl, "_blank");
          trackEvent("share_completed", {
            track_id: current?.id,
            playlist_id: currentPlaylistId,
            destination: "instagram_stories",
            share_type: "current_cover",
          });
        } else {
          // Fallback to copying cover image or link
          await handleFallbackShare(coverToShare, shareData);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        // User didn't cancel, try fallback
        await handleFallbackShare(coverToShare, shareData);
      }
    }
  };

  const handleFallbackShare = async (coverUrl: string, shareData: any) => {
    try {
      // Try to copy the cover image URL to clipboard
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);

        // Show a toast or temporary feedback
        // TODO: Add toast notification
        console.log("Cover link copied to clipboard!");

        trackEvent("share_completed", {
          track_id: current?.id,
          playlist_id: currentPlaylistId,
          destination: "clipboard",
          share_type: "current_cover",
        });
      } else {
        // Final fallback - open in new window/tab for manual sharing
        const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareData.text)}&url=${encodeURIComponent(shareData.url)}`;
        window.open(shareUrl, "_blank", "width=550,height=420");

        trackEvent("share_completed", {
          track_id: current?.id,
          playlist_id: currentPlaylistId,
          destination: "twitter",
          share_type: "current_cover",
        });
      }
    } catch (error) {
      console.error("Share failed:", error);
      trackEvent("share_completed", {
        track_id: current?.id,
        playlist_id: currentPlaylistId,
        destination: "error",
        share_type: "current_cover",
      });
    }
  };

  const handleDownloadCover = async () => {
    if (!current) return;

    hapticFeedback("light");

    const coverToDownload = displayCover || current.coverUrl;
    const fileName = `${current.title.replace(/[^a-z0-9]/gi, "_")}_cover.jpg`;

    trackEvent("cover_downloaded", {
      track_id: current?.id,
      playlist_id: currentPlaylistId,
      cover_type: displayCover !== current.coverUrl ? "ai_generated" : "original",
    });

    try {
      // Fetch the image and create a download link
      const response = await fetch(coverToDownload);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open image in new tab
      window.open(coverToDownload, "_blank");
    }
  };

  // Handle progress slider change
  const handleProgressChange = (value: number[]) => {
    const newProgress = value[0];
    seek(newProgress);
  };

  useEffect(() => {
    if (!isVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showShareMenu) {
          setShowShareMenu(false);
        } else if (showQueue) {
          setShowQueue(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isVisible, onClose, showQueue, showShareMenu]);

  if (!current || !isVisible) return null;

  // Show premium message if Spotify is ready but user is not premium
  const showPremiumMessage = isSpotifyReady && !isSpotifyPremium;

  const sheetMotion = prefersReduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      }
    : {
        initial: { y: "100%", opacity: 0.9, scale: 0.98 },
        animate: { y: 0, opacity: 1, scale: 1 },
        exit: { y: "100%", opacity: 0.9, scale: 0.98 },
        transition: { type: "spring" as const, stiffness: 320, damping: 32 },
      };

  const backdropMotion = prefersReduced
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18 },
      }
    : {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { type: "spring" as const, stiffness: 320, damping: 32 },
      };

  return (
    <>
      {/* Dimmed/blurred backdrop */}
      <motion.div
        {...backdropMotion}
        className="full-player-backdrop fixed inset-0 z-[59]"
        style={{
          background: "rgba(0,0,0,var(--backdrop-alpha, 0.35))",
          backdropFilter: "blur(var(--backdrop-blur, 6px))",
        }}
        onClick={onClose}
      />

      <motion.div {...sheetMotion} className="fixed inset-0 bg-[#0E0F12] z-[60] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <ChevronDown size={24} />
          </Button>
          <div className="text-center">
            <p className="text-white/70 text-sm">Playing from</p>
            <p className="text-white font-medium">Playlist</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleQueueToggle}
              className={`text-white hover:bg-white/10 ${showQueue ? "bg-white/10" : ""}`}
              aria-label="Toggle queue"
            >
              <List size={20} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              className="text-white hover:bg-white/10"
            >
              <Share2 size={20} />
            </Button>
          </div>
        </div>

        {/* Premium Message */}
        {showPremiumMessage && (
          <div className="mx-4 my-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
            <p className="text-yellow-200 text-sm">
              Spotify Premium required for full playback. Preview mode enabled.
            </p>
          </div>
        )}

        {/* Main Content - Swipeable */}
        <motion.div
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={handleSwipe}
          dragElastic={0.2}
          className="flex-1 flex flex-col items-center justify-center p-8"
          onClick={() => {
            // Close share menu when clicking on main content
            if (showShareMenu) {
              setShowShareMenu(false);
            }
          }}
        >
          {/* Large AI Cover */}
          <div className="relative w-80 h-80 rounded-3xl overflow-hidden shadow-2xl mb-8">
            <Image
              src={displayCover || current.coverUrl}
              alt={current.title}
              fill
              className="object-cover transition-opacity duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

            {/* Pending cover update indicator */}
            {pendingCoverUpdate && isPlaying && (
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => {
                  hapticFeedback("light");
                  setDisplayCover(pendingCoverUpdate);
                  setPendingCoverUpdate(null);
                  setShowCoverChangeHint(true);
                  setTimeout(() => setShowCoverChangeHint(false), 2000);
                  trackEvent("full_player_cover_updated", {
                    track_id: current.id,
                    timing: "manual_override",
                    playlist_id: currentPlaylistId,
                  });
                }}
                className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 hover:bg-black/80 transition-colors"
              >
                <div className="flex items-center gap-2 text-white text-xs">
                  <div className="w-2 h-2 bg-[#9FFFA2] rounded-full animate-pulse" />
                  New cover ready
                </div>
              </motion.button>
            )}

            {/* Cover change hint */}
            {showCoverChangeHint && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2"
              >
                <div className="text-white text-xs text-center">✨ Cover updated</div>
              </motion.div>
            )}

            {/* Share Cover Button */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                hapticFeedback("light");
                setShowShareMenu(!showShareMenu);
              }}
              className={`absolute top-3 left-3 backdrop-blur-sm rounded-full p-2 hover:bg-black/80 transition-colors ${
                showShareMenu ? "bg-white/20" : "bg-black/60"
              }`}
              aria-label="Share this cover"
            >
              <Share2 className="w-4 h-4 text-white" />
            </motion.button>

            {/* Share Menu */}
            {showShareMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                className="absolute top-14 left-3 bg-black/80 backdrop-blur-xl rounded-xl p-2 min-w-[160px] border border-white/20"
              >
                <button
                  onClick={() => {
                    handleShare();
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-white text-sm hover:bg-white/10 rounded-lg transition-colors"
                >
                  📱 Share via Apps
                </button>
                <button
                  onClick={() => {
                    handleDownloadCover();
                    setShowShareMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 text-white text-sm hover:bg-white/10 rounded-lg transition-colors"
                >
                  📋 Download Cover
                </button>
                <button
                  onClick={async () => {
                    if (!current) return;
                    hapticFeedback("light");
                    const shareText = `Check out this AI-generated cover for "${current.title}" by ${current.artist} on Vibely! ✨ ${window.location.origin}/share/cover/${current.id}`;
                    if (navigator.clipboard) {
                      await navigator.clipboard.writeText(shareText);
                      // TODO: Show toast notification
                    }
                    setShowShareMenu(false);
                    trackEvent("share_completed", {
                      track_id: current?.id,
                      playlist_id: currentPlaylistId,
                      destination: "clipboard_manual",
                      share_type: "current_cover",
                    });
                  }}
                  className="w-full text-left px-3 py-2 text-white text-sm hover:bg-white/10 rounded-lg transition-colors"
                >
                  📎 Copy Link
                </button>
              </motion.div>
            )}

            {/* Download Cover Button - Only show when share menu is closed */}
            {!showShareMenu && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                onClick={handleDownloadCover}
                className="absolute top-3 left-[52px] bg-black/60 backdrop-blur-sm rounded-full p-2 hover:bg-black/80 transition-colors"
                aria-label="Download this cover"
              >
                <Download className="w-4 h-4 text-white" />
              </motion.button>
            )}
          </div>

          {/* Song Info */}
          <div className="text-center mb-8 max-w-sm">
            <h1 className="text-2xl font-black text-white mb-2 truncate">{current.title}</h1>
            <p className="text-white/70 text-lg truncate">{current.artist}</p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-sm mb-2">
            <Slider
              value={[progress]}
              onValueChange={handleProgressChange}
              max={duration}
              step={1}
              className="w-full"
            />
          </div>

          {/* Time Display */}
          <div className="flex justify-between w-full max-w-sm text-white/60 text-sm mb-8">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* Main Controls */}
          <div className="flex items-center justify-center gap-8 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevious}
              aria-label="Previous track"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <SkipBack size={32} />
            </Button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleTogglePlay}
              aria-label={isPlaying ? "Pause" : "Play"}
              className="bg-white text-black rounded-full p-4 hover:bg-white/90 transition-colors shadow-xl"
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} />}
            </motion.button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              aria-label="Next track"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <SkipForward size={32} />
            </Button>
          </div>

          {/* Secondary Controls */}
          <div className="flex items-center justify-between w-full max-w-xs">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShuffleToggle}
              aria-label="Toggle shuffle"
              className={`${isShuffleOn ? "text-[#9FFFA2]" : "text-white/50"} hover:text-white`}
            >
              <Shuffle size={20} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleLikeToggle}
              aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
              className={`${isLiked ? "text-red-500" : "text-white/50"} hover:text-red-400`}
            >
              <Heart size={20} fill={isLiked ? "currentColor" : "none"} />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={handleRepeatCycle}
              aria-label="Cycle repeat mode"
              className={`${
                repeatMode !== "off" ? "text-[#9FFFA2]" : "text-white/50"
              } hover:text-white relative`}
            >
              <Repeat size={20} />
              {repeatMode === "one" && (
                <span className="absolute -top-1 -right-1 text-[10px] bg-[#9FFFA2] text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                  1
                </span>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Swipe Hint */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-white/40 text-sm">
          Swipe left or right to change tracks
        </div>

        {/* Queue Visualization Overlay */}
        {showQueue && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 bg-[#0E0F12] z-10 flex flex-col"
          >
            {/* Queue Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-lg font-bold text-white">Playing Queue</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleQueueToggle}
                className="text-white hover:bg-white/10"
                aria-label="Close queue"
              >
                <X size={20} />
              </Button>
            </div>

            {/* Queue List */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              {queue.map((track, index) => {
                const isCurrentTrack = index === currentIndex;
                const isPlaying = isCurrentTrack && isVisible;

                return (
                  <motion.div
                    key={track.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-colors ${
                      isCurrentTrack
                        ? "bg-white/10 border border-white/20"
                        : "hover:bg-white/5 cursor-pointer"
                    }`}
                    onClick={() => {
                      if (!isCurrentTrack) {
                        navigateToTrack(index);
                      }
                    }}
                  >
                    {/* Track Number/Playing Indicator */}
                    <div className="w-6 text-center">
                      {isCurrentTrack ? (
                        <div className="w-4 h-4 bg-[#9FFFA2] rounded-full flex items-center justify-center mx-auto">
                          {isPlaying ? (
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ repeat: Infinity, duration: 1.5 }}
                              className="w-2 h-2 bg-black rounded-full"
                            />
                          ) : (
                            <Pause className="w-2 h-2 text-black" />
                          )}
                        </div>
                      ) : (
                        <span className="text-white/50 text-sm">{index + 1}</span>
                      )}
                    </div>

                    {/* Track Cover */}
                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-white/10 flex-shrink-0">
                      <Image
                        src={track.coverUrl}
                        alt={track.title}
                        width={48}
                        height={48}
                        className="object-cover w-full h-full"
                      />
                    </div>

                    {/* Track Info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={`font-medium truncate ${
                          isCurrentTrack ? "text-[#9FFFA2]" : "text-white"
                        }`}
                      >
                        {track.title}
                      </p>
                      <p className="text-white/60 text-sm truncate">
                        {track.artist || "Unknown Artist"}
                      </p>
                    </div>

                    {/* Duration or Playing Icon */}
                    <div className="text-white/50 text-sm">
                      {isCurrentTrack ? (
                        <span className="text-[#9FFFA2] text-xs font-medium">Now Playing</span>
                      ) : (
                        <span>3:24</span> // TODO: Get actual duration
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Queue Footer */}
            <div className="p-4 border-t border-white/10">
              <div className="text-center text-white/60 text-sm">
                {queue.length} track{queue.length !== 1 ? "s" : ""} in queue
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
