"use client";

import { useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { track as trackEvent } from "@/lib/analytics";
import {
  notifyPlaylistCreated,
  notifyPlaylistUpdated,
  notifyPlaylistShared,
  notifyPlaylistDeleted,
  notifyNewMusicAdded,
} from "@/lib/push-notifications";

interface PlaylistChangeEvent {
  type: "created" | "updated" | "shared" | "deleted" | "new_music";
  playlistId: string;
  playlistName: string;
  data?: Record<string, any>;
}

interface PlaylistNotificationHook {
  notifyPlaylistChange: (event: PlaylistChangeEvent) => Promise<void>;
  enablePlaylistNotifications: () => void;
  disablePlaylistNotifications: () => void;
  isPlaylistNotificationsEnabled: boolean;
}

export function usePlaylistNotifications(): PlaylistNotificationHook {
  const { user } = useAuth();
  const isEnabledRef = useRef(true);
  const pendingNotificationsRef = useRef<PlaylistChangeEvent[]>([]);

  // Load notification preferences from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("playlist-notifications-enabled");
      isEnabledRef.current = stored !== null ? JSON.parse(stored) : true;
    } catch (error) {
      console.warn("Failed to load playlist notification preferences:", error);
      isEnabledRef.current = true;
    }
  }, []);

  // Listen for playlist changes from service worker messages
  useEffect(() => {
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      const { type, playlistId, playlistName, sharedBy } = event.data;

      switch (type) {
        case "undo_playlist_delete":
          // Handle undo playlist delete
          handleUndoPlaylistDelete(playlistId, playlistName);
          break;

        case "add_playlist_to_library":
          // Handle add shared playlist to library
          handleAddPlaylistToLibrary(playlistId, sharedBy);
          break;

        case "play_new_music":
          // Handle play new music
          handlePlayNewMusic(event.data);
          break;

        case "pause_regeneration":
        case "resume_regeneration":
          // Handle regeneration control
          handleRegenControl(type, playlistId);
          break;
      }
    };

    navigator.serviceWorker?.addEventListener("message", handleServiceWorkerMessage);

    return () => {
      navigator.serviceWorker?.removeEventListener("message", handleServiceWorkerMessage);
    };
  }, []);

  const handleUndoPlaylistDelete = useCallback(async (playlistId: string, playlistName: string) => {
    try {
      // Call API to restore deleted playlist
      const response = await fetch(`/api/playlists/${playlistId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        trackEvent("playlist_delete_undone", {
          playlist_id: playlistId,
          playlist_name: playlistName,
          source: "notification",
        });

        // Show success notification
        await notifyPlaylistUpdated(playlistName, playlistId, "restored", 0);
      }
    } catch (error) {
      console.error("Failed to undo playlist delete:", error);
    }
  }, []);

  const handleAddPlaylistToLibrary = useCallback(async (playlistId: string, sharedBy: string) => {
    try {
      // Call API to add shared playlist to library
      const response = await fetch(`/api/playlists/${playlistId}/add-to-library`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();
        
        trackEvent("shared_playlist_added", {
          playlist_id: playlistId,
          shared_by: sharedBy,
          source: "notification",
        });

        // Show success notification
        await notifyPlaylistCreated(data.playlistName, playlistId, data.trackCount);
      }
    } catch (error) {
      console.error("Failed to add playlist to library:", error);
    }
  }, []);

  const handlePlayNewMusic = useCallback(async (data: any) => {
    try {
      // Dispatch custom event to trigger music player
      window.dispatchEvent(
        new CustomEvent("play-new-music", {
          detail: {
            artistName: data.artistName,
            songTitle: data.songTitle,
            playlistName: data.playlistName,
          },
        })
      );

      trackEvent("new_music_played", {
        artist_name: data.artistName,
        song_title: data.songTitle,
        playlist_name: data.playlistName,
        source: "notification",
      });
    } catch (error) {
      console.error("Failed to play new music:", error);
    }
  }, []);

  const handleRegenControl = useCallback(async (action: string, playlistId: string) => {
    try {
      const endpoint = action === "pause_regeneration" ? "pause" : "resume";
      
      const response = await fetch(`/api/playlists/${playlistId}/regeneration/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        trackEvent("regeneration_controlled", {
          playlist_id: playlistId,
          action: endpoint,
          source: "notification",
        });

        // Dispatch event to update UI
        window.dispatchEvent(
          new CustomEvent(`notification-regen-${endpoint}d`, {
            detail: { playlistId },
          })
        );
      }
    } catch (error) {
      console.error(`Failed to ${action.split('_')[0]} regeneration:`, error);
    }
  }, []);

  const notifyPlaylistChange = useCallback(async (event: PlaylistChangeEvent) => {
    if (!isEnabledRef.current || !user) {
      // Store pending notification if not enabled or not logged in
      pendingNotificationsRef.current.push(event);
      return;
    }

    try {
      switch (event.type) {
        case "created":
          await notifyPlaylistCreated(
            event.playlistName,
            event.playlistId,
            event.data?.trackCount || 0
          );
          break;

        case "updated":
          await notifyPlaylistUpdated(
            event.playlistName,
            event.playlistId,
            event.data?.changeType || "updated",
            event.data?.changeCount || 0
          );
          break;

        case "shared":
          await notifyPlaylistShared(
            event.playlistName,
            event.playlistId,
            event.data?.sharedBy || "Someone"
          );
          break;

        case "deleted":
          await notifyPlaylistDeleted(event.playlistName, event.playlistId);
          break;

        case "new_music":
          await notifyNewMusicAdded(
            event.data?.artistName || "Unknown Artist",
            event.data?.songTitle || "New Song",
            event.playlistName
          );
          break;
      }

      // Track notification sent
      trackEvent("playlist_notification_sent", {
        notification_type: event.type,
        playlist_id: event.playlistId,
        playlist_name: event.playlistName,
      });

    } catch (error) {
      console.error("Failed to send playlist notification:", error);
      
      trackEvent("playlist_notification_failed", {
        notification_type: event.type,
        playlist_id: event.playlistId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [user]);

  const enablePlaylistNotifications = useCallback(() => {
    isEnabledRef.current = true;
    localStorage.setItem("playlist-notifications-enabled", "true");
    
    // Process any pending notifications
    const pending = pendingNotificationsRef.current;
    pendingNotificationsRef.current = [];
    
    pending.forEach(event => {
      notifyPlaylistChange(event);
    });

    trackEvent("playlist_notifications_enabled", {
      pending_count: pending.length,
    });
  }, [notifyPlaylistChange]);

  const disablePlaylistNotifications = useCallback(() => {
    isEnabledRef.current = false;
    localStorage.setItem("playlist-notifications-enabled", "false");
    
    trackEvent("playlist_notifications_disabled");
  }, []);

  return {
    notifyPlaylistChange,
    enablePlaylistNotifications,
    disablePlaylistNotifications,
    isPlaylistNotificationsEnabled: isEnabledRef.current,
  };
}

// Helper function to monitor playlist changes automatically
export function usePlaylistChangeMonitor() {
  const { notifyPlaylistChange } = usePlaylistNotifications();
  
  // Monitor playlist mutations via MutationObserver or custom events
  useEffect(() => {
    const handlePlaylistCreated = (event: CustomEvent) => {
      const { playlistName, playlistId, trackCount } = event.detail;
      notifyPlaylistChange({
        type: "created",
        playlistId,
        playlistName,
        data: { trackCount },
      });
    };

    const handlePlaylistUpdated = (event: CustomEvent) => {
      const { playlistName, playlistId, changeType, changeCount } = event.detail;
      notifyPlaylistChange({
        type: "updated",
        playlistId,
        playlistName,
        data: { changeType, changeCount },
      });
    };

    const handlePlaylistShared = (event: CustomEvent) => {
      const { playlistName, playlistId, sharedBy } = event.detail;
      notifyPlaylistChange({
        type: "shared",
        playlistId,
        playlistName,
        data: { sharedBy },
      });
    };

    const handlePlaylistDeleted = (event: CustomEvent) => {
      const { playlistName, playlistId } = event.detail;
      notifyPlaylistChange({
        type: "deleted",
        playlistId,
        playlistName,
      });
    };

    const handleNewMusicAdded = (event: CustomEvent) => {
      const { artistName, songTitle, playlistName, playlistId } = event.detail;
      notifyPlaylistChange({
        type: "new_music",
        playlistId: playlistId || "library",
        playlistName: playlistName || "Your Library",
        data: { artistName, songTitle },
      });
    };

    // Add event listeners
    window.addEventListener("playlist-created", handlePlaylistCreated as EventListener);
    window.addEventListener("playlist-updated", handlePlaylistUpdated as EventListener);
    window.addEventListener("playlist-shared", handlePlaylistShared as EventListener);
    window.addEventListener("playlist-deleted", handlePlaylistDeleted as EventListener);
    window.addEventListener("new-music-added", handleNewMusicAdded as EventListener);

    return () => {
      window.removeEventListener("playlist-created", handlePlaylistCreated as EventListener);
      window.removeEventListener("playlist-updated", handlePlaylistUpdated as EventListener);
      window.removeEventListener("playlist-shared", handlePlaylistShared as EventListener);
      window.removeEventListener("playlist-deleted", handlePlaylistDeleted as EventListener);
      window.removeEventListener("new-music-added", handleNewMusicAdded as EventListener);
    };
  }, [notifyPlaylistChange]);
}