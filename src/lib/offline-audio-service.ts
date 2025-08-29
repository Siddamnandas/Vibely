"use client";

import React from "react";
import { track as trackEvent } from "@/lib/analytics";
import { offlinePlaylistService } from "@/lib/offline-playlist-service";

interface CachedAudioTrack {
  id: string;
  title: string;
  artist: string;
  albumArt?: string;
  audioUrl: string;
  cachedAudioUrl?: string;
  duration: number;
  playlistId: string;
  isAvailableOffline: boolean;
  cacheSize?: number;
  lastCached: Date;
}

interface AudioCache {
  track: CachedAudioTrack;
  blob: Blob;
  audioBlob?: Blob; // For IndexedDB storage compatibility
  cacheTimestamp: Date;
}

interface OfflineAudioStatus {
  isAudioAvailableOffline: boolean;
  cachedTracksCount: number;
  totalAudioCacheSize: number;
  currentlyPlaying?: CachedAudioTrack;
  canPlayOffline: boolean;
}

class OfflineAudioService {
  private static instance: OfflineAudioService;
  private db: IDBDatabase | null = null;
  private audioCache = new Map<string, AudioCache>();
  private currentAudio: HTMLAudioElement | null = null;
  private currentTrack: CachedAudioTrack | null = null;
  private isOfflineMode = false;
  private statusListeners: ((status: OfflineAudioStatus) => void)[] = [];

  static getInstance(): OfflineAudioService {
    if (!OfflineAudioService.instance) {
      OfflineAudioService.instance = new OfflineAudioService();
    }
    return OfflineAudioService.instance;
  }

  constructor() {
    this.initializeDB();
    this.setupNetworkListeners();
    this.setupServiceWorkerCommunication();
    this.preloadCachedAudio();
  }

  private async initializeDB() {
    try {
      this.db = await this.openDB();
      console.log("✅ Offline audio database initialized");
    } catch (error) {
      console.error("Failed to initialize offline audio database:", error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vibely-offline-audio", 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Audio cache store
        if (!db.objectStoreNames.contains("audioCache")) {
          const audioStore = db.createObjectStore("audioCache", { keyPath: "trackId" });
          audioStore.createIndex("playlistId", "playlistId");
          audioStore.createIndex("lastCached", "lastCached");
          audioStore.createIndex("cacheSize", "cacheSize");
        }

        // Playback history store
        if (!db.objectStoreNames.contains("offlinePlayback")) {
          const playbackStore = db.createObjectStore("offlinePlayback", {
            keyPath: "id",
            autoIncrement: true,
          });
          playbackStore.createIndex("trackId", "trackId");
          playbackStore.createIndex("timestamp", "timestamp");
        }
      };
    });
  }

  private setupNetworkListeners() {
    const updateNetworkStatus = () => {
      this.isOfflineMode = !navigator.onLine;

      if (this.isOfflineMode) {
        console.log("📴 Entering offline audio mode");
        this.handleOfflineMode();
      } else {
        console.log("🌐 Back online - audio streaming available");
        this.handleOnlineMode();
      }

      this.notifyStatusListeners();
    };

    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);

    // Initial check
    updateNetworkStatus();
  }

  private setupServiceWorkerCommunication() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, data } = event.data;

        switch (type) {
          case "AUDIO_CACHED":
            this.handleAudioCached(data);
            break;
          case "AUDIO_CACHE_FAILED":
            this.handleAudioCacheFailed(data);
            break;
          case "CACHE_PLAYLIST_AUDIO":
            this.handleCachePlaylistAudio(data);
            break;
        }
      });
    }
  }

  private async preloadCachedAudio() {
    try {
      const cachedAudio = await this.getAllCachedAudio();
      for (const audioData of cachedAudio) {
        this.audioCache.set(audioData.trackId, {
          track: audioData.track,
          blob: audioData.audioBlob,
          cacheTimestamp: new Date(audioData.lastCached),
        });
      }

      console.log(`🎵 Preloaded ${cachedAudio.length} cached audio tracks`);
    } catch (error) {
      console.error("Failed to preload cached audio:", error);
    }
  }

  // Public API methods
  async cacheTrackForOffline(track: CachedAudioTrack): Promise<boolean> {
    try {
      // Check if already cached
      if (this.audioCache.has(track.id)) {
        console.log(`🎵 Track ${track.title} already cached`);
        return true;
      }

      // Fetch audio data
      const response = await fetch(track.audioUrl);
      if (!response.ok) throw new Error("Failed to fetch audio");

      const audioBlob = await response.blob();
      const cacheSize = audioBlob.size;

      // Check cache size limits (max 100MB per track)
      if (cacheSize > 100 * 1024 * 1024) {
        console.warn(`🚫 Track ${track.title} too large to cache: ${cacheSize} bytes`);
        return false;
      }

      // Store in IndexedDB
      await this.storeAudioInDB(track.id, {
        track: { ...track, cacheSize, isAvailableOffline: true },
        audioBlob,
        lastCached: new Date(),
      });

      // Add to memory cache
      this.audioCache.set(track.id, {
        track: { ...track, cacheSize, isAvailableOffline: true },
        blob: audioBlob,
        cacheTimestamp: new Date(),
      });

      trackEvent("audio_track_cached", {
        track_id: track.id,
        track_title: track.title,
        cache_size: cacheSize,
        playlist_id: track.playlistId,
      });

      this.notifyStatusListeners();
      return true;
    } catch (error) {
      console.error(`Failed to cache track ${track.title}:`, error);

      trackEvent("audio_cache_failed", {
        track_id: track.id,
        track_title: track.title,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    }
  }

  async playOfflineTrack(trackId: string): Promise<boolean> {
    try {
      const cachedAudio = this.audioCache.get(trackId);
      if (!cachedAudio) {
        console.warn(`🚫 Track ${trackId} not available offline`);
        return false;
      }

      // Stop current playback
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio = null;
      }

      // Create audio element with cached blob
      const audioUrl = URL.createObjectURL(cachedAudio.blob);
      this.currentAudio = new Audio(audioUrl);
      this.currentTrack = cachedAudio.track;

      // Setup audio event listeners
      this.setupAudioEventListeners(this.currentAudio, cachedAudio.track);

      // Start playback
      await this.currentAudio.play();

      // Record offline playback
      await this.recordOfflinePlayback(cachedAudio.track);

      trackEvent("offline_track_played", {
        track_id: trackId,
        track_title: cachedAudio.track.title,
        playlist_id: cachedAudio.track.playlistId,
      });

      this.notifyStatusListeners();
      return true;
    } catch (error) {
      console.error(`Failed to play offline track ${trackId}:`, error);

      trackEvent("offline_playback_failed", {
        track_id: trackId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    }
  }

  async removeCachedTrack(trackId: string): Promise<boolean> {
    try {
      // Remove from memory cache
      this.audioCache.delete(trackId);

      // Remove from IndexedDB
      if (this.db) {
        const transaction = this.db.transaction(["audioCache"], "readwrite");
        const store = transaction.objectStore("audioCache");
        await store.delete(trackId);
      }

      trackEvent("cached_audio_removed", {
        track_id: trackId,
      });

      this.notifyStatusListeners();
      return true;
    } catch (error) {
      console.error(`Failed to remove cached track ${trackId}:`, error);
      return false;
    }
  }

  async getOfflineAudioStatus(): Promise<OfflineAudioStatus> {
    const cachedTracksCount = this.audioCache.size;
    const totalAudioCacheSize = Array.from(this.audioCache.values()).reduce(
      (total, cache) => total + (cache.track.cacheSize || 0),
      0,
    );

    return {
      isAudioAvailableOffline: cachedTracksCount > 0,
      cachedTracksCount,
      totalAudioCacheSize,
      currentlyPlaying: this.currentTrack || undefined,
      canPlayOffline: this.isOfflineMode && cachedTracksCount > 0,
    };
  }

  async getCachedTracks(): Promise<CachedAudioTrack[]> {
    return Array.from(this.audioCache.values()).map((cache) => cache.track);
  }

  async isTrackCached(trackId: string): Promise<boolean> {
    return this.audioCache.has(trackId);
  }

  // Playback control methods
  pauseCurrentTrack(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
    }
  }

  resumeCurrentTrack(): void {
    if (this.currentAudio) {
      this.currentAudio.play().catch((error) => {
        console.error("Failed to resume playback:", error);
      });
    }
  }

  stopCurrentTrack(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      URL.revokeObjectURL(this.currentAudio.src);
      this.currentAudio = null;
      this.currentTrack = null;
      this.notifyStatusListeners();
    }
  }

  getCurrentTrack(): CachedAudioTrack | null {
    return this.currentTrack;
  }

  // Private helper methods
  private setupAudioEventListeners(audio: HTMLAudioElement, track: CachedAudioTrack) {
    audio.addEventListener("ended", () => {
      console.log(`🎵 Finished playing offline track: ${track.title}`);
      this.handleTrackEnded(track);
    });

    audio.addEventListener("error", (error) => {
      console.error(`🚫 Audio playback error for ${track.title}:`, error);
      this.handlePlaybackError(track, error);
    });

    audio.addEventListener("loadstart", () => {
      console.log(`🎵 Loading offline track: ${track.title}`);
    });

    audio.addEventListener("canplaythrough", () => {
      console.log(`✅ Offline track ready: ${track.title}`);
    });
  }

  private handleTrackEnded(track: CachedAudioTrack) {
    trackEvent("offline_track_completed", {
      track_id: track.id,
      track_title: track.title,
      playlist_id: track.playlistId,
    });

    // Dispatch event for UI components
    window.dispatchEvent(
      new CustomEvent("offline-track-ended", {
        detail: { track },
      }),
    );
  }

  private handlePlaybackError(track: CachedAudioTrack, error: Event) {
    trackEvent("offline_playback_error", {
      track_id: track.id,
      track_title: track.title,
      error_type: "audio_error",
    });

    // Dispatch error event for UI components
    window.dispatchEvent(
      new CustomEvent("offline-playback-error", {
        detail: { track, error },
      }),
    );
  }

  private async handleOfflineMode() {
    console.log("📴 Switched to offline audio mode");

    trackEvent("offline_audio_mode_entered", {
      cached_tracks: this.audioCache.size,
    });
  }

  private async handleOnlineMode() {
    console.log("🌐 Switched to online audio mode");

    trackEvent("online_audio_mode_entered", {
      cached_tracks: this.audioCache.size,
    });
  }

  private async handleAudioCached(data: any) {
    console.log("🎵 Audio cached by service worker:", data.trackId);
    // Refresh cache from IndexedDB
    await this.preloadCachedAudio();
    this.notifyStatusListeners();
  }

  private async handleAudioCacheFailed(data: any) {
    console.error("🚫 Audio cache failed:", data.trackId, data.error);
  }

  private async handleCachePlaylistAudio(data: any) {
    const { playlistId, tracks } = data;

    console.log(`🎵 Caching audio for playlist ${playlistId}: ${tracks.length} tracks`);

    let successCount = 0;
    for (const track of tracks) {
      const success = await this.cacheTrackForOffline(track);
      if (success) successCount++;
    }

    console.log(
      `✅ Cached ${successCount}/${tracks.length} audio tracks for playlist ${playlistId}`,
    );
  }

  private async storeAudioInDB(
    trackId: string,
    audioData: { track: CachedAudioTrack; audioBlob: Blob; lastCached: Date },
  ) {
    if (!this.db) return;

    const transaction = this.db.transaction(["audioCache"], "readwrite");
    const store = transaction.objectStore("audioCache");

    await store.put({
      trackId,
      track: audioData.track,
      audioBlob: audioData.audioBlob,
      lastCached: audioData.lastCached,
    });
  }

  private async getAllCachedAudio(): Promise<any[]> {
    if (!this.db) return [];

    try {
      const transaction = this.db.transaction(["audioCache"], "readonly");
      const store = transaction.objectStore("audioCache");
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to get cached audio:", error);
      return [];
    }
  }

  private async recordOfflinePlayback(track: CachedAudioTrack) {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(["offlinePlayback"], "readwrite");
      const store = transaction.objectStore("offlinePlayback");

      await store.add({
        trackId: track.id,
        trackTitle: track.title,
        playlistId: track.playlistId,
        timestamp: new Date(),
        isOffline: this.isOfflineMode,
      });
    } catch (error) {
      console.error("Failed to record offline playback:", error);
    }
  }

  // Status listener management
  onStatusChange(listener: (status: OfflineAudioStatus) => void): () => void {
    this.statusListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private async notifyStatusListeners(): Promise<void> {
    const status = await this.getOfflineAudioStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Audio status listener error:", error);
      }
    });
  }
}

// Export singleton instance
export const offlineAudioService = OfflineAudioService.getInstance();

// React hook for offline audio functionality
export function useOfflineAudio() {
  const [status, setStatus] = React.useState<OfflineAudioStatus>({
    isAudioAvailableOffline: false,
    cachedTracksCount: 0,
    totalAudioCacheSize: 0,
    canPlayOffline: false,
  });

  React.useEffect(() => {
    const updateStatus = async () => {
      const newStatus = await offlineAudioService.getOfflineAudioStatus();
      setStatus(newStatus);
    };

    // Initial load
    updateStatus();

    // Subscribe to changes
    const unsubscribe = offlineAudioService.onStatusChange(setStatus);

    // Listen for track ended events
    const handleTrackEnded = () => updateStatus();
    window.addEventListener("offline-track-ended", handleTrackEnded);

    return () => {
      unsubscribe();
      window.removeEventListener("offline-track-ended", handleTrackEnded);
    };
  }, []);

  return {
    ...status,
    cacheTrack: offlineAudioService.cacheTrackForOffline.bind(offlineAudioService),
    playOfflineTrack: offlineAudioService.playOfflineTrack.bind(offlineAudioService),
    removeCachedTrack: offlineAudioService.removeCachedTrack.bind(offlineAudioService),
    pauseCurrentTrack: offlineAudioService.pauseCurrentTrack.bind(offlineAudioService),
    resumeCurrentTrack: offlineAudioService.resumeCurrentTrack.bind(offlineAudioService),
    stopCurrentTrack: offlineAudioService.stopCurrentTrack.bind(offlineAudioService),
    isTrackCached: offlineAudioService.isTrackCached.bind(offlineAudioService),
    getCachedTracks: offlineAudioService.getCachedTracks.bind(offlineAudioService),
  };
}

export type { CachedAudioTrack, OfflineAudioStatus };
