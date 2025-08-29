"use client";

import { useEffect, useCallback, useRef } from "react";
import { useRegen } from "@/context/regen-context";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import {
  notifyRegenStarted,
  notifyRegenProgress,
  notifyRegenPaused,
  notifyRegenResumed,
  notifyRegenCanceled,
  notifyRegenComplete,
} from "@/lib/push-notifications";
import { useMusicData } from "@/hooks/use-music-data";
import { track as trackEvent } from "@/lib/analytics";

export function useRegenNotifications() {
  const { jobs } = useRegen();
  const { isEnabled, permission } = usePushNotifications();
  const { getPlaylists } = useMusicData();

  // Get playlist name helper
  const getPlaylistName = useCallback(
    async (playlistId: string): Promise<string> => {
      try {
        const playlists = await getPlaylists();
        const playlist = playlists.find((p) => p.id === playlistId);
        return playlist?.name || `Playlist ${playlistId.slice(0, 8)}`;
      } catch (error) {
        console.warn("Failed to get playlist name:", error);
        return `Playlist ${playlistId.slice(0, 8)}`;
      }
    },
    [getPlaylists],
  );

  // Track previous job states to detect changes
  const previousJobs = React.useRef<Record<string, { status: string; completed: number }>>({});

  // Monitor job changes and send notifications
  useEffect(() => {
    if (!isEnabled || permission !== "granted") return;

    Object.values(jobs).forEach(async (job) => {
      const playlistId = job.playlistId;
      const prevJob = previousJobs.current[playlistId];
      const playlistName = await getPlaylistName(playlistId);

      // Job started
      if (!prevJob && job.status === "running") {
        try {
          await notifyRegenStarted(playlistName, playlistId, job.total);
          trackEvent("regen_notification_sent", {
            type: "started",
            playlist_id: playlistId,
            total_tracks: job.total,
          });
        } catch (error) {
          console.warn("Failed to send regen started notification:", error);
        }
      }

      // Progress milestone reached
      if (prevJob && job.status === "running" && job.completed > prevJob.completed) {
        const percentage = Math.round((job.completed / job.total) * 100);
        const prevPercentage = Math.round((prevJob.completed / job.total) * 100);

        // Send notification for milestone percentages (25%, 50%, 75%)
        const milestones = [25, 50, 75];
        const reachedMilestone = milestones.find(
          (milestone) => percentage >= milestone && prevPercentage < milestone,
        );

        if (reachedMilestone) {
          try {
            await notifyRegenProgress(playlistName, playlistId, job.completed, job.total, true);
            trackEvent("regen_notification_sent", {
              type: "progress",
              playlist_id: playlistId,
              percentage: reachedMilestone,
              completed: job.completed,
              total: job.total,
            });
          } catch (error) {
            console.warn("Failed to send regen progress notification:", error);
          }
        }
      }

      // Job paused
      if (prevJob && prevJob.status === "running" && job.status === "paused") {
        try {
          await notifyRegenPaused(playlistName, playlistId, job.completed, job.total);
          trackEvent("regen_notification_sent", {
            type: "paused",
            playlist_id: playlistId,
            completed: job.completed,
            total: job.total,
          });
        } catch (error) {
          console.warn("Failed to send regen paused notification:", error);
        }
      }

      // Job resumed
      if (prevJob && prevJob.status === "paused" && job.status === "running") {
        try {
          await notifyRegenResumed(playlistName, playlistId);
          trackEvent("regen_notification_sent", {
            type: "resumed",
            playlist_id: playlistId,
            completed: job.completed,
            total: job.total,
          });
        } catch (error) {
          console.warn("Failed to send regen resumed notification:", error);
        }
      }

      // Job canceled
      if (prevJob && prevJob.status !== "canceled" && job.status === "canceled") {
        try {
          await notifyRegenCanceled(playlistName, playlistId, job.completed, job.total);
          trackEvent("regen_notification_sent", {
            type: "canceled",
            playlist_id: playlistId,
            completed: job.completed,
            total: job.total,
          });
        } catch (error) {
          console.warn("Failed to send regen canceled notification:", error);
        }
      }

      // Job completed
      if (prevJob && prevJob.status !== "completed" && job.status === "completed") {
        try {
          await notifyRegenComplete(playlistName, playlistId);
          trackEvent("regen_notification_sent", {
            type: "completed",
            playlist_id: playlistId,
            total_tracks: job.total,
          });
        } catch (error) {
          console.warn("Failed to send regen completed notification:", error);
        }
      }

      // Update previous job state
      previousJobs.current[playlistId] = {
        status: job.status,
        completed: job.completed,
      };
    });

    // Clean up completed jobs from tracking after some time
    const cleanup = () => {
      Object.keys(previousJobs.current).forEach((playlistId) => {
        const job = jobs[playlistId];
        if (!job || (job.status === "completed" && Date.now() - (job.startedAt || 0) > 300000)) {
          // Remove from tracking after 5 minutes
          delete previousJobs.current[playlistId];
        }
      });
    };

    const cleanupTimer = setTimeout(cleanup, 60000); // Run cleanup every minute
    return () => clearTimeout(cleanupTimer);
  }, [jobs, isEnabled, permission, getPlaylistName]);

  // Handle notification clicks
  useEffect(() => {
    const handleNotificationClick = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { playlistId, action } = customEvent.detail;

      switch (action) {
        case "view_progress":
        case "view_playlist":
          // Navigate to playlist
          window.location.href = `/playlist/${playlistId}`;
          break;
        case "pause":
          // Pause regeneration - would need access to regen context
          break;
        case "resume":
          // Resume regeneration - would need access to regen context
          break;
        default:
          break;
      }
    };

    window.addEventListener("notification-regen-complete", handleNotificationClick);
    window.addEventListener("notification-regen-started", handleNotificationClick);
    window.addEventListener("notification-regen-progress", handleNotificationClick);
    window.addEventListener("notification-regen-paused", handleNotificationClick);
    window.addEventListener("notification-regen-resumed", handleNotificationClick);
    window.addEventListener("notification-regen-canceled", handleNotificationClick);

    return () => {
      window.removeEventListener("notification-regen-complete", handleNotificationClick);
      window.removeEventListener("notification-regen-started", handleNotificationClick);
      window.removeEventListener("notification-regen-progress", handleNotificationClick);
      window.removeEventListener("notification-regen-paused", handleNotificationClick);
      window.removeEventListener("notification-regen-resumed", handleNotificationClick);
      window.removeEventListener("notification-regen-canceled", handleNotificationClick);
    };
  }, []);

  return {
    isEnabled,
    permission,
  };
}

// React import for useRef
import React from "react";
