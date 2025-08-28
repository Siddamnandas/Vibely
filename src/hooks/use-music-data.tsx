"use client";

import { useState, useEffect, useCallback } from "react";
import { useMusicService } from "./use-music-service";
import { VibelyTrack, songs as fallbackSongs } from "@/lib/data";

interface MusicDataState {
  tracks: VibelyTrack[];
  isLoading: boolean;
  error: string | null;
  source: "spotify" | "apple-music" | "fallback";
}

export function useMusicData() {
  const musicService = useMusicService();

  const [state, setState] = useState<MusicDataState>({
    tracks: fallbackSongs,
    isLoading: false,
    error: null,
    source: "fallback",
  });

  const loadMusicData = useCallback(async () => {
    if (!musicService.provider) {
      setState({
        tracks: fallbackSongs,
        isLoading: false,
        error: null,
        source: "fallback",
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const tracks = await musicService.loadUserTracks(20);

      if (tracks.length > 0) {
        setState({
          tracks: tracks.slice(0, 10), // Limit to top 10 for swipeable cards
          isLoading: false,
          error: null,
          source: musicService.provider as "spotify" | "apple-music",
        });
      } else {
        // Fallback to demo data if no tracks found
        setState({
          tracks: fallbackSongs,
          isLoading: false,
          error: null,
          source: "fallback",
        });
      }
    } catch (error) {
      setState({
        tracks: fallbackSongs, // Fallback on error
        isLoading: false,
        error: error instanceof Error ? error.message : "Failed to load music data",
        source: "fallback",
      });
    }
  }, [musicService.provider, musicService.loadUserTracks]);

  // Update tracks when music service state changes
  useEffect(() => {
    if (musicService.tracks.length > 0) {
      setState({
        tracks: musicService.tracks.slice(0, 10),
        isLoading: musicService.isLoading,
        error: musicService.error,
        source: (musicService.provider as "spotify" | "apple-music") || "fallback",
      });
    } else if (!musicService.provider) {
      setState({
        tracks: fallbackSongs,
        isLoading: false,
        error: null,
        source: "fallback",
      });
    }
  }, [musicService.tracks, musicService.isLoading, musicService.error, musicService.provider]);

  // Load data when provider changes
  useEffect(() => {
    if (musicService.provider) {
      loadMusicData();
    }
  }, [musicService.provider, loadMusicData]);

  const refreshData = useCallback(() => {
    loadMusicData();
  }, [loadMusicData]);

  // Get playlists from the music service
  const getPlaylists = useCallback(async () => {
    return await musicService.loadUserPlaylists();
  }, [musicService.loadUserPlaylists]);

  // Get tracks from a specific playlist
  const getPlaylistTracks = useCallback(
    async (playlistId: string) => {
      return await musicService.getPlaylistTracks(playlistId);
    },
    [musicService.getPlaylistTracks],
  );

  // Search for tracks
  const searchTracks = useCallback(
    async (query: string) => {
      return await musicService.searchTracks(query);
    },
    [musicService.searchTracks],
  );

  return {
    ...state,
    // Music service state
    provider: musicService.provider,
    spotify: musicService.spotify,
    appleMusic: musicService.appleMusic,
    // Methods
    refreshData,
    getPlaylists,
    getPlaylistTracks,
    searchTracks,
    connectProvider: musicService.connectProvider,
    disconnectProvider: musicService.disconnectProvider,
    clearError: musicService.clearError,
  };
}
