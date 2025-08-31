"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegen } from "@/context/regen-context";
import { track as trackEvent } from "@/lib/analytics";
import { useRouter } from "next/navigation";
import { useMusicData } from "@/hooks/use-music-data";

interface CompletedJob {
  playlistId: string;
  playlistName: string;
  totalSongs: number;
  completedAt: number;
}

export function RegenNotificationBanner() {
  const { jobs } = useRegen();
  const router = useRouter();
  const { getPlaylists } = useMusicData();
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [dismissedJobs, setDismissedJobs] = useState<Set<string>>(new Set());
  const [playlistNames, setPlaylistNames] = useState<Record<string, string>>({});

  // Load playlist names for better UX
  const loadPlaylistNames = useCallback(async () => {
    try {
      const playlists = await getPlaylists();
      const nameMap: Record<string, string> = {};
      playlists.forEach((playlist) => {
        nameMap[playlist.id] = playlist.name;
      });
      setPlaylistNames(nameMap);
    } catch (error) {
      console.error("Failed to load playlist names:", error);
    }
  }, [getPlaylists]);

  // Load playlist names on mount
  useEffect(() => {
    loadPlaylistNames();
  }, [loadPlaylistNames]);

  // Track completed jobs
  useEffect(() => {
    const completed = Object.values(jobs || {})
      .filter((job) => job && job.status === "completed")
      .map((job) => ({
        playlistId: job.playlistId,
        playlistName: playlistNames?.[job.playlistId] || `Playlist ${job.playlistId.slice(0, 8)}`,
        totalSongs: job.total,
        completedAt: Date.now(),
      }))
      .filter((job) => !dismissedJobs.has(job.playlistId))
      .sort((a, b) => b.completedAt - a.completedAt); // Most recent first

    setCompletedJobs(completed);
  }, [jobs, dismissedJobs, playlistNames]);

  const handleDismiss = (playlistId: string) => {
    setDismissedJobs((prev) => new Set([...prev, playlistId]));
    trackEvent("regen_notification_dismissed", { playlist_id: playlistId });
  };

  const handleViewCovers = (playlistId: string) => {
    trackEvent("regen_notification_viewed", { playlist_id: playlistId });
    router.push(`/playlist/${playlistId}`);
    handleDismiss(playlistId);
  };

  const currentJob = completedJobs[0]; // Show one at a time

  if (!currentJob) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed top-4 left-4 right-4 z-[70] pointer-events-auto"
      >
        <div className="bg-gradient-to-r from-[#9FFFA2]/90 to-[#8FD3FF]/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">New covers are ready! ✨</h3>
                <p className="text-white/80 text-xs">
                  {currentJob.totalSongs} song{currentJob.totalSongs !== 1 ? "s" : ""} updated for
                  &quot;
                  {currentJob.playlistName}&quot;
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleViewCovers(currentJob.playlistId)}
                className="text-white hover:bg-white/20 rounded-full h-8 px-3"
              >
                <Eye className="w-3 h-3 mr-1" />
                View
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDismiss(currentJob.playlistId)}
                className="text-white hover:bg-white/20 rounded-full h-8 w-8 p-0"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Auto-dismiss after 8 seconds
export function useRegenNotificationAutoDismiss() {
  const { jobs } = useRegen();
  const [dismissTimer, setDismissTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const hasCompleted = Object.values(jobs || {}).some((job) => job && job.status === "completed");

    if (hasCompleted && !dismissTimer) {
      const timer = setTimeout(() => {
        // Auto-dismiss logic could be implemented here
      }, 8000);
      setDismissTimer(timer);
    }

    return () => {
      if (dismissTimer) {
        clearTimeout(dismissTimer);
        setDismissTimer(null);
      }
    };
  }, [jobs, dismissTimer]);
}
