"use client";

import React from "react";
import { track as trackEvent } from "@/lib/analytics";

interface CachedPlaylist {
  id: string;
  name: string;
  tracks: CachedTrack[];
  coverUrl?: string;
  lastUpdated: Date;
  isAvailableOffline: boolean;
}

interface CachedTrack {
  id: string;
  title: string;
  artist: string;
  coverUrl?: string;
  audioUrl?: string;
  isAvailableOffline: boolean;
  lastPlayed?: Date;
}

interface OfflineStatus {
  isOnline: boolean;
  hasCachedData: boolean;
  cachedPlaylistsCount: number;
  cachedTracksCount: number;
  totalCacheSize: number;
}

class OfflinePlaylistService {
  private static instance: OfflinePlaylistService;
  private db: IDBDatabase | null = null;
  private onlineStatus = navigator.onLine;
  private statusListeners: ((status: OfflineStatus) => void)[] = [];

  static getInstance(): OfflinePlaylistService {
    if (!OfflinePlaylistService.instance) {
      OfflinePlaylistService.instance = new OfflinePlaylistService();
    }
    return OfflinePlaylistService.instance;
  }

  constructor() {
    this.initializeDB();
    this.setupOnlineStatusListener();
    this.setupServiceWorkerCommunication();
  }

  private async initializeDB() {
    try {
      this.db = await this.openDB();
      console.log("✅ Offline playlist database initialized");
    } catch (error) {
      console.error("Failed to initialize offline database:", error);
    }
  }

  private openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("vibely-offline-playlists", 2);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Playlists store
        if (!db.objectStoreNames.contains("playlists")) {
          const playlistStore = db.createObjectStore("playlists", { keyPath: "id" });
          playlistStore.createIndex("lastUpdated", "lastUpdated");
          playlistStore.createIndex("isAvailableOffline", "isAvailableOffline");
        }

        // Tracks store
        if (!db.objectStoreNames.contains("tracks")) {
          const trackStore = db.createObjectStore("tracks", { keyPath: "id" });
          trackStore.createIndex("playlistId", "playlistId");
          trackStore.createIndex("isAvailableOffline", "isAvailableOffline");
          trackStore.createIndex("lastPlayed", "lastPlayed");
        }

        // Offline queue store
        if (!db.objectStoreNames.contains("offlineQueue")) {
          const queueStore = db.createObjectStore("offlineQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          queueStore.createIndex("action", "action");
          queueStore.createIndex("timestamp", "timestamp");
        }
      };
    });
  }

  private setupOnlineStatusListener() {
    const updateOnlineStatus = () => {
      const wasOnline = this.onlineStatus;
      this.onlineStatus = navigator.onLine;

      if (!wasOnline && this.onlineStatus) {
        // Just came back online
        this.handleBackOnline();
      } else if (wasOnline && !this.onlineStatus) {
        // Just went offline
        this.handleGoOffline();
      }

      this.notifyStatusListeners();
    };

    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
  }

  private setupServiceWorkerCommunication() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.addEventListener("message", (event) => {
        const { type, data } = event.data;

        switch (type) {
          case "PLAYLIST_CACHED":
            this.handlePlaylistCached(data);
            break;
          case "TRACK_CACHED":
            this.handleTrackCached(data);
            break;
          case "CACHE_CLEANED":
            this.handleCacheCleaned(data);
            break;
        }
      });
    }
  }

  private async handleBackOnline() {
    try {
      console.log("🌐 Back online - syncing offline changes");
      await this.syncOfflineChanges();
      await this.updateCachedPlaylists();

      trackEvent("device_back_online", {
        cached_playlists: await this.getCachedPlaylistsCount(),
        cached_tracks: await this.getCachedTracksCount(),
      });
    } catch (error) {
      console.error("Failed to handle back online:", error);
    }
  }

  private async handleGoOffline() {
    console.log("📴 Gone offline - switching to cached data");

    trackEvent("device_gone_offline", {
      cached_playlists: await this.getCachedPlaylistsCount(),
      cached_tracks: await this.getCachedTracksCount(),
    });
  }

  // Public methods for playlist management
  async getCachedPlaylists(): Promise<CachedPlaylist[]> {
    if (!this.db) return [];

    try {
      const transaction = this.db.transaction(["playlists"], "readonly");
      const store = transaction.objectStore("playlists");
      const request = store.getAll();

      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error("Failed to get cached playlists:", error);
      return [];
    }
  }

  async cachePlaylistForOffline(playlistId: string): Promise<boolean> {
    try {
      // Fetch playlist data
      const response = await fetch(`/api/playlists/${playlistId}?includeAudio=true`);
      if (!response.ok) throw new Error("Failed to fetch playlist");

      const playlistData = await response.json();

      // Cache playlist metadata
      await this.storeCachedPlaylist({
        id: playlistData.id,
        name: playlistData.name,
        tracks: playlistData.tracks,
        coverUrl: playlistData.coverUrl,
        lastUpdated: new Date(),
        isAvailableOffline: true,
      });

      // Request service worker to cache audio files
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CACHE_PLAYLIST_AUDIO",
          playlistId,
          tracks: playlistData.tracks,
        });
      }

      trackEvent("playlist_cached_for_offline", {
        playlist_id: playlistId,
        track_count: playlistData.tracks.length,
      });

      this.notifyStatusListeners();
      return true;
    } catch (error) {
      console.error("Failed to cache playlist for offline:", error);

      trackEvent("playlist_cache_failed", {
        playlist_id: playlistId,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      return false;
    }
  }

  async removeCachedPlaylist(playlistId: string): Promise<boolean> {
    if (!this.db) return false;

    try {
      const transaction = this.db.transaction(["playlists", "tracks"], "readwrite");

      // Remove playlist
      const playlistStore = transaction.objectStore("playlists");
      await playlistStore.delete(playlistId);

      // Remove associated tracks
      const trackStore = transaction.objectStore("tracks");
      const trackIndex = trackStore.index("playlistId");
      await new Promise<void>((resolve, reject) => {
        const request = trackIndex.openCursor(IDBKeyRange.only(playlistId));
        request.onsuccess = () => {
          const cursor = request.result as IDBCursorWithValue | null;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
        request.onerror = () => reject(request.error || new Error("Cursor error"));
      });

      // Request service worker to clear cache
      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CLEAR_PLAYLIST_CACHE",
          playlistId,
        });
      }

      trackEvent("cached_playlist_removed", {
        playlist_id: playlistId,
      });

      this.notifyStatusListeners();
      return true;
    } catch (error) {
      console.error("Failed to remove cached playlist:", error);
      return false;
    }
  }

  async getOfflineStatus(): Promise<OfflineStatus> {
    const cachedPlaylistsCount = await this.getCachedPlaylistsCount();
    const cachedTracksCount = await this.getCachedTracksCount();
    const totalCacheSize = await this.getTotalCacheSize();

    return {
      isOnline: this.onlineStatus,
      hasCachedData: cachedPlaylistsCount > 0,
      cachedPlaylistsCount,
      cachedTracksCount,
      totalCacheSize,
    };
  }

  // Offline queue management
  async queueOfflineAction(action: string, data: any): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(["offlineQueue"], "readwrite");
      const store = transaction.objectStore("offlineQueue");

      await store.add({
        action,
        data,
        timestamp: new Date(),
      });

      console.log(`📝 Queued offline action: ${action}`);
    } catch (error) {
      console.error("Failed to queue offline action:", error);
    }
  }

  private async syncOfflineChanges(): Promise<void> {
    if (!this.db) return;

    try {
      const transaction = this.db.transaction(["offlineQueue"], "readwrite");
      const store = transaction.objectStore("offlineQueue");
      const request = store.getAll();

      request.onsuccess = async () => {
        const queuedActions = request.result;

        for (const item of queuedActions) {
          try {
            await this.processOfflineAction(item);
            await store.delete(item.id);
          } catch (error) {
            console.error("Failed to process offline action:", error);
          }
        }

        if (queuedActions.length > 0) {
          console.log(`✅ Synced ${queuedActions.length} offline actions`);
        }
      };
    } catch (error) {
      console.error("Failed to sync offline changes:", error);
    }
  }

  private async processOfflineAction(item: any): Promise<void> {
    const { action, data } = item;

    switch (action) {
      case "track_played":
        await this.syncTrackPlayed(data);
        break;
      case "playlist_created":
        await this.syncPlaylistCreated(data);
        break;
      case "playlist_updated":
        await this.syncPlaylistUpdated(data);
        break;
      default:
        console.warn("Unknown offline action:", action);
    }
  }

  // Helper methods
  private async storeCachedPlaylist(playlist: CachedPlaylist): Promise<void> {
    if (!this.db) return;

    const transaction = this.db.transaction(["playlists"], "readwrite");
    const store = transaction.objectStore("playlists");
    await store.put(playlist);
  }

  private async getCachedPlaylistsCount(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction(["playlists"], "readonly");
      const store = transaction.objectStore("playlists");
      const request = store.count();

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  private async getCachedTracksCount(): Promise<number> {
    if (!this.db) return 0;

    try {
      const transaction = this.db.transaction(["tracks"], "readonly");
      const store = transaction.objectStore("tracks");
      const request = store.count();

      return new Promise((resolve) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(0);
      });
    } catch {
      return 0;
    }
  }

  private async getTotalCacheSize(): Promise<number> {
    try {
      if ("storage" in navigator && "estimate" in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        return estimate.usage || 0;
      }
    } catch {
      // Fallback estimation is not supported
    }
    return 0;
  }

  private handlePlaylistCached(data: any): void {
    console.log("📁 Playlist cached:", data);
    this.notifyStatusListeners();
  }

  private handleTrackCached(data: any): void {
    console.log("🎵 Track cached:", data);
  }

  private handleCacheCleaned(data: any): void {
    console.log("🧹 Cache cleaned:", data);
    this.notifyStatusListeners();
  }

  private async syncTrackPlayed(data: any): Promise<void> {
    await fetch("/api/analytics/track-played", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  private async syncPlaylistCreated(data: any): Promise<void> {
    await fetch("/api/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  private async syncPlaylistUpdated(data: any): Promise<void> {
    await fetch(`/api/playlists/${data.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  private async updateCachedPlaylists(): Promise<void> {
    const cachedPlaylists = await this.getCachedPlaylists();

    for (const playlist of cachedPlaylists) {
      try {
        const response = await fetch(`/api/playlists/${playlist.id}`);
        if (response.ok) {
          const updatedData = await response.json();
          await this.storeCachedPlaylist({
            ...playlist,
            ...updatedData,
            lastUpdated: new Date(),
          });
        }
      } catch (error) {
        console.warn(`Failed to update cached playlist ${playlist.id}:`, error);
      }
    }
  }

  // Status listener management
  onStatusChange(listener: (status: OfflineStatus) => void): () => void {
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
    const status = await this.getOfflineStatus();
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (error) {
        console.error("Status listener error:", error);
      }
    });
  }
}

// Export singleton instance
export const offlinePlaylistService = OfflinePlaylistService.getInstance();

// React hook for offline status
export function useOfflineStatus() {
  const [status, setStatus] = React.useState<OfflineStatus>({
    isOnline: navigator.onLine,
    hasCachedData: false,
    cachedPlaylistsCount: 0,
    cachedTracksCount: 0,
    totalCacheSize: 0,
  });

  React.useEffect(() => {
    const updateStatus = async () => {
      const newStatus = await offlinePlaylistService.getOfflineStatus();
      setStatus(newStatus);
    };

    // Initial load
    updateStatus();

    // Subscribe to changes
    const unsubscribe = offlinePlaylistService.onStatusChange(setStatus);

    return unsubscribe;
  }, []);

  return {
    ...status,
    cachePlaylist: offlinePlaylistService.cachePlaylistForOffline.bind(offlinePlaylistService),
    removeCachedPlaylist: offlinePlaylistService.removeCachedPlaylist.bind(offlinePlaylistService),
    queueOfflineAction: offlinePlaylistService.queueOfflineAction.bind(offlinePlaylistService),
  };
}

export type { CachedPlaylist, CachedTrack, OfflineStatus };
